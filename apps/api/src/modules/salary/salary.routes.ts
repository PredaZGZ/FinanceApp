import { Router } from 'express';
import multer from 'multer';
import path from 'path';
import fs from 'fs';
import { salaryController } from './salary.controller';

const router = Router();

// Configure storage for file uploads
const uploadDir = path.join(process.cwd(), 'uploads', 'salary');
if (!fs.existsSync(uploadDir)) {
    fs.mkdirSync(uploadDir, { recursive: true });
}

const storage = multer.diskStorage({
    destination: function (req, file, cb) {
        cb(null, uploadDir);
    },
    filename: function (req, file, cb) {
        const uniqueSuffix = Date.now() + '-' + Math.round(Math.random() * 1e9);
        cb(null, uniqueSuffix + '-' + file.originalname);
    },
});

const upload = multer({ storage: storage });

router.get('/', salaryController.findAll.bind(salaryController));
router.post('/', upload.single('file'), salaryController.create.bind(salaryController));
router.get('/:id', salaryController.findById.bind(salaryController));
router.delete('/:id', salaryController.delete.bind(salaryController));

export default router;
