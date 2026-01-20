import { revolutService } from './revolut.service';
import { myInvestorService } from './myinvestor.service';
import pool from '../../common/db/client';

export class ImportService {
    async importRevolut(userId: string, buffer: Buffer, originalName: string) {
        try {
            const statement = await revolutService.parseStatement(buffer);
            await revolutService.saveToDb(userId, statement);
            await this.logImport(userId, 'revolut', originalName, 'success', statement.currencies.length);
            return statement;
        } catch (error: any) {
            await this.logImport(userId, 'revolut', originalName, 'error', 0);
            throw error;
        }
    }

    async importMyInvestor(userId: string, movementsBuffer: Buffer, ordersBuffer: Buffer | undefined, originalName: string) {
        try {
            const result = await myInvestorService.processFiles(userId, movementsBuffer, ordersBuffer);
            await this.logImport(userId, 'myinvestor', originalName, 'success', result.tradesCount + result.transfersCount);
            return result;
        } catch (error) {
            await this.logImport(userId, 'myinvestor', originalName, 'error', 0);
            throw error;
        }
    }

    async getImportStatus(userId: string) {
        const client = await pool.connect();
        try {
            const result = await client.query(`
                SELECT DISTINCT ON (source) source, "createdAt"
                FROM import_history
                WHERE status = 'success' AND "userId" = $1
                ORDER BY source, "createdAt" DESC
            `, [userId]);

            const status: Record<string, string | null> = {
                revolut: null,
                myinvestor: null
            };

            result.rows.forEach(row => {
                if (status.hasOwnProperty(row.source)) {
                    status[row.source] = row.createdAt;
                }
            });

            return status;
        } finally {
            client.release();
        }
    }

    private async logImport(userId: string, source: string, filename: string, status: string, recordsProcessed: number) {
        const client = await pool.connect();
        try {
            await client.query(
                `INSERT INTO import_history (source, filename, status, "recordsProcessed", "userId") VALUES ($1, $2, $3, $4, $5)`,
                [source, filename, status, recordsProcessed, userId]
            );
        } catch (err) {
            console.error('Failed to log import history:', err);
        } finally {
            client.release();
        }
    }
}

export const importService = new ImportService();
