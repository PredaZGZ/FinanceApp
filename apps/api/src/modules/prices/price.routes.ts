import { Router } from 'express';
import { priceController } from './price.controller';
import { authenticateToken } from '../auth/auth.middleware';

const router = Router();
router.use(authenticateToken);

router.get('/batch', priceController.getBatchPrices.bind(priceController));
router.get('/search', priceController.search.bind(priceController));

export default router;
