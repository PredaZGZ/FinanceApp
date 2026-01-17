import { Router } from 'express';
import { salaryController } from './salary.controller';
import { createDiskUploader } from '../../common/utils/fileUpload';

const router = Router();

const upload = createDiskUploader('salary');

router.get('/', salaryController.findAll.bind(salaryController));
router.post('/', upload.single('file'), salaryController.create.bind(salaryController));
router.get('/:id', salaryController.findById.bind(salaryController));
router.delete('/:id', salaryController.delete.bind(salaryController));

export default router;
