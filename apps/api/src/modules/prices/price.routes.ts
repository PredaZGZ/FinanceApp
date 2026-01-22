import { Router } from 'express';
import { priceController } from './price.controller';

const router = Router();

router.get('/batch', priceController.getBatchPrices.bind(priceController));
router.get('/search', priceController.search.bind(priceController));

export default router;
