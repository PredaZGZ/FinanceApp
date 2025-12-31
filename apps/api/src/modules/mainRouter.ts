import { Router } from "express";
import transactionsRouter from './transactions/transactions.routes';
import portfolioRouter from './portfolio/portfolio.routes';
import importRouter from './import/import.routes';
import netWorthRouter from './networth/networth.routes';

const router = Router();

router.use("/transactions", transactionsRouter);
router.use("/portfolio", portfolioRouter);
router.use("/import", importRouter);
router.use("/networth", netWorthRouter);

export default router;
