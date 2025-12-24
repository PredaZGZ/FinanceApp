import { Router } from 'express';
import multer from 'multer';
import { importController } from './import.controller';

const router = Router();
const upload = multer({ storage: multer.memoryStorage() });

router.post('/revolut', upload.single('file'), importController.importRevolut);

router.post('/myinvestor', upload.fields([
    { name: 'movements', maxCount: 1 },
    { name: 'orders', maxCount: 1 }
]), importController.importMyInvestor);

export default router;
