import pool from '../../common/db/client';
import type { GetTransactionsQuery } from './transactions.schema';

export class TransactionsService {
    async getTransactions(filters: GetTransactionsQuery) {
        const { page, limit, from, to, currency, symbol, type } = filters;
        const offset = (page - 1) * limit;

        const queryParams: any[] = [];
        let paramIndex = 1;

        let query = `
      SELECT
        id,
        date,
        currency,
        symbol,
        type,
        quantity,
        price,
        side,
        value,
        fees,
        commission,
        count(*) OVER() as full_count
      FROM stock_trades
      WHERE 1=1
    `;
        // Where 1=1 to make the query dynamic for each filter, use AND always with no error
        if (from) {
            query += ` AND date >= $${paramIndex++}`;
            queryParams.push(from);
        }

        if (to) {
            query += ` AND date <= $${paramIndex++}`;
            queryParams.push(to);
        }

        if (currency) {
            query += ` AND currency = $${paramIndex++}`;
            queryParams.push(currency);
        }

        if (symbol) {
            query += ` AND symbol = $${paramIndex++}`;
            queryParams.push(symbol);
        }

        if (type) {
            query += ` AND type = $${paramIndex++}`;
            queryParams.push(type);
        }

        query += ` ORDER BY date DESC LIMIT $${paramIndex++} OFFSET $${paramIndex++}`;
        queryParams.push(limit, offset);

        const result = await pool.query(query, queryParams);
        const rows = result.rows;
        const totalCount = rows.length > 0 ? parseInt(rows[0].full_count, 10) : 0;

        // Remove full_count from individual rows to keep response clean
        const transactions = rows.map(({ full_count, ...rest }) => rest);

        return {
            data: transactions,
            meta: {
                total: totalCount,
                page,
                limit,
                totalPages: Math.ceil(totalCount / limit),
            },
        };
    }

    async getExchangeRates() {
        const query = `
            SELECT date, "conversionRate", currency
            FROM cash_transfers
            WHERE "conversionRate" IS NOT NULL
            ORDER BY date ASC
        `;
        const result = await pool.query(query);
        return result.rows.map(row => ({
            date: new Date(row.date),
            rate: parseFloat(row.conversionRate),
            currency: row.currency // This is usually the source currency (e.g. USD topup converted from EUR)
        }));
    }

    async findPendingConversions() {
        const query = `
            SELECT id, date, currency, type, value
            FROM cash_transfers
            WHERE type IN ('Cash top-up', 'Deposit')
              AND currency != 'EUR'
              AND "conversionRate" IS NULL
              AND ("skippedConversion" IS NULL OR "skippedConversion" = false)
            ORDER BY date DESC
        `;
        const result = await pool.query(query);
        return result.rows;
    }

    async updateTransactionConversion(id: string, eurCost: number) {
        const client = await pool.connect();
        try {
            await client.query('BEGIN');

            // Get transaction to calculate rate
            const txRes = await client.query('SELECT value, currency FROM cash_transfers WHERE id = $1', [id]);
            if (txRes.rows.length === 0) {
                throw new Error('Transaction not found');
            }
            const tx = txRes.rows[0];

            // Calculate rate: EUR / USD (e.g. 100 EUR / 110 USD = 0.909)
            // Storing rate as EUR per 1 unit of foreign currency
            const rate = eurCost / Math.abs(tx.value);

            await client.query(`
                UPDATE cash_transfers
                SET "eurCost" = $1, "conversionRate" = $2, "updatedAt" = NOW()
                WHERE id = $3
            `, [eurCost, rate, id]);

            await client.query('COMMIT');
            return { id, eurCost, conversionRate: rate };
        } catch (error) {
            await client.query('ROLLBACK');
            throw error;
        } finally {
            client.release();
        }
    }
}

export const transactionsService = new TransactionsService();
