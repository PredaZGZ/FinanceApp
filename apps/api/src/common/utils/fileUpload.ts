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

    return multer({ storage: storage });
};
