import { Router } from "express";
import transactionsRouter from './transactions/transactions.routes';

const router = Router();

router.use("/transactions", transactionsRouter);

export default router;
