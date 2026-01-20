
import type { Request, Response } from 'express';
import { netWorthService } from './networth.service';
import {
    createAssetSchema,
    updateAssetSchema,
    patchAssetSchema,
    getAssetsSchema,
    createValuationSchema,
    getValuationsSchema
} from './networth.schema';

export class NetWorthController {

    async createAsset(req: any, res: Response) {
        try {
            const validation = createAssetSchema.safeParse({ body: req.body });
            if (!validation.success) {
                res.status(400).json({ error: 'Invalid input', details: validation.error.format() });
                return;
            }

            const userId = req.user!.id;
            const asset = await netWorthService.createAsset(userId, validation.data.body);
            res.status(201).json(asset);
        } catch (error) {
            console.error('Error creating asset:', error);
            res.status(500).json({ error: 'Internal server error' });
        }
    }

    async getAssets(req: any, res: Response) {
        try {
            const validation = getAssetsSchema.safeParse({ query: req.query });
            if (!validation.success) {
                res.status(400).json({ error: 'Invalid query parameters', details: validation.error.format() });
                return;
            }

            const userId = req.user!.id;
            const result = await netWorthService.getAssets(userId, validation.data.query);
            res.json(result);
        } catch (error) {
            console.error('Error fetching assets:', error);
            res.status(500).json({ error: 'Internal server error' });
        }
    }

    async getAssetById(req: any, res: Response) {
        try {
            const { id } = req.params;
            const userId = req.user!.id;
            const asset = await netWorthService.getAssetById(userId, id);
            if (!asset) {
                res.status(404).json({ error: 'Asset not found' });
                return;
            }
            res.json(asset);
        } catch (error) {
            console.error('Error fetching asset:', error);
            res.status(500).json({ error: 'Internal server error' });
        }
    }

    async updateAsset(req: any, res: Response) {
        try {
            const validation = updateAssetSchema.safeParse({ params: req.params, body: req.body });
            if (!validation.success) {
                res.status(400).json({ error: 'Invalid input', details: validation.error.format() });
                return;
            }

            const userId = req.user!.id;
            const updated = await netWorthService.updateAsset(userId, validation.data.params.id, validation.data.body);
            if (!updated) {
                res.status(404).json({ error: 'Asset not found' });
                return;
            }
            res.json(updated);
        } catch (error) {
            console.error('Error updating asset:', error);
            res.status(500).json({ error: 'Internal server error' });
        }
    }

    async patchAsset(req: any, res: Response) {
        try {
            const validation = patchAssetSchema.safeParse({ params: req.params, body: req.body });
            if (!validation.success) {
                res.status(400).json({ error: 'Invalid input', details: validation.error.format() });
                return;
            }

            const userId = req.user!.id;
            const patched = await netWorthService.patchAsset(userId, validation.data.params.id, validation.data.body);
            if (!patched) {
                res.status(404).json({ error: 'Asset not found' });
                return;
            }
            res.json(patched);
        } catch (error) {
            console.error('Error patching asset:', error);
            res.status(500).json({ error: 'Internal server error' });
        }
    }

    async deleteAsset(req: any, res: Response) {
        try {
            const { id } = req.params;
            const userId = req.user!.id;
            const success = await netWorthService.deleteAsset(userId, id);
            if (!success) {
                res.status(404).json({ error: 'Asset not found' });
                return;
            }
            res.status(204).send();
        } catch (error) {
            console.error('Error deleting asset:', error);
            res.status(500).json({ error: 'Internal server error' });
        }
    }

    async revalueAsset(req: any, res: Response) {
        try {
            const validation = createValuationSchema.safeParse({ params: req.params, body: req.body });
            if (!validation.success) {
                res.status(400).json({ error: 'Invalid input', details: validation.error.format() });
                return;
            }

            const userId = req.user!.id;
            const valuation = await netWorthService.addValuation(userId, validation.data.params.id, validation.data.body);
            res.status(201).json(valuation);
        } catch (error: any) {
            console.error('Error revaluing asset:', error);
            if (error.message === 'Asset not found') {
                res.status(404).json({ error: error.message });
            } else if (error.message === 'Cannot add valuation to a sold asset') {
                res.status(400).json({ error: error.message });
            } else {
                res.status(500).json({ error: 'Internal server error' });
            }
        }
    }

    async getAssetValuations(req: any, res: Response) {
        try {
            const validation = getValuationsSchema.safeParse({ params: req.params, query: req.query });
            if (!validation.success) {
                res.status(400).json({ error: 'Invalid input', details: validation.error.format() });
                return;
            }

            const userId = req.user!.id;
            const result = await netWorthService.getValuations(userId, validation.data.params.id, validation.data.query);
            res.json(result);
        } catch (error: any) {
            console.error('Error fetching valuations:', error);
            if (error.message === 'Asset not found') {
                res.status(404).json({ error: error.message });
            } else {
                res.status(500).json({ error: 'Internal server error' });
            }
        }
    }

    async getSummary(req: any, res: Response) {
        try {
            const userId = req.user!.id;
            const summary = await netWorthService.getSummary(userId);
            res.json(summary);
        } catch (error) {
            console.error('Error fetching net worth summary:', error);
            res.status(500).json({ error: 'Internal server error' });
        }
    }
}

export const netWorthController = new NetWorthController();
