import { Currency, TradeSide } from '../../generated/prisma/enums';
import { prisma } from '../../common/db/prisma';
import { randomUUID } from 'node:crypto';

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
        return prisma.$transaction(async (tx) => {

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

                // Validation: Check for swapped files
                if (movement.currency === 'Finalizada' || movement.currency === 'Pendiente' || movement.currency === 'Anulada' || movement.currency === 'Rechazada') {
                    throw new Error('It looks like you uploaded the "Orders" file in the "Movements" field. Please check your file inputs.');
                }
                if (movement.currency.length > 3) {
                    throw new Error(`Invalid currency "${movement.currency}" detected in row. Please ensure you uploaded the correct "Movimientos" file.`);
                }

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

                    const result = await tx.stockTrade.createMany({
                        data: {
                            id: randomUUID(),
                            date: movement.dateOp,
                            currency: movement.currency as Currency,
                            symbol,
                            type: 'Fund',
                            quantity,
                            price,
                            side: tradeSide as TradeSide,
                            value: Math.abs(movement.amount),
                            eurCost: Math.abs(movement.amount),
                            eurValue: Math.abs(movement.amount),
                            conversionRate: 1,
                            fees: 0,
                            commission: 0,
                            source: 'myinvestor_movements',
                            userId,
                            updatedAt: new Date(),
                        },
                        skipDuplicates: true,
                    });
                    tradesCount += result.count;

                } else {
                    // Cash Transfer
                    const type = this.classifyTransferType(movement.concepto, movement.amount);

                    const result = await tx.cashTransfer.createMany({
                        data: {
                            id: randomUUID(),
                            date: movement.dateOp,
                            currency: movement.currency as Currency,
                            type,
                            value: Math.abs(movement.amount),
                            fees: 0,
                            commission: 0,
                            source: 'myinvestor_movements',
                            userId,
                            updatedAt: new Date(),
                        },
                        skipDuplicates: true,
                    });
                    transfersCount += result.count;
                }
            }

            return { tradesCount, transfersCount };
        });
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
