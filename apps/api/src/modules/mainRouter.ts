import { Router } from "express";
import transactionsRouter from './transactions/transactions.routes';
import portfolioRouter from './portfolio/portfolio.routes';

const router = Router();

router.use("/transactions", transactionsRouter);
router.use("/portfolio", portfolioRouter);

export default router;
