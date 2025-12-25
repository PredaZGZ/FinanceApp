import { Request, Response } from 'express';
import { importService } from './import.service';

export class ImportController {
    async importRevolut(req: Request, res: Response) {
        try {
            if (!req.file) {
                return res.status(400).json({ error: 'No file uploaded. Ensure the form-data field name is "file".' });
            }

            const data = await importService.importRevolut(req.file.buffer, req.file.originalname);
            res.json({ message: 'Revolut data imported successfully', data });
        } catch (error: any) {
            console.error('Error importing Revolut data:', error);
            res.status(500).json({ error: error.message || 'Failed to import Revolut data' });
        }
    }

    async importMyInvestor(req: Request, res: Response) {
        try {
            const files = req.files as { [fieldname: string]: Express.Multer.File[] };
            const movementsFile = files['movements']?.[0];
            const ordersFile = files['orders']?.[0];

            if (!movementsFile) {
                return res.status(400).json({ error: 'Movements file is required (field name: "movements")' });
            }

            const data = await importService.importMyInvestor(
                movementsFile.buffer,
                ordersFile?.buffer,
                movementsFile.originalname
            );

            res.json({ message: 'MyInvestor data imported successfully', data });
        } catch (error) {
            console.error('Error importing MyInvestor data:', error);
            res.status(500).json({ error: 'Failed to import MyInvestor data' });
        }
    }

    async getImportStatus(req: Request, res: Response) {
        try {
            const status = await importService.getImportStatus();
            res.json(status);
        } catch (error) {
            console.error('Error fetching import status:', error);
            res.status(500).json({ error: 'Failed to fetch import status' });
        }
    }
}

export const importController = new ImportController();
