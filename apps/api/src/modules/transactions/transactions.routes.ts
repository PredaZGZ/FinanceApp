import { Router } from 'express';
import { transactionsController } from './transactions.controller';

import { validateRequest } from '../../common/middleware/validateRequest';
import { getTransactionsSchema, updateConversionSchema } from './transactions.schema';

const router = Router();

router.get('/', validateRequest(getTransactionsSchema), transactionsController.getTransactions);
router.get('/pending-conversion', transactionsController.getPendingConversions.bind(transactionsController));
router.post('/:id/conversion', validateRequest(updateConversionSchema), transactionsController.updateConversion.bind(transactionsController));

export default router;
