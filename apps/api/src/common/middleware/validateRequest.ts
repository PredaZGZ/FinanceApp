import { Request, Response, NextFunction } from 'express';
import { ZodSchema, ZodError } from 'zod';

export const validateRequest = (schema: ZodSchema) => {
    return async (req: Request, res: Response, next: NextFunction) => {
        try {
            await schema.parseAsync({
                body: req.body,
                query: req.query,
                params: req.params,
            });
            return next();
        } catch (error) {
            if (error instanceof ZodError) {
                return res.status(400).json({
                    error: 'Validation failed',
                    details: (error as any).errors.map((e: any) => ({
                        path: e.path.join('.'),
                        message: e.message,
                    })),
                });
            }
            return res.status(400).json({ error: 'Invalid request' });
        }
    };
};
