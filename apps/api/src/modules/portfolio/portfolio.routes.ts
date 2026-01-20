import { Router } from 'express';
import { portfolioController } from './portfolio.controller';
import { authenticateToken } from '../auth/auth.middleware';

const router = Router();

router.use(authenticateToken);

router.get('/summary', portfolioController.getPortfolioSummary.bind(portfolioController));
router.get('/analysis/:symbol', portfolioController.getPortfolioAnalysis.bind(portfolioController));

export default router;
