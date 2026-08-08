import { revolutService } from './revolut.service';
import { myInvestorService } from './myinvestor.service';
import { prisma } from '../../common/db/prisma';

export class ImportService {
    async importRevolut(userId: string, buffer: Buffer, originalName: string) {
        try {
            const statement = await revolutService.parseStatement(buffer);
            const insertedCount = await revolutService.saveToDb(userId, statement);
            await this.logImport(userId, 'revolut', originalName, 'success', insertedCount);
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
        const history = await prisma.importHistory.findMany({
            where: { userId, status: 'success', source: { in: ['revolut', 'myinvestor'] } },
            select: { source: true, createdAt: true },
            orderBy: { createdAt: 'desc' },
        });

        const status: Record<string, string | null> = {
            revolut: null,
            myinvestor: null,
        };

        for (const entry of history) {
            if (status[entry.source] === null) {
                status[entry.source] = entry.createdAt.toISOString();
            }
        }

        return status;
    }

    private async logImport(userId: string, source: string, filename: string, status: string, recordsProcessed: number) {
        try {
            await prisma.importHistory.create({
                data: { source, filename, status, recordsProcessed, userId },
            });
        } catch (err) {
            console.error('Failed to log import history:', err);
        }
    }
}

export const importService = new ImportService();
