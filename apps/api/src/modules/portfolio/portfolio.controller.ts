import { Request, Response } from 'express';
import { portfolioService } from './portfolio.service';
import { transactionsService } from '../transactions/transactions.service';
import { StockTrade } from './portfolio.types';

export class PortfolioController {
    async getPortfolioAnalysis(req: any, reqRes: Response) {
        try {
            const { symbol } = req.params;
            const { method = 'FIFO' } = req.query;
            const userId = req.user!.id;

            if (!symbol) {
                return reqRes.status(400).json({ error: 'Symbol is required' });
            }

            // Fetch all trades for this symbol, regardless of currency
            const tradesResult = await transactionsService.getTransactions(userId, {
                symbol: symbol as string,
                limit: 10000,
                page: 1
            });

            // Map DB trades to StockTrade interface
            // The DB result has 'data' array.
            const trades: StockTrade[] = tradesResult.data.map((t: any) => ({
                date: new Date(t.date),
                symbol: t.symbol,
                currency: t.currency,
                quantity: t.quantity,
                price: t.price,
                side: t.side,
                fees: t.fees,
                commission: t.commission
            }));

            let result;
            if (method === 'WeightedAverage') {
                result = portfolioService.calculateWeightedAverage(trades);
            } else {
                result = portfolioService.calculateFIFO(trades);
            }

            return reqRes.json(result);
        } catch (error) {
            console.error('Error calculating portfolio:', error);
            return reqRes.status(500).json({ error: 'Internal server error' });
        }
    }

    async getPortfolioSummary(req: any, reqRes: Response) {
        try {
            const { method = 'FIFO', currency = 'EUR' } = req.query; // Default to EUR for unified view
            const userId = req.user!.id;

            // Fetch all trades (mixed currencies)
            const tradesResult = await transactionsService.getTransactions(userId, {
                // currency: currency as 'EUR' | 'USD', // Don't filter by currency if we want everything
                limit: 100000,
                page: 1
            });

            // Fetch exchange rates
            const exchangeRates = await transactionsService.getExchangeRates(userId);

            const trades: StockTrade[] = tradesResult.data.map((t: any) => ({
                date: new Date(t.date),
                symbol: t.symbol,
                currency: t.currency,
                quantity: t.quantity,
                price: t.price,
                side: t.side,
                fees: t.fees,
                commission: t.commission
            }));

            const results = portfolioService.calculatePortfolioSummary(
                trades,
                method as 'FIFO' | 'WeightedAverage',
                currency as 'EUR' | 'USD',
                exchangeRates
            );

            // Aggregate totals
            // Aggregate totals using the EUR converted values
            const totalRealizedGain = results.reduce((sum, item) => sum + (item.realizedGainEur || 0), 0);
            const totalCostBasis = results.reduce((sum, item) => sum + (item.totalCostBasisEur || 0), 0);

            const nflx = results.find(r => r.symbol === 'NFLX');
            if (nflx) {
                console.log('CONTROLLER NFLX:', JSON.stringify(nflx, null, 2));
            }

            return reqRes.json({
                currency,
                method,
                totalRealizedGain,
                totalCostBasis,
                holdings: results
                    .filter(r => r.remainingShares > 0 || r.realizedGain !== 0)
                    .map(({ breakdown, ...rest }) => rest) // Exclude breakdown from summary to reduce payload size
            });

        } catch (error) {
            console.error('Error calculating portfolio summary:', error);
            return reqRes.status(500).json({ error: 'Internal server error' });
        }
    }
}

export const portfolioController = new PortfolioController();
