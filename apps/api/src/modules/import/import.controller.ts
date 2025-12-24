import { Request, Response } from 'express';
import { revolutService } from '../../services/revolut.service';
import { myInvestorService } from '../../services/myinvestor.service';

export class ImportController {
    async importRevolut(req: Request, res: Response) {
        try {
            if (!req.file) {
                return res.status(400).json({ error: 'No file uploaded. Ensure the form-data field name is "file".' });
            }

            const statement = await revolutService.parseStatement(req.file.buffer);
            await revolutService.saveToDb(statement);

            res.json({ message: 'Revolut data imported successfully', data: statement });
        } catch (error) {
            console.error('Error importing Revolut data:', error);
            res.status(500).json({ error: 'Failed to import Revolut data' });
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

            const result = await myInvestorService.processFiles(
                movementsFile.buffer,
                ordersFile?.buffer
            );

            res.json({ message: 'MyInvestor data imported successfully', data: result });
        } catch (error) {
            console.error('Error importing MyInvestor data:', error);
            res.status(500).json({ error: 'Failed to import MyInvestor data' });
        }
    }
}

export const importController = new ImportController();
