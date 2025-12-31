import { z } from 'zod';

export const createAssetSchema = z.object({
    body: z.object({
        name: z.string().min(1),
        description: z.string().optional(),
        category: z.string().optional(),
        originalCost: z.number(),
        originalCurrency: z.string().default('EUR'),
        notes: z.string().optional(),
        initialValuationValue: z.number().optional(),
        initialValuationDate: z.string().datetime().optional(), // Expects ISO string
    }),
});

export const updateAssetSchema = z.object({
    params: z.object({
        id: z.string().uuid(),
    }),
    body: z.object({
        name: z.string().min(1),
        description: z.string().optional(),
        category: z.string().optional(),
        originalCost: z.number(),
        originalCurrency: z.string().optional(),
        notes: z.string().optional(),
        isSold: z.boolean().optional(),
        soldAt: z.string().datetime().nullable().optional(),
    }),
});

export const patchAssetSchema = z.object({
    params: z.object({
        id: z.string().uuid(),
    }),
    body: z.object({
        name: z.string().min(1).optional(),
        description: z.string().optional(),
        category: z.string().optional(),
        originalCost: z.number().optional(),
        originalCurrency: z.string().optional(),
        notes: z.string().optional(),
        isSold: z.boolean().optional(),
        soldAt: z.string().datetime().nullable().optional(),
    }),
});

export const createValuationSchema = z.object({
    params: z.object({
        id: z.string().uuid(),
    }),
    body: z.object({
        value: z.number(),
        valuedAt: z.string().datetime().optional(),
        currency: z.string().default('EUR'),
        source: z.string().optional(),
    }),
});

export const getAssetsSchema = z.object({
    query: z.object({
        page: z.string().optional().transform((val) => (val ? parseInt(val, 10) : 1)),
        limit: z.string().optional().transform((val) => (val ? parseInt(val, 10) : 50)),
        sortBy: z.enum(['name', 'originalCost', 'currentValue', 'createdAt', 'updatedAt']).optional().default('createdAt'),
        sortOrder: z.enum(['asc', 'desc']).optional().default('desc'),
        q: z.string().optional(),
        category: z.string().optional(),
        isSold: z.string().optional().transform((val) => {
            if (val === 'true') return true;
            if (val === 'false') return false;
            return undefined;
        }),
        minValue: z.string().optional().transform((val) => (val ? parseFloat(val) : undefined)),
        maxValue: z.string().optional().transform((val) => (val ? parseFloat(val) : undefined)),
    }),
});

export const getValuationsSchema = z.object({
    params: z.object({
        id: z.string().uuid(),
    }),
    query: z.object({
        page: z.string().optional().transform((val) => (val ? parseInt(val, 10) : 1)),
        limit: z.string().optional().transform((val) => (val ? parseInt(val, 10) : 50)),
        from: z.string().optional(),
        to: z.string().optional(),
    }),
});

export type CreateAssetBody = z.infer<typeof createAssetSchema>['body'];
export type UpdateAssetBody = z.infer<typeof updateAssetSchema>['body'];
export type PatchAssetBody = z.infer<typeof patchAssetSchema>['body'];
export type CreateValuationBody = z.infer<typeof createValuationSchema>['body'];
export type GetAssetsQuery = z.infer<typeof getAssetsSchema>['query'];
export type GetValuationsQuery = z.infer<typeof getValuationsSchema>['query'];
