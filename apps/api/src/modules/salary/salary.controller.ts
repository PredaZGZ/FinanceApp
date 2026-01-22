import { Request, Response } from 'express';
import { salaryService } from './salary.service';
import { createSalaryRecordSchema, getSalaryRecordsQuerySchema, breakdownItemSchema } from './salary.schema';
import fs from 'fs';
import { salaryPasswordService } from '../salary-password/salary-password.service';
import { encrypt, decrypt } from '../../common/utils/encryption';
import { standardFontDataUrl } from '../../common/utils/pdf';
import * as pdfjsLib from 'pdfjs-dist/legacy/build/pdf.mjs';

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

    async update(req: any, res: Response) {
        try {
            // breakdown comes as a JSON string in multipart
            let breakdown = [];
            if (req.body.breakdown) {
                try {
                    breakdown = typeof req.body.breakdown === 'string' ? JSON.parse(req.body.breakdown) : req.body.breakdown;
                } catch (e) {
                    return res.status(400).json({ error: 'Invalid breakdown format' });
                }
            }

            const body = {
                ...req.body,
                // Convert string numbers to actual numbers if present
                grossSalary: req.body.grossSalary ? parseFloat(req.body.grossSalary) : undefined,
                netSalary: req.body.netSalary ? parseFloat(req.body.netSalary) : undefined,
                breakdown,
            };

            const parseResult = createSalaryRecordSchema.safeParse(body);
            if (!parseResult.success) {
                return res.status(400).json({ error: parseResult.error });
            }

            const userId = req.user!.id;
            const result = await salaryService.update(userId, req.params.id, parseResult.data, req.file);

            if (!result) {
                return res.status(404).json({ error: "Record not found" });
            }

            res.json(result);
        } catch (error) {
            console.error(error);
            res.status(500).json({ error: 'Internal Server Error' });
        }
    }

    async validateFile(req: any, res: Response) {
        let filePath = req.file?.path;
        console.log(`DEBUG: validateFile called for ${req.file?.originalname}`);
        try {
            if (!req.file) return res.status(400).json({ error: "No file provided" });

            // Images usually don't have pdf-like encryption
            const isPdf = req.file.mimetype.toLowerCase().includes('pdf') || req.file.originalname.toLowerCase().endsWith('.pdf');
            if (!isPdf) {
                console.log('DEBUG: Not a PDF, returning not locked');
                return res.json({ isLocked: false });
            }

            const buffer = fs.readFileSync(filePath);

            // 1. Try opening without password
            try {
                // Suppress standard font warning if possible, but logging is fine
                const loadingTask = pdfjsLib.getDocument({
                    data: new Uint8Array(buffer),
                    standardFontDataUrl,
                });
                await loadingTask.promise;
                console.log('DEBUG: Opened without password');
                return res.json({ isLocked: false });
            } catch (e: any) {
                if (e.name !== 'PasswordException') {
                    // unexpected error, but likely just encrypted
                    console.log(`DEBUG: Error opening without password (not PasswordException): ${e.name}`);
                }
            }

            // 2. Try saved passwords
            const userId = req.user!.id;
            console.log(`DEBUG: User ID for password lookup: ${userId}`);
            const savedPasswords = await salaryPasswordService.findAllWithSecrets(userId);
            console.log(`DEBUG: Found ${savedPasswords.length} saved passwords for user`);

            for (const sp of savedPasswords) {
                try {
                    const plain = decrypt(sp.encryptedPassword, sp.iv);
                    // console.log(`DEBUG: Trying saved password: ${plain}`); // careful logging real passwords

                    const loadingTask = pdfjsLib.getDocument({
                        data: new Uint8Array(buffer),
                        password: plain,
                        standardFontDataUrl,
                    });
                    await loadingTask.promise;

                    console.log('DEBUG: Unlocked with saved password');
                    return res.json({ isLocked: false, password: plain });
                } catch (e) {
                    // Wrong password
                }
            }

            // 3. Exhausted options, it is locked
            console.log('DEBUG: Exhausted all passwords, returning locked');
            return res.json({ isLocked: true });

        } catch (error) {
            console.error(error);
            res.status(500).json({ error: 'Internal Server Error' });
        } finally {
            // Always cleanup the temp file
            if (filePath && fs.existsSync(filePath)) {
                try { fs.unlinkSync(filePath); } catch { }
            }
        }
    }
}

export const salaryController = new SalaryController();
