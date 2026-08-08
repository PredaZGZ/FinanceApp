import { z } from 'zod';

export const getTransactionsSchema = z.object({
    query: z.object({
        page: z.coerce.number().int().min(1).default(1),
        limit: z.coerce.number().int().min(1).max(100).default(50),
        from: z.string().refine(value => !Number.isNaN(Date.parse(value)), 'Invalid date').optional(),
        to: z.string().refine(value => !Number.isNaN(Date.parse(value)), 'Invalid date').optional(),
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
