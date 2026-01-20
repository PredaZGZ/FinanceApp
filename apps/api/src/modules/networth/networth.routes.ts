import { Router } from 'express';
import { netWorthController } from './networth.controller';
import { authenticateToken } from '../auth/auth.middleware';

const router = Router();

router.use(authenticateToken);

// Assets
router.post('/assets', netWorthController.createAsset);
router.get('/assets', netWorthController.getAssets);
router.get('/assets/:id', netWorthController.getAssetById);
router.put('/assets/:id', netWorthController.updateAsset);
router.patch('/assets/:id', netWorthController.patchAsset);
router.delete('/assets/:id', netWorthController.deleteAsset);

// Valuations
router.post('/assets/:id/valuations', netWorthController.revalueAsset);
router.get('/assets/:id/valuations', netWorthController.getAssetValuations);

// Summary
router.get('/summary', netWorthController.getSummary);

export default router;
