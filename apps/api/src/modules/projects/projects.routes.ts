import { Router } from 'express';
import { authenticateToken } from '../auth/auth.middleware';
import { projectsController } from './projects.controller';

const router = Router();
router.use(authenticateToken);
router.get('/', projectsController.list.bind(projectsController));
router.post('/', projectsController.create.bind(projectsController));
router.get('/:id', projectsController.get.bind(projectsController));
router.delete('/:id', projectsController.delete.bind(projectsController));
router.post('/:id/entries', projectsController.addEntry.bind(projectsController));
router.delete('/:id/entries/:entryId', projectsController.deleteEntry.bind(projectsController));

export default router;
