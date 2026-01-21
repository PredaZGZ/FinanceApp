import { Router } from 'express';
import { salaryController } from './salary.controller';
import { createDiskUploader } from '../../common/utils/fileUpload';
import { authenticateToken } from '../auth/auth.middleware';

const router = Router();

// Protect all salary routes
router.use(authenticateToken);

const upload = createDiskUploader('salary');

router.get('/', salaryController.findAll.bind(salaryController));
router.post('/', upload.single('file'), salaryController.create.bind(salaryController));
router.post('/validate-file', upload.single('file'), salaryController.validateFile.bind(salaryController));
router.get('/:id', salaryController.findById.bind(salaryController));
router.put('/:id', upload.single('file'), salaryController.update.bind(salaryController));
router.delete('/:id', salaryController.delete.bind(salaryController));

export default router;
