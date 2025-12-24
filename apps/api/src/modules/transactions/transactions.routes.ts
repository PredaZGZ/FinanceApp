import { Router } from 'express';
import { transactionsController } from './transactions.controller';

const router = Router();

router.get('/', transactionsController.getTransactions);
router.get('/pending-conversion', transactionsController.getPendingConversions.bind(transactionsController));
router.post('/:id/conversion', transactionsController.updateConversion.bind(transactionsController));

export default router;
