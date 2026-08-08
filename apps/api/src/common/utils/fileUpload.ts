import multer from 'multer';
import path from 'path';
import fs from 'fs';
import { randomUUID } from 'crypto';

export const createDiskUploader = (subDir: string) => {
    const uploadDir = path.join(process.cwd(), 'uploads', subDir);

    // Ensure directory exists
    if (!fs.existsSync(uploadDir)) {
        fs.mkdirSync(uploadDir, { recursive: true });
    }

    const storage = multer.diskStorage({
        destination: function (req, file, cb) {
            cb(null, uploadDir);
        },
        filename: function (req, file, cb) {
            const ext = path.extname(file.originalname);
            cb(null, `${randomUUID()}${ext}`);
        },
    });

    return multer({
        storage,
        limits: { fileSize: 10 * 1024 * 1024, files: 1 },
        fileFilter: (_req, file, cb) => {
            const allowedMimeTypes = new Set(['application/pdf', 'image/jpeg', 'image/png']);
            const allowedExtensions = new Set(['.pdf', '.jpg', '.jpeg', '.png']);
            const extension = path.extname(file.originalname).toLowerCase();
            if (!allowedMimeTypes.has(file.mimetype.toLowerCase()) || !allowedExtensions.has(extension)) {
                cb(new Error('Only PDF, JPEG, and PNG documents are allowed'));
                return;
            }
            cb(null, true);
        },
    });
};
