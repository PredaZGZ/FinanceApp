import { Router } from 'express';
import { transactionsController } from './transactions.controller';

const router = Router();

router.get('/', transactionsController.getTransactions);

export default router;
