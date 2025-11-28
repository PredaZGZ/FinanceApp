import pool from '../db/client';
import fs from 'fs';
import path from 'path';

const DATA_PATH = path.resolve(process.cwd(), './tmp/revolut_data.json');

async function main() {
    const client = await pool.connect();
    try {
        if (!fs.existsSync(DATA_PATH)) {
            console.error(`Data file not found at: ${DATA_PATH}`);
            process.exit(1);
        }

        const rawData = fs.readFileSync(DATA_PATH, 'utf-8');
        const data = JSON.parse(rawData);

        console.log('Seeding database...');
        console.log('(Skipping duplicates automatically)');
        console.log('');

        await client.query('BEGIN');



        for (const currencyData of data.currencies) {
            const currency = currencyData.currency;
            console.log(`Processing ${currency} data...`);

            // Stock Trades
            if (currencyData.stockTrades) {
                for (const trade of currencyData.stockTrades) {
                    await client.query(
                        `INSERT INTO stock_trades (id, date, currency, symbol, type, quantity, price, side, value, fees, commission, "updatedAt")
                 VALUES (gen_random_uuid(), $1, $2, $3, $4, $5, $6, $7, $8, $9, $10, NOW())
                 ON CONFLICT (date, currency, symbol, side, quantity, price) DO NOTHING`,
                        [
                            new Date(trade.date),
                            trade.currency,
                            trade.symbol,
                            trade.type,
                            trade.quantity,
                            trade.price,
                            trade.side,
                            trade.value,
                            trade.fees,
                            trade.commission
                        ]
                    );
                }
                console.log(`- Inserted ${currencyData.stockTrades.length} stock trades`);
            }

            // Cash Transfers
            if (currencyData.cashTransfers) {
                for (const transfer of currencyData.cashTransfers) {
                    await client.query(
                        `INSERT INTO cash_transfers (id, date, currency, type, value, fees, commission, "eurCost", "conversionRate", "skippedConversion", "updatedAt")
                 VALUES (gen_random_uuid(), $1, $2, $3, $4, $5, $6, $7, $8, $9, NOW())
                 ON CONFLICT (date, currency, type, value) DO NOTHING`,
                        [
                            new Date(transfer.date),
                            transfer.currency,
                            transfer.type,
                            transfer.value,
                            transfer.fees,
                            transfer.commission,
                            transfer.eurCost || null,
                            transfer.conversionRate || null,
                            transfer.skippedConversion || false
                        ]
                    );
                }
                console.log(`- Inserted ${currencyData.cashTransfers.length} cash transfers`);
            }
        }

        await client.query('COMMIT');
        console.log('Seeding completed!');
    } catch (error) {
        await client.query('ROLLBACK');
        console.error('Error seeding database:', error);
        process.exit(1);
    } finally {
        client.release();
        await pool.end();
    }
}

main();
