import pool from '../db/client';
import fs from 'fs';
import path from 'path';

const DATA_PATH = path.resolve(__dirname, '../../tmp/revolut_data.json');

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

        await client.query('BEGIN');

        for (const currencyData of data.currencies) {
            const currency = currencyData.currency;
            console.log(`Processing ${currency} data...`);

            // Stock Trades
            if (currencyData.stockTrades) {
                for (const trade of currencyData.stockTrades) {
                    await client.query(
                        `INSERT INTO stock_trades (id, date, currency, symbol, type, quantity, price, side, value, fees, commission, "updatedAt")
                 VALUES (gen_random_uuid(), $1, $2, $3, $4, $5, $6, $7, $8, $9, $10, NOW())`,
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
                 VALUES (gen_random_uuid(), $1, $2, $3, $4, $5, $6, $7, $8, $9, NOW())`,
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

            // Portfolio Items
            if (currencyData.portfolio) {
                for (const item of currencyData.portfolio) {
                    await client.query(
                        `INSERT INTO portfolio_items (id, currency, symbol, "companyName", quantity, value, "updatedAt")
             VALUES (gen_random_uuid(), $1, $2, $3, $4, $5, NOW())`,
                        [
                            currency,
                            item.symbol,
                            item.name,
                            item.quantity,
                            item.value
                        ]
                    );
                }
                console.log(`- Inserted ${currencyData.portfolio.length} portfolio items`);
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
