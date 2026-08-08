import { Router } from 'express';
import { authenticateToken } from '../auth/auth.middleware';
import { projectsController } from './projects.controller';
import { createDiskUploader } from '../../common/utils/fileUpload';

const router = Router();
router.use(authenticateToken);
const upload = createDiskUploader('projects');

router.get('/', projectsController.list.bind(projectsController));
router.post('/', projectsController.create.bind(projectsController));
router.get('/:id', projectsController.get.bind(projectsController));
router.delete('/:id', projectsController.delete.bind(projectsController));
router.post('/:id/entries', upload.single('file'), projectsController.addEntry.bind(projectsController));
router.get('/:id/entries/:entryId/file', projectsController.entryFile.bind(projectsController));
router.delete('/:id/entries/:entryId', projectsController.deleteEntry.bind(projectsController));

export default router;
