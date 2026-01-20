import pool from '../../common/db/client';

interface Order {
    date: Date;
    isin: string;
    estimatedAmount: number;
    quantity: number;
    status: string;
    used: boolean;
}

interface Movement {
    dateOp: Date;
    dateVal: Date;
    concepto: string;
    amount: number;
    currency: string;
}

export class MyInvestorService {
    async processFiles(userId: string, movementsBuffer: Buffer, ordersBuffer?: Buffer): Promise<{ tradesCount: number, transfersCount: number }> {
        const client = await pool.connect();
        try {
            await client.query('BEGIN');

            // 1. Load Orders
            let orders: Order[] = [];
            if (ordersBuffer) {
                const ordersRaw = ordersBuffer.toString('utf-8');
                const orderLines = ordersRaw.split('\n').filter(l => l.trim() !== '').slice(1);
                orders = orderLines.map(line => {
                    const parts = line.split(';');
                    if (parts.length < 5) return null;
                    return {
                        date: this.parseDate(parts[0]),
                        isin: parts[1],
                        estimatedAmount: this.parseEuroNumber(parts[2]),
                        quantity: this.parseEuroNumber(parts[3]),
                        status: parts[4].trim(),
                        used: false
                    };
                }).filter((o): o is Order => o !== null && o.status === 'Finalizada');
            }

            // 2. Load Movements
            const movesRaw = movementsBuffer.toString('utf-8');
            const moveLines = movesRaw.split('\n').filter(l => l.trim() !== '').slice(1);

            let tradesCount = 0;
            let transfersCount = 0;

            for (const line of moveLines) {
                const parts = line.split(';');
                if (parts.length < 5) continue;

                const movement: Movement = {
                    dateOp: this.parseDate(parts[0]),
                    dateVal: this.parseDate(parts[1]),
                    concepto: parts[2],
                    amount: this.parseEuroNumber(parts[3]),
                    currency: parts[4].trim()
                };

                const fundKeywords = ['MSCI', 'EMERGING', 'INDEX', 'FONDO', 'VANGUARD', 'FIDELITY', 'ISHARES', 'AMUNDI'];
                const isFundKeyword = fundKeywords.some(k => movement.concepto.toUpperCase().includes(k));
                const hasAtSymbol = movement.concepto.includes('@');

                let isTrade = false;
                let tradeSide = '';

                if (movement.amount < 0 && (isFundKeyword || hasAtSymbol)) {
                    isTrade = true;
                    tradeSide = 'Buy';
                } else if (movement.amount > 0 && isFundKeyword) {
                    isTrade = true;
                    tradeSide = 'Sell';
                }

                if (isTrade) {
                    let bestMatch: Order | null = null;
                    let minScore = Infinity;

                    for (const order of orders) {
                        if (order.used) continue;
                        const dDiff = this.daysDiff(movement.dateOp, order.date);
                        if (dDiff > 7) continue;

                        const moveAbs = Math.abs(movement.amount);
                        const amtDiffRatio = Math.abs(moveAbs - order.estimatedAmount) / moveAbs;
                        const score = dDiff + (amtDiffRatio * 100);

                        if (score < minScore && amtDiffRatio < 0.2) {
                            minScore = score;
                            bestMatch = order;
                        }
                    }

                    let symbol = this.cleanSymbol(movement.concepto);
                    let quantity = 1;

                    if (bestMatch) {
                        quantity = bestMatch.quantity;
                        bestMatch.used = true;
                    } else {
                        if (hasAtSymbol) {
                            const split = movement.concepto.split('@');
                            symbol = split[0].trim();
                            const qtyStr = split[1].trim();
                            const parsedQty = this.parseEuroNumber(qtyStr);
                            if (!isNaN(parsedQty) && parsedQty !== 0) quantity = parsedQty;
                        }
                    }

                    const price = Math.abs(movement.amount) / quantity;

                    await client.query(
                        `INSERT INTO stock_trades (id, date, currency, symbol, type, quantity, price, side, value, fees, commission, source, "updatedAt", "userId")
                         VALUES (gen_random_uuid(), $1, $2, $3, $4, $5, $6, $7, $8, $9, $10, 'myinvestor_movements', NOW(), $11)
                         ON CONFLICT (date, currency, symbol, side, quantity, price) DO NOTHING`,
                        [
                            movement.dateOp,
                            movement.currency,
                            symbol,
                            'Fund',
                            quantity,
                            price,
                            tradeSide,
                            Math.abs(movement.amount),
                            0, 0,
                            userId
                        ]
                    );
                    tradesCount++;

                } else {
                    // Cash Transfer
                    const type = this.classifyTransferType(movement.concepto, movement.amount);

                    await client.query(
                        `INSERT INTO cash_transfers (id, date, currency, type, value, fees, commission, "eurCost", "conversionRate", "skippedConversion", source, "updatedAt", "userId")
                         VALUES (gen_random_uuid(), $1, $2, $3, $4, $5, $6, $7, $8, $9, 'myinvestor_movements', NOW(), $10)
                         ON CONFLICT (date, currency, type, value) DO NOTHING`,
                        [
                            movement.dateOp,
                            movement.currency,
                            type,
                            Math.abs(movement.amount),
                            0, 0, null, null, false,
                            userId
                        ]
                    );
                    transfersCount++;
                }
            }

            await client.query('COMMIT');
            return { tradesCount, transfersCount };

        } catch (error) {
            await client.query('ROLLBACK');
            throw error;
        } finally {
            client.release();
        }
    }

    private parseEuroNumber(str: string): number {
        if (!str) return 0;
        const cleanStr = str.replace(' EUR', '').replace(/\./g, '').replace(',', '.');
        return parseFloat(cleanStr);
    }

    private parseDate(str: string): Date {
        const [day, month, year] = str.split('/').map(Number);
        return new Date(year, month - 1, day);
    }

    private daysDiff(d1: Date, d2: Date): number {
        const diffTime = Math.abs(d2.getTime() - d1.getTime());
        return Math.ceil(diffTime / (1000 * 60 * 60 * 24));
    }

    private classifyTransferType(concepto: string, amount: number): string {
        const c = concepto.toUpperCase();
        if (c.includes('PROMOCION AMIGO')) {
            return amount > 0 ? 'Friend Referral' : 'Referral Commission';
        }
        if (c.includes('PERIODO') && Math.abs(amount) < 1) return 'Interest';
        if (c.includes('DIVIDENDO')) return 'Dividend';
        if (c.includes('RETENCION')) return 'Tax';
        if (c.includes('COMISION')) return 'Fee';

        return amount > 0 ? 'Deposit' : 'Withdrawal';
    }

    private cleanSymbol(concepto: string): string {
        return concepto.split('@')[0].trim();
    }
}

export const myInvestorService = new MyInvestorService();
