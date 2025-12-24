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

    async getPendingConversions(req: Request, res: Response) {
        try {
            const data = await transactionsService.findPendingConversions();
            res.json({ data });
        } catch (error) {
            console.error('Error fetching pending conversions:', error);
            res.status(500).json({ error: 'Internal server error' });
        }
    }

    async updateConversion(req: Request, res: Response) {
        try {
            // We can validate body here or use middleware/zod
            const { eurCost } = req.body;
            const { id } = req.params;

            if (!eurCost || typeof eurCost !== 'number') {
                res.status(400).json({ error: 'Invalid eurCost' });
                return;
            }

            const result = await transactionsService.updateTransactionConversion(id, eurCost);
            res.json({ data: result });
        } catch (error: any) {
            console.error('Error updating conversion:', error);
            res.status(500).json({ error: error.message || 'Internal server error' });
        }
    }
}

export const transactionsController = new TransactionsController();
