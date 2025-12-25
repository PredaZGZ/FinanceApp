import { revolutService } from '../../services/revolut.service';
import { myInvestorService } from '../../services/myinvestor.service';
import pool from '../../common/db/client';

export class ImportService {
    async importRevolut(buffer: Buffer, originalName: string) {
        try {
            const statement = await revolutService.parseStatement(buffer);
            await revolutService.saveToDb(statement);
            await this.logImport('revolut', originalName, 'success', statement.currencies.length);
            return statement;
        } catch (error: any) {
            await this.logImport('revolut', originalName, 'error', 0);
            throw error;
        }
    }

    async importMyInvestor(movementsBuffer: Buffer, ordersBuffer: Buffer | undefined, originalName: string) {
        try {
            const result = await myInvestorService.processFiles(movementsBuffer, ordersBuffer);
            await this.logImport('myinvestor', originalName, 'success', result.tradesCount + result.transfersCount);
            return result;
        } catch (error) {
            await this.logImport('myinvestor', originalName, 'error', 0);
            throw error;
        }
    }

    async getImportStatus() {
        const client = await pool.connect();
        try {
            const result = await client.query(`
                SELECT DISTINCT ON (source) source, "createdAt"
                FROM import_history
                WHERE status = 'success'
                ORDER BY source, "createdAt" DESC
            `);

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

    private async logImport(source: string, filename: string, status: string, recordsProcessed: number) {
        const client = await pool.connect();
        try {
            await client.query(
                `INSERT INTO import_history (source, filename, status, "recordsProcessed") VALUES ($1, $2, $3, $4)`,
                [source, filename, status, recordsProcessed]
            );
        } catch (err) {
            console.error('Failed to log import history:', err);
        } finally {
            client.release();
        }
    }
}

export const importService = new ImportService();
