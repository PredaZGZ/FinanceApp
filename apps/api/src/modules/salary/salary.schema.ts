import { z } from 'zod';

export const breakdownItemSchema = z.object({
    concept: z.string(),
    amount: z.number(),
    type: z.enum(['payment', 'deduction']),
});

export const createSalaryRecordSchema = z.object({
    date: z.string().datetime(), // ISO string from frontend
    grossSalary: z.number().optional(),
    netSalary: z.number().optional(),
    company: z.string().optional(),
    notes: z.string().optional(),
    breakdown: z.array(breakdownItemSchema).optional(),
});

export type CreateSalaryRecordInput = z.infer<typeof createSalaryRecordSchema>;
export type BreakdownItemInput = z.infer<typeof breakdownItemSchema>;

export const getSalaryRecordsQuerySchema = z.object({
    page: z.coerce.number().min(1).default(1),
    limit: z.coerce.number().min(1).max(100).default(20),
    company: z.string().optional(),
    from: z.string().optional(),
    to: z.string().optional(),
});

export type GetSalaryRecordsQuery = z.infer<typeof getSalaryRecordsQuerySchema>;
