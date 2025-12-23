import pool from '../common/db/client';

async function main() {
    const client = await pool.connect();
    try {
        console.log('--- Verification Results ---');

        // Check Stock Trades
        const tradesRes = await client.query(`
            SELECT date, symbol, type, quantity, price, value 
            FROM stock_trades 
            WHERE symbol LIKE 'IE%' OR symbol LIKE 'MSCI%' 
            ORDER BY date DESC 
            LIMIT 5
        `);
        console.log(`\nRecent Stock Trades (${tradesRes.rows.length} found):`);
        console.table(tradesRes.rows);

        // Check Cash Transfers
        const transfersRes = await client.query(`
            SELECT date, type, value, currency 
            FROM cash_transfers 
            WHERE currency = 'EUR' 
            ORDER BY date DESC 
            LIMIT 5
        `);
        console.log(`\nRecent Cash Transfers (${transfersRes.rows.length} found):`);
        console.table(transfersRes.rows);

        // Check Counts
        const countTrades = await client.query('SELECT count(*) FROM stock_trades');
        const countTransfers = await client.query('SELECT count(*) FROM cash_transfers');
        console.log(`\nTotal Stock Trades: ${countTrades.rows[0].count}`);
        console.log(`Total Cash Transfers: ${countTransfers.rows[0].count}`);

    } catch (error) {
        console.error('Verification failed:', error);
    } finally {
        client.release();
        await pool.end();
    }
}

main();
