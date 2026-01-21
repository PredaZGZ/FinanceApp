import { z } from 'zod';

export const createSalaryPasswordSchema = z.object({
    passphrase: z.string().min(1, "Password cannot be empty"),
    label: z.string().optional(),
});

export type CreateSalaryPasswordInput = z.infer<typeof createSalaryPasswordSchema>;
