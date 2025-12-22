import { Router } from 'express';
import { portfolioController } from './portfolio.controller';

const router = Router();

router.get('/summary', portfolioController.getPortfolioSummary.bind(portfolioController));
router.get('/analysis/:symbol', portfolioController.getPortfolioAnalysis.bind(portfolioController));

export default router;
