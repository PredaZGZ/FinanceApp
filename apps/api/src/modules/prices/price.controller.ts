import { Request, Response } from 'express';
import { priceService } from './price.service';

export class PriceController {
    async getBatchPrices(req: Request, res: Response) {
        try {
            const symbolsParam = req.query.symbols as string;
            if (!symbolsParam) {
                return res.status(400).json({ error: 'Missing symbols query parameter' });
            }

            const symbols = symbolsParam.split(',').map(s => s.trim()).filter(s => s);
            const prices = await priceService.getPrices(symbols);

            res.json(prices);
        } catch (error) {
            console.error(error);
            res.status(500).json({ error: 'Internal Server Error' });
        }
    }

    async search(req: Request, res: Response) {
        try {
            const query = req.query.q as string;
            if (!query) {
                return res.status(400).json({ error: 'Missing query parameter' });
            }

            const results = await priceService.search(query);
            res.json(results);
        } catch (error) {
            console.error(error);
            res.status(500).json({ error: 'Internal Server Error' });
        }
    }
}

export const priceController = new PriceController();
