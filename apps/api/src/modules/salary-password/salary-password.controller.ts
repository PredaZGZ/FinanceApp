import { Request, Response } from 'express';
import { salaryPasswordService } from './salary-password.service';
import { createSalaryPasswordSchema } from './salary-password.schema';

export class SalaryPasswordController {
    async create(req: any, res: Response) {
        try {
            const parseResult = createSalaryPasswordSchema.safeParse(req.body);
            if (!parseResult.success) {
                return res.status(400).json({ error: parseResult.error });
            }

            const userId = req.user!.id;
            const result = await salaryPasswordService.create(userId, parseResult.data);
            res.status(201).json(result);
        } catch (error) {
            console.error(error);
            res.status(500).json({ error: 'Internal Server Error' });
        }
    }

    async findAll(req: any, res: Response) {
        try {
            const userId = req.user!.id;
            const result = await salaryPasswordService.findAll(userId);
            res.json(result);
        } catch (error) {
            console.error(error);
            res.status(500).json({ error: 'Internal Server Error' });
        }
    }

    async delete(req: any, res: Response) {
        try {
            const userId = req.user!.id;
            await salaryPasswordService.delete(userId, req.params.id);
            res.status(204).send();
        } catch (error) {
            console.error(error);
            res.status(500).json({ error: 'Internal Server Error' });
        }
    }
}

export const salaryPasswordController = new SalaryPasswordController();
