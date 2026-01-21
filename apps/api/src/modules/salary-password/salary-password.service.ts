import pool from '../../common/db/client';
import { encrypt } from '../../common/utils/encryption';
import type { CreateSalaryPasswordInput } from './salary-password.schema';

export class SalaryPasswordService {
    async create(userId: string, data: CreateSalaryPasswordInput) {
        // Encrypt the password
        const { iv, encryptedData } = encrypt(data.passphrase);

        const res = await pool.query(
            `INSERT INTO salary_pdf_passwords ("userId", "encryptedPassword", "iv", "label")
             VALUES ($1, $2, $3, $4)
             RETURNING id, label, "createdAt"`,
            [userId, encryptedData, iv, data.label]
        );
        return res.rows[0];
    }

    async findAll(userId: string) {
        // Return only metadata, never the password
        const res = await pool.query(
            `SELECT id, label, "createdAt" FROM salary_pdf_passwords WHERE "userId" = $1 ORDER BY "createdAt" DESC`,
            [userId]
        );
        return res.rows;
    }

    async findAllWithSecrets(userId: string) {
        const res = await pool.query(
            `SELECT id, "encryptedPassword", "iv" FROM salary_pdf_passwords WHERE "userId" = $1`,
            [userId]
        );
        return res.rows;
    }

    async delete(userId: string, id: string) {
        await pool.query(
            `DELETE FROM salary_pdf_passwords WHERE id = $1 AND "userId" = $2`,
            [id, userId]
        );
    }
}

export const salaryPasswordService = new SalaryPasswordService();
