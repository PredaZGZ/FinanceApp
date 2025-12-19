import { z } from 'zod';

export const getTransactionsSchema = z.object({
    query: z.object({
        page: z.string().optional().transform((val) => (val ? parseInt(val, 10) : 1)),
        limit: z.string().optional().transform((val) => (val ? parseInt(val, 10) : 50)),
        from: z.string().optional(),
        to: z.string().optional(),
        currency: z.enum(['EUR', 'USD']).optional(),
        symbol: z.string().optional(),
        type: z.string().optional(),
    }),
});

export type GetTransactionsQuery = z.infer<typeof getTransactionsSchema>['query'];
