import { Request, Response } from 'express';
import { salaryService } from './salary.service';
import { createSalaryRecordSchema, getSalaryRecordsQuerySchema, breakdownItemSchema } from './salary.schema';

export class SalaryController {
    async create(req: any, res: Response) {
        try {
            // breakdown comes as a JSON string in multipart form-data
            let breakdown = [];
            if (req.body.breakdown) {
                try {
                    breakdown = JSON.parse(req.body.breakdown);
                } catch (e) {
                    return res.status(400).json({ error: 'Invalid breakdown format' });
                }
            }

            const body = {
                ...req.body,
                // Convert string numbers to actual numbers
                grossSalary: req.body.grossSalary ? parseFloat(req.body.grossSalary) : undefined,
                netSalary: req.body.netSalary ? parseFloat(req.body.netSalary) : undefined,
                breakdown,
            };

            const parseResult = createSalaryRecordSchema.safeParse(body);
            if (!parseResult.success) {
                return res.status(400).json({ error: parseResult.error });
            }

            const userId = req.user!.id;
            const result = await salaryService.create(userId, parseResult.data, req.file);
            res.status(201).json(result);
        } catch (error) {
            console.error(error);
            res.status(500).json({ error: 'Internal Server Error' });
        }
    }

    async findAll(req: any, res: Response) {
        try {
            const parseResult = getSalaryRecordsQuerySchema.safeParse(req.query);
            if (!parseResult.success) {
                return res.status(400).json({ error: parseResult.error });
            }
            const userId = req.user!.id;
            const result = await salaryService.findAll(userId, parseResult.data);
            res.json(result);
        } catch (error) {
            console.error(error);
            res.status(500).json({ error: 'Internal Server Error' });
        }
    }

    async findById(req: any, res: Response) {
        try {
            const userId = req.user!.id;
            const result = await salaryService.findById(userId, req.params.id);
            if (!result) {
                return res.status(404).json({ error: 'Salary record not found' });
            }
            res.json(result);
        } catch (error) {
            console.error(error);
            res.status(500).json({ error: 'Internal Server Error' });
        }
    }

    async delete(req: any, res: Response) {
        try {
            const userId = req.user!.id;
            await salaryService.delete(userId, req.params.id);
            res.status(204).send();
        } catch (error) {
            console.error(error);
            res.status(500).json({ error: 'Internal Server Error' });
        }
    }
}

export const salaryController = new SalaryController();
