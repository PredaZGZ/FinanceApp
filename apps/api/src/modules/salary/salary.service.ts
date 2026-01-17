import pool from '../../common/db/client';
import type { CreateSalaryRecordInput, GetSalaryRecordsQuery } from './salary.schema';

export class SalaryService {
    async create(data: CreateSalaryRecordInput, file?: Express.Multer.File) {
        const client = await pool.connect();
        try {
            await client.query('BEGIN');

            const { date, grossSalary, netSalary, company, notes, breakdown } = data;
            const fileStorageKey = file ? file.path : null; // In a real app we'd upload to S3/equivalent. Here we store local path.
            const fileName = file ? file.originalname : null;

            const salaryRes = await client.query(
                `INSERT INTO salary_records (date, "grossSalary", "netSalary", company, notes, "fileName", "fileStorageKey")
         VALUES ($1, $2, $3, $4, $5, $6, $7)
         RETURNING id`,
                [date, grossSalary, netSalary, company, notes, fileName, fileStorageKey]
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

    async findAll(query: GetSalaryRecordsQuery) {
        const { page, limit, company, from, to } = query;
        const offset = (page - 1) * limit;
        const params: any[] = [limit, offset];
        let whereClause = 'WHERE 1=1';
        let paramIndex = 3;

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

        const totalRes = await pool.query(`SELECT COUNT(*) FROM salary_records ${whereClause}`, params.slice(2));
        const total = parseInt(totalRes.rows[0].count, 10);

        const dataRes = await pool.query(
            `SELECT * FROM salary_records ${whereClause} ORDER BY date DESC LIMIT $1 OFFSET $2`,
            params
        );

        return {
            data: dataRes.rows,
            meta: {
                total,
                page,
                limit,
                totalPages: Math.ceil(total / limit),
            },
        };
    }

    async findById(id: string) {
        const salaryRes = await pool.query('SELECT * FROM salary_records WHERE id = $1', [id]);
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

    async delete(id: string) {
        // Cascade delete handles breakdown items
        await pool.query('DELETE FROM salary_records WHERE id = $1', [id]);
    }
}

export const salaryService = new SalaryService();
