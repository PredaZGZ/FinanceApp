import pool from '../../common/db/client';
import type { CreateSalaryRecordInput, GetSalaryRecordsQuery } from './salary.schema';
import fs from 'fs';
import { util } from 'zod'; // Just to have util available? No, import standard util
import * as utilModule from 'util';
import { execFile } from 'child_process';
import { salaryPasswordService } from '../salary-password/salary-password.service';
import { decrypt } from '../../common/utils/encryption';

const execFilePromise = utilModule.promisify(execFile);

export class SalaryService {
    private async handleEncryptedFile(file: Express.Multer.File, password: string, userId: string) {
        console.log(`DEBUG: handleEncryptedFile called for ${file.originalname}, mime=${file.mimetype}`);
        console.log(`DEBUG: handleEncryptedFile userId=${userId}, password provided: ${!!password}`);

        const isPdf = file.mimetype.toLowerCase().includes('pdf') || file.originalname.toLowerCase().endsWith('.pdf');
        if (!isPdf) {
            console.log('DEBUG: Not a PDF, skipping decryption');
            return;
        }

        try {
            console.log('DEBUG: Attempting decryption with qpdf');
            const tempOut = file.path + '.decrypted.pdf';

            // qpdf --password=PASSWORD --decrypt input output
            // Using --replace-input might be easier but let's stick to explicit input/output for safety

            try {
                // Command: qpdf --password=PASS --decrypt input output
                await execFilePromise('qpdf', [`--password=${password}`, '--decrypt', file.path, tempOut]);
                console.log('DEBUG: qpdf decryption successful');

                // Replace original file
                try {
                    if (fs.existsSync(file.path)) fs.unlinkSync(file.path);
                } catch (e) { console.warn("Unlink error", e); }

                fs.renameSync(tempOut, file.path);
                console.log('DEBUG: Replaced original file with decrypted version');

                // Valid password, check if we need to save it
                // Save password if new
                const saved = await salaryPasswordService.findAllWithSecrets(userId);

                const exists = saved.some(s => {
                    try {
                        return decrypt(s.encryptedPassword, s.iv) === password;
                    } catch { return false; }
                });

                console.log(`DEBUG: Checking if password exists: ${exists}`);

                if (!exists) {
                    console.log('DEBUG: Saving new password');
                    const newPass = await salaryPasswordService.create(userId, {
                        passphrase: password,
                        label: file.originalname || 'Auto-saved'
                    });
                    console.log(`DEBUG: Password saved with ID: ${newPass.id}`);
                }

            } catch (err: any) {
                console.error('DEBUG: qpdf failed:', err.stderr || err.message);
                // If qpdf fails (wrong password), we just leave the file encrypted (locked)
                // Clean up temp output if it exists (unlikely on fail)
                if (fs.existsSync(tempOut)) fs.unlinkSync(tempOut);
            }

        } catch (e) {
            console.error("DEBUG: General error in handleEncryptedFile:", e);
        }
    }

    async create(userId: string, data: CreateSalaryRecordInput, file?: Express.Multer.File) {
        console.log(`DEBUG: SalaryService.create called. userId=${userId}, hasFile=${!!file}, hasPdfPassword=${!!data.pdfPassword}`);
        if (file && data.pdfPassword) {
            console.log('DEBUG: Delegating to handleEncryptedFile');
            await this.handleEncryptedFile(file, data.pdfPassword, userId);
        } else {
            console.log('DEBUG: Skipping handleEncryptedFile (missing file or password)');
        }

        const client = await pool.connect();
        try {
            await client.query('BEGIN');

            const { date, grossSalary, netSalary, company, notes, breakdown } = data;
            const fileStorageKey = file ? file.path : null;
            const fileName = file ? file.originalname : null;

            const salaryRes = await client.query(
                `INSERT INTO salary_records (date, "grossSalary", "netSalary", company, notes, "fileName", "fileStorageKey", "userId")
         VALUES ($1, $2, $3, $4, $5, $6, $7, $8)
         RETURNING id`,
                [date, grossSalary, netSalary, company, notes, fileName, fileStorageKey, userId]
            );
            const salaryId = salaryRes.rows[0].id;

            if (breakdown && breakdown.length > 0) {
                for (const item of breakdown) {
                    await client.query(
                        `INSERT INTO salary_breakdown_items ("salaryId", concept, amount, type)
             VALUES ($1, $2, $3, $4)`,
                        [salaryId, item.concept, item.amount, item.type]
                    );
                }
            }

            await client.query('COMMIT');
            return { id: salaryId };
        } catch (error) {
            await client.query('ROLLBACK');
            throw error;
        } finally {
            client.release();
        }
    }

    async findAll(userId: string, query: GetSalaryRecordsQuery) {
        const { page, limit, company, from, to } = query;
        const offset = (page - 1) * limit;
        const params: any[] = [limit, offset, userId]; // $1=limit, $2=offset, $3=userId
        let whereClause = 'WHERE "userId" = $3';
        let paramIndex = 4;

        if (company) {
            whereClause += ` AND company ILIKE $${paramIndex++}`;
            params.push(`%${company}%`);
        }
        if (from) {
            whereClause += ` AND date >= $${paramIndex++}`;
            params.push(from);
        }
        if (to) {
            whereClause += ` AND date <= $${paramIndex++}`;
            params.push(to);
        }

        const dataRes = await pool.query(
            `SELECT *, count(*) OVER() as full_count FROM salary_records ${whereClause} ORDER BY date DESC LIMIT $1 OFFSET $2`,
            params
        );

        const rows = dataRes.rows;
        const total = rows.length > 0 ? parseInt(rows[0].full_count, 10) : 0;
        const data = rows.map(({ full_count, ...rest }) => rest);

        return {
            data,
            meta: {
                total,
                page,
                limit,
                totalPages: Math.ceil(total / limit),
            },
        };
    }

    async findById(userId: string, id: string) {
        const salaryRes = await pool.query('SELECT * FROM salary_records WHERE id = $1 AND "userId" = $2', [id, userId]);
        if (salaryRes.rows.length === 0) return null;

        const breakdownRes = await pool.query(
            'SELECT * FROM salary_breakdown_items WHERE "salaryId" = $1',
            [id]
        );

        return {
            ...salaryRes.rows[0],
            breakdown: breakdownRes.rows,
        };
    }

    async delete(userId: string, id: string) {
        // Cascade delete handles breakdown items
        // Ensure user owns the record
        await pool.query('DELETE FROM salary_records WHERE id = $1 AND "userId" = $2', [id, userId]);
    }

    async update(userId: string, id: string, data: CreateSalaryRecordInput, file?: Express.Multer.File) {
        if (file && data.pdfPassword) {
            await this.handleEncryptedFile(file, data.pdfPassword, userId);
        }

        const client = await pool.connect();
        try {
            await client.query('BEGIN');

            const check = await client.query('SELECT id FROM salary_records WHERE id = $1 AND "userId" = $2', [id, userId]);
            if (check.rows.length === 0) {
                await client.query('ROLLBACK');
                return null;
            }

            const { date, grossSalary, netSalary, company, notes, breakdown } = data;

            // Update base record
            let query = `UPDATE salary_records SET date = $1, "grossSalary" = $2, "netSalary" = $3, company = $4, notes = $5`;
            const params: any[] = [date, grossSalary, netSalary, company, notes];
            let pIdx = 6;

            if (file) {
                query += `, "fileName" = $${pIdx++}, "fileStorageKey" = $${pIdx++}`;
                params.push(file.originalname, file.path);
            }

            query += ` WHERE id = $${pIdx}`;
            params.push(id);

            await client.query(query, params);

            // Update Breakdown
            if (breakdown) {
                // Remove old
                await client.query('DELETE FROM salary_breakdown_items WHERE "salaryId" = $1', [id]);

                // Add new
                if (breakdown.length > 0) {
                    for (const item of breakdown) {
                        await client.query(
                            `INSERT INTO salary_breakdown_items ("salaryId", concept, amount, type)
                             VALUES ($1, $2, $3, $4)`,
                            [id, item.concept, item.amount, item.type]
                        );
                    }
                }
            }

            await client.query('COMMIT');
            return { id };
        } catch (error) {
            await client.query('ROLLBACK');
            throw error;
        } finally {
            client.release();
        }
    }
}

export const salaryService = new SalaryService();
