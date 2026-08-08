import type { Response } from 'express';
import { projectsService } from './projects.service';
import { createProjectEntrySchema, createProjectSchema, deleteProjectEntrySchema, projectParamsSchema } from './projects.schema';
import fs from 'fs';
import path from 'path';

export class ProjectsController {
    async list(req: any, res: Response) {
        res.json({ data: await projectsService.list(req.user!.id) });
    }

    async create(req: any, res: Response) {
        const validation = createProjectSchema.safeParse({ body: req.body });
        if (!validation.success) return res.status(400).json({ error: 'Invalid project', details: validation.error.format() });
        res.status(201).json(await projectsService.create(req.user!.id, validation.data.body));
    }

    async get(req: any, res: Response) {
        const validation = projectParamsSchema.safeParse({ params: req.params });
        if (!validation.success) return res.status(400).json({ error: 'Invalid project id' });
        const project = await projectsService.get(req.user!.id, validation.data.params.id);
        if (!project) return res.status(404).json({ error: 'Project not found' });
        res.json(project);
    }

    async delete(req: any, res: Response) {
        const validation = projectParamsSchema.safeParse({ params: req.params });
        if (!validation.success) return res.status(400).json({ error: 'Invalid project id' });
        if (!await projectsService.delete(req.user!.id, validation.data.params.id)) return res.status(404).json({ error: 'Project not found' });
        res.status(204).send();
    }

    async addEntry(req: any, res: Response) {
        const body = {
            ...req.body,
            amount: req.body.amount ? Number(req.body.amount) : req.body.amount,
        };
        const validation = createProjectEntrySchema.safeParse({ params: req.params, body });
        if (!validation.success) {
            if (req.file?.path && fs.existsSync(req.file.path)) fs.unlinkSync(req.file.path);
            return res.status(400).json({ error: 'Invalid entry', details: validation.error.format() });
        }
        const entry = await projectsService.addEntry(req.user!.id, validation.data.params.id, validation.data.body, req.file);
        if (!entry) return res.status(404).json({ error: 'Project not found' });
        res.status(201).json(entry);
    }

    async entryFile(req: any, res: Response) {
        const validation = deleteProjectEntrySchema.safeParse({ params: req.params });
        if (!validation.success) return res.status(400).json({ error: 'Invalid entry id' });
        const { id, entryId } = validation.data.params;
        const file = await projectsService.getEntryFile(req.user!.id, id, entryId);
        if (!file?.fileStorageKey || !fs.existsSync(file.fileStorageKey)) {
            return res.status(404).json({ error: 'Project document not found' });
        }

        const extension = path.extname(file.fileStorageKey).toLowerCase();
        const mimeType = file.fileMimeType || (extension === '.pdf' ? 'application/pdf' : 'application/octet-stream');
        res.setHeader('Content-Type', mimeType);
        res.setHeader('Content-Disposition', 'inline');
        res.setHeader('Cache-Control', 'private, no-store');
        return res.sendFile(file.fileStorageKey);
    }

    async deleteEntry(req: any, res: Response) {
        const validation = deleteProjectEntrySchema.safeParse({ params: req.params });
        if (!validation.success) return res.status(400).json({ error: 'Invalid entry id' });
        const { id, entryId } = validation.data.params;
        if (!await projectsService.deleteEntry(req.user!.id, id, entryId)) return res.status(404).json({ error: 'Entry not found' });
        res.status(204).send();
    }
}

export const projectsController = new ProjectsController();
