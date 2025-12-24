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

export const updateConversionSchema = z.object({
    body: z.object({
        eurCost: z.number().positive(),
    }),
    params: z.object({
        id: z.string().uuid(),
    }),
});

export type UpdateConversionBody = z.infer<typeof updateConversionSchema>['body'];
export type UpdateConversionParams = z.infer<typeof updateConversionSchema>['params'];
