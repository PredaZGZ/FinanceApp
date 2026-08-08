import { prisma } from '../../common/db/prisma';
import { encrypt } from '../../common/utils/encryption';
import type { CreateSalaryPasswordInput } from './salary-password.schema';

export class SalaryPasswordService {
    async create(userId: string, data: CreateSalaryPasswordInput) {
        // Encrypt the password
        const { iv, encryptedData } = encrypt(data.passphrase);

        return prisma.salaryPdfPassword.create({
            data: {
                userId,
                encryptedPassword: encryptedData,
                iv,
                label: data.label,
            },
            select: { id: true, label: true, createdAt: true },
        });
    }

    async findAll(userId: string) {
        // Return only metadata, never the password
        return prisma.salaryPdfPassword.findMany({
            where: { userId },
            select: { id: true, label: true, createdAt: true },
            orderBy: { createdAt: 'desc' },
        });
    }

    async findAllWithSecrets(userId: string) {
        return prisma.salaryPdfPassword.findMany({
            where: { userId },
            select: { id: true, encryptedPassword: true, iv: true },
        });
    }

    async delete(userId: string, id: string) {
        await prisma.salaryPdfPassword.deleteMany({ where: { id, userId } });
    }
}

export const salaryPasswordService = new SalaryPasswordService();
