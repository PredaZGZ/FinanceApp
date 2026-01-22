import { CalculationResult, StockTrade, TradeMatch } from './portfolio.types';

export class PortfolioService {
    /**
     * Calculates the cost basis and realized gains using FIFO method.
     * Assumes trades are for a single symbol and same currency.
     */
    calculateFIFO(trades: StockTrade[]): CalculationResult {
        // Sort trades by date ascending
        const sortedTrades = [...trades].sort((a, b) => new Date(a.date).getTime() - new Date(b.date).getTime());

        // Queue of buy lots. We store the original trade plus the calculated cost per share for that lot.
        interface BuyLot extends StockTrade {
            costPerShare: number;
            remainingQuantity: number;
        }

        const buyQueue: BuyLot[] = [];
        let realizedGain = 0;
        const breakdown: TradeMatch[] = [];

        for (const trade of sortedTrades) {
            if (trade.side === 'Buy') {
                // Cost Basis = (Price * Quantity) + Fees + Commission
                const totalCost = (trade.price * trade.quantity) + (trade.fees || 0) + (trade.commission || 0);
                const costPerShare = totalCost / trade.quantity;

                buyQueue.push({
                    ...trade,
                    costPerShare,
                    remainingQuantity: trade.quantity
                });
            } else if (trade.side === 'Sell') {
                let quantityToSell = trade.quantity;

                // Net Proceeds = (Price * Quantity) - Fees - Commission
                // We will allocate these sell-costs proportionally to each matched lot to get accurate gain per lot
                const totalSellCosts = (trade.fees || 0) + (trade.commission || 0);
                const originalSellQuantity = trade.quantity;

                while (quantityToSell > 0 && buyQueue.length > 0) {
                    const buyLot = buyQueue[0];
                    const quantityFromThisLot = Math.min(quantityToSell, buyLot.remainingQuantity);

                    // Proportional sell costs for this chunk
                    const portion = quantityFromThisLot / originalSellQuantity;
                    const sellCostsForChunk = totalSellCosts * portion;

                    const sellValue = (trade.price * quantityFromThisLot) - sellCostsForChunk;
                    const buyCost = buyLot.costPerShare * quantityFromThisLot;

                    const gain = sellValue - buyCost;
                    realizedGain += gain;

                    breakdown.push({
                        sellDate: trade.date,
                        quantitySold: quantityFromThisLot,
                        sellPrice: trade.price,
                        buyDate: buyLot.date,
                        buyPrice: buyLot.price,
                        gain: gain
                    });

                    quantityToSell -= quantityFromThisLot;
                    buyLot.remainingQuantity -= quantityFromThisLot;

                    // If we consumed the entire lot
                    if (buyLot.remainingQuantity <= 0.000001) {
                        buyQueue.shift();
                    }
                }
            }
        }

        let remainingShares = 0;
        let totalCostBasis = 0;

        for (const remainingBuy of buyQueue) {
            remainingShares += remainingBuy.remainingQuantity;
            totalCostBasis += remainingBuy.remainingQuantity * remainingBuy.costPerShare;
        }

        return {
            symbol: trades[0]?.symbol || '',
            currency: trades[0]?.currency || 'EUR',
            realizedGain,
            remainingShares,
            totalCostBasis,
            averageCost: remainingShares > 0 ? totalCostBasis / remainingShares : 0,
            breakdown
        };
    }

    /**
     * Calculates the cost basis and realized gains using Weighted Average Cost method.
     * Assumes trades are for a single symbol.
     */
    calculateWeightedAverage(trades: StockTrade[]): CalculationResult {
        // Sort trades by date ascending
        const sortedTrades = [...trades].sort((a, b) => new Date(a.date).getTime() - new Date(b.date).getTime());

        let totalShares = 0;
        let totalCost = 0;
        let realizedGain = 0;
        let averageCost = 0;

        const breakdown: TradeMatch[] = [];

        for (const trade of sortedTrades) {
            if (trade.side === 'Buy') {
                const tradeCost = (trade.price * trade.quantity) + (trade.fees || 0) + (trade.commission || 0);
                totalShares += trade.quantity;
                totalCost += tradeCost;

                // Update average cost on buy
                if (totalShares > 0) {
                    averageCost = totalCost / totalShares;
                }
            } else if (trade.side === 'Sell') {
                const costOfSoldShares = trade.quantity * averageCost;

                // Net Proceeds = (Price * Quantity) - Fees - Commission
                const netProceeds = (trade.quantity * trade.price) - (trade.fees || 0) - (trade.commission || 0);
                const gain = netProceeds - costOfSoldShares;

                realizedGain += gain;

                // Add to breakdown
                breakdown.push({
                    sellDate: trade.date,
                    quantitySold: trade.quantity,
                    sellPrice: trade.price,
                    buyDate: trade.date,
                    buyPrice: averageCost,
                    gain: gain
                });

                totalShares -= trade.quantity;
                totalCost -= costOfSoldShares;

                // Average cost remains the same after a sell in Weighted Average method
                // unless totalShares goes to 0
                if (totalShares <= 0.000001) {
                    totalShares = 0;
                    totalCost = 0;
                    averageCost = 0;
                }
            }
        }

        return {
            symbol: trades[0]?.symbol || '',
            currency: trades[0]?.currency || 'EUR',
            averageCost,
            totalCostBasis: totalCost,
            remainingShares: totalShares,
            realizedGain,
            breakdown
        };
    }

    /**
     * Calculates the summary for the entire portfolio (all symbols).
     * Returns results in NATIVE currency for display, but includes EUR totals for aggregation.
     */
    calculatePortfolioSummary(
        trades: StockTrade[],
        method: 'FIFO' | 'WeightedAverage',
        targetCurrency: 'EUR' | 'USD' = 'EUR',
        exchangeRates: { date: Date; rate: number; currency: string }[] = []
    ): CalculationResult[] {
        const results: CalculationResult[] = [];
        const tradesBySymbol: Record<string, { native: StockTrade[], eur: StockTrade[] }> = {};

        for (const trade of trades) {
            if (!tradesBySymbol[trade.symbol]) {
                tradesBySymbol[trade.symbol] = { native: [], eur: [] };
            }

            // 1. Native Trade (Original) - Just push as is
            tradesBySymbol[trade.symbol].native.push(trade);

            // 2. EUR Trade (Converted)
            let eurTrade = { ...trade };
            let converted = false;

            if (trade.currency === 'EUR') {
                converted = true; // Already EUR
            } else if (exchangeRates.length > 0) {
                // Try conversion
                const tradeDate = new Date(trade.date).getTime();
                let applicableRate = exchangeRates[0]?.rate; // Default to first

                for (const rateObj of exchangeRates) {
                    if (rateObj.date.getTime() <= tradeDate) {
                        applicableRate = rateObj.rate;
                    } else {
                        break;
                    }
                }

                if (applicableRate) {
                    // Assuming rate is EUR/USD
                    eurTrade.price = trade.price * applicableRate;
                    eurTrade.fees = trade.fees * applicableRate;
                    eurTrade.commission = trade.commission * applicableRate;
                    eurTrade.currency = 'EUR';
                    converted = true;
                }
            }

            // If converted (or already EUR), push to eur list
            // If not converted, we technically have a "mixed" or "incorrect" EUR list, 
            // but for aggregation purposes we might just have to accept the raw value (1:1 error) or 0.
            // Pushing it anyway ensures share counts match.
            tradesBySymbol[trade.symbol].eur.push(eurTrade);
        }

        for (const symbol in tradesBySymbol) {
            const { native, eur } = tradesBySymbol[symbol];

            // Calculate Native (For Display)
            let nativeResult: CalculationResult;
            if (method === 'WeightedAverage') {
                nativeResult = this.calculateWeightedAverage(native);
            } else {
                nativeResult = this.calculateFIFO(native);
            }

            // Calculate EUR (For Totals)
            let eurResult: CalculationResult;
            if (method === 'WeightedAverage') {
                eurResult = this.calculateWeightedAverage(eur);
            } else {
                eurResult = this.calculateFIFO(eur);
            }

            results.push({
                ...nativeResult,
                // Ensure currency is set from Native result
                currency: nativeResult.currency,
                // Attach EUR totals
                totalCostBasisEur: eurResult.totalCostBasis,
                realizedGainEur: eurResult.realizedGain
            });
        }

        return results;
    }
}

export const portfolioService = new PortfolioService();
