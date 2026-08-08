import { prisma } from '../../common/db/prisma';
import type { CreateProjectBody, CreateProjectEntryBody } from './projects.schema';
import fs from 'fs';

const summarySelect = {
    id: true,
    name: true,
    description: true,
    createdAt: true,
    updatedAt: true,
    entries: { select: { type: true, amount: true } },
} as const;

function withTotals<T extends { entries: Array<{ type: string; amount: unknown }> }>(project: T) {
    const totals = project.entries.reduce((result, entry) => {
        const amount = Number(entry.amount);
        if (entry.type === 'INCOME') result.income += amount;
        else result.expense += amount;
        return result;
    }, { income: 0, expense: 0 });
    const { entries: _entries, ...data } = project;
    return { ...data, ...totals, balance: totals.income - totals.expense };
}

export class ProjectsService {
    private removeFile(filePath?: string | null) {
        if (filePath && fs.existsSync(filePath)) fs.unlinkSync(filePath);
    }

    async list(userId: string) {
        const projects = await prisma.project.findMany({
            where: { userId },
            select: summarySelect,
            orderBy: { updatedAt: 'desc' },
        });
        return projects.map(withTotals);
    }

    async create(userId: string, data: CreateProjectBody) {
        const project = await prisma.project.create({
            data: { userId, name: data.name, description: data.description || null },
            select: summarySelect,
        });
        return withTotals(project);
    }

    async get(userId: string, id: string) {
        const project = await prisma.project.findFirst({
            where: { id, userId },
            select: {
                id: true,
                name: true,
                description: true,
                createdAt: true,
                updatedAt: true,
                entries: {
                    select: {
                        id: true,
                        type: true,
                        amount: true,
                        description: true,
                        category: true,
                        date: true,
                        fileName: true,
                        fileMimeType: true,
                        createdAt: true,
                    },
                    orderBy: [{ date: 'desc' }, { createdAt: 'desc' }],
                },
            },
        });
        if (!project) return null;

        const totals = withTotals(project);
        return { ...totals, entries: project.entries.map((entry) => ({ ...entry, amount: Number(entry.amount) })) };
    }

    async delete(userId: string, id: string) {
        const project = await prisma.project.findFirst({
            where: { id, userId },
            select: { entries: { select: { fileStorageKey: true } } },
        });
        if (!project) return false;

        const result = await prisma.project.deleteMany({ where: { id, userId } });
        if (result.count > 0) {
            project.entries.forEach((entry) => this.removeFile(entry.fileStorageKey));
        }
        return result.count > 0;
    }

    async addEntry(userId: string, projectId: string, data: CreateProjectEntryBody, file?: Express.Multer.File) {
        const project = await prisma.project.findFirst({ where: { id: projectId, userId }, select: { id: true } });
        if (!project) {
            this.removeFile(file?.path);
            return null;
        }

        try {
            const entry = await prisma.projectEntry.create({
                data: {
                    projectId,
                    type: data.type,
                    amount: data.amount,
                    description: data.description,
                    category: data.category || null,
                    date: new Date(`${data.date}T00:00:00.000Z`),
                    fileName: file?.originalname || null,
                    fileStorageKey: file?.path || null,
                    fileMimeType: file?.mimetype || null,
                },
                select: {
                    id: true,
                    projectId: true,
                    type: true,
                    amount: true,
                    description: true,
                    category: true,
                    date: true,
                    fileName: true,
                    fileMimeType: true,
                    createdAt: true,
                    updatedAt: true,
                },
            });
            await prisma.project.update({ where: { id: projectId }, data: { updatedAt: new Date() } });
            return { ...entry, amount: Number(entry.amount) };
        } catch (error) {
            this.removeFile(file?.path);
            throw error;
        }
    }

    async getEntryFile(userId: string, projectId: string, entryId: string) {
        const entry = await prisma.projectEntry.findFirst({
            where: { id: entryId, projectId, project: { userId } },
            select: { fileName: true, fileStorageKey: true, fileMimeType: true },
        });
        if (!entry?.fileStorageKey) return null;
        return entry;
    }

    async deleteEntry(userId: string, projectId: string, entryId: string) {
        const project = await prisma.project.findFirst({ where: { id: projectId, userId }, select: { id: true } });
        if (!project) return false;
        const entry = await prisma.projectEntry.findFirst({
            where: { id: entryId, projectId },
            select: { fileStorageKey: true },
        });
        const result = await prisma.projectEntry.deleteMany({ where: { id: entryId, projectId } });
        if (result.count > 0) this.removeFile(entry?.fileStorageKey);
        return result.count > 0;
    }
}

export const projectsService = new ProjectsService();
