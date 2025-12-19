import type { Request, Response } from 'express';
import { transactionsService } from './transactions.service';
import { getTransactionsSchema } from './transactions.schema';

export class TransactionsController {
    async getTransactions(req: Request, res: Response) {
        try {
            // Validate query params
            const result = getTransactionsSchema.safeParse({ query: req.query });

            if (!result.success) {
                res.status(400).json({ error: 'Invalid query parameters', details: result.error.format() });
                return;
            }

            const data = await transactionsService.getTransactions(result.data.query);
            res.json(data);
        } catch (error) {
            console.error('Error fetching transactions:', error);
            res.status(500).json({ error: 'Internal server error' });
        }
    }
}

export const transactionsController = new TransactionsController();
