import pool from '../common/db/client';
import fs from 'fs';
import path from 'path';

const MOVEMENTS_PATH = path.resolve(process.cwd(), './tmp/Movimientos Mi Cuenta MyInvestor.csv');
const ORDERS_PATH = path.resolve(process.cwd(), './tmp/Órdenes 1084569.csv');

// --- Types ---
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

// --- Helpers ---
function parseEuroNumber(str: string): number {
    if (!str) return 0;
    const cleanStr = str.replace(' EUR', '').replace(/\./g, '').replace(',', '.');
    return parseFloat(cleanStr);
}

function parseDate(str: string): Date {
    const [day, month, year] = str.split('/').map(Number);
    return new Date(year, month - 1, day);
}

function daysDiff(d1: Date, d2: Date): number {
    const diffTime = Math.abs(d2.getTime() - d1.getTime());
    return Math.ceil(diffTime / (1000 * 60 * 60 * 24));
}

function classifyTransferType(concepto: string, amount: number): string {
    const c = concepto.toUpperCase();
    if (c.includes('PROMOCION AMIGO')) {
        return amount > 0 ? 'Friend Referral' : 'Referral Commission';
    }
    if (c.includes('PERIODO') && Math.abs(amount) < 1) return 'Interest'; // Assuming small periodic payments are interest
    if (c.includes('DIVIDENDO')) return 'Dividend';
    if (c.includes('RETENCION')) return 'Tax';
    if (c.includes('COMISION')) return 'Fee';

    return amount > 0 ? 'Deposit' : 'Withdrawal';
}

function cleanSymbol(concepto: string): string {
    // Remove " @ 123" quantity part if present
    return concepto.split('@')[0].trim();
}

async function main() {
    const client = await pool.connect();
    try {
        // 1. Load Orders
        let orders: Order[] = [];
        if (fs.existsSync(ORDERS_PATH)) {
            const ordersRaw = fs.readFileSync(ORDERS_PATH, 'utf-8');
            const orderLines = ordersRaw.split('\n').filter(l => l.trim() !== '').slice(1);
            orders = orderLines.map(line => {
                const parts = line.split(';');
                if (parts.length < 5) return null;
                return {
                    date: parseDate(parts[0]),
                    isin: parts[1],
                    estimatedAmount: parseEuroNumber(parts[2]),
                    quantity: parseEuroNumber(parts[3]),
                    status: parts[4].trim(),
                    used: false
                };
            }).filter((o): o is Order => o !== null && o.status === 'Finalizada');
            console.log(`Loaded ${orders.length} finalized orders.`);
        }

        // 2. Load Movements
        if (!fs.existsSync(MOVEMENTS_PATH)) {
            console.error(`Movements file not found at: ${MOVEMENTS_PATH}`);
            process.exit(1);
        }
        const movesRaw = fs.readFileSync(MOVEMENTS_PATH, 'utf-8');
        const moveLines = movesRaw.split('\n').filter(l => l.trim() !== '').slice(1);

        console.log(`Found ${moveLines.length} movements. Starting import...`);
        await client.query('BEGIN');

        let tradesCount = 0;
        let transfersCount = 0;

        for (const line of moveLines) {
            const parts = line.split(';');
            if (parts.length < 5) continue;

            const movement: Movement = {
                dateOp: parseDate(parts[0]),
                dateVal: parseDate(parts[1]),
                concepto: parts[2],
                amount: parseEuroNumber(parts[3]),
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
                    const dDiff = daysDiff(movement.dateOp, order.date);
                    if (dDiff > 7) continue;

                    const moveAbs = Math.abs(movement.amount);
                    const amtDiffRatio = Math.abs(moveAbs - order.estimatedAmount) / moveAbs;
                    const score = dDiff + (amtDiffRatio * 100);

                    if (score < minScore && amtDiffRatio < 0.2) {
                        minScore = score;
                        bestMatch = order;
                    }
                }

                let symbol = cleanSymbol(movement.concepto);
                let quantity = 1;

                if (bestMatch) {
                    // User requested Symbol to NOT be ISIN. So we keep the Concepto (Name) as Symbol.
                    // We use the Order mainly for Quantity.
                    console.log(`Matched: ${movement.concepto} -> Qty: ${bestMatch.quantity}`);
                    quantity = bestMatch.quantity;
                    bestMatch.used = true;
                } else {
                    if (hasAtSymbol) {
                        const split = movement.concepto.split('@');
                        symbol = split[0].trim();
                        const qtyStr = split[1].trim();
                        const parsedQty = parseEuroNumber(qtyStr);
                        if (!isNaN(parsedQty) && parsedQty !== 0) quantity = parsedQty;
                    }
                }

                const price = Math.abs(movement.amount) / quantity;

                await client.query(
                    `INSERT INTO stock_trades (id, date, currency, symbol, type, quantity, price, side, value, fees, commission, "updatedAt")
                     VALUES (gen_random_uuid(), $1, $2, $3, $4, $5, $6, $7, $8, $9, $10, NOW())
                     ON CONFLICT (date, currency, symbol, side, quantity, price) DO NOTHING`,
                    [
                        movement.dateOp,
                        movement.currency,
                        symbol,
                        'Fund', // User requested 'Fund' type
                        quantity,
                        price,
                        tradeSide,
                        Math.abs(movement.amount),
                        0, 0
                    ]
                );
                tradesCount++;

            } else {
                // Cash Transfer
                const type = classifyTransferType(movement.concepto, movement.amount);
                console.log(`Transfer: ${movement.concepto} (${movement.amount}) -> ${type}`);

                await client.query(
                    `INSERT INTO cash_transfers (id, date, currency, type, value, fees, commission, "eurCost", "conversionRate", "skippedConversion", "updatedAt")
                     VALUES (gen_random_uuid(), $1, $2, $3, $4, $5, $6, $7, $8, $9, NOW())
                     ON CONFLICT (date, currency, type, value) DO NOTHING`,
                    [
                        movement.dateOp,
                        movement.currency,
                        type,
                        Math.abs(movement.amount),
                        0, 0, null, null, false
                    ]
                );
                transfersCount++;
            }
        }

        await client.query('COMMIT');
        console.log(`Import completed!`);
        console.log(`- Stock Trades: ${tradesCount}`);
        console.log(`- Cash Transfers: ${transfersCount}`);

    } catch (error) {
        await client.query('ROLLBACK');
        console.error('Error importing MyInvestor CSV:', error);
        process.exit(1);
    } finally {
        client.release();
        await pool.end();
    }
}

main();
