import { CalculationResult, StockTrade, TradeMatch } from './portfolio.types';

export class PortfolioService {
    /**
     * Calculates the cost basis and realized gains using FIFO method.
     * Assumes trades are for a single symbol.
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
                        buyPrice: buyLot.price, // Display original price, not adjusted cost basis, for clarity? Or adjusted? Usually original price is better for "Buy Price" field, but gain reflects costs.
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
                    buyDate: trade.date, // For Weighted Average, we don't have a specific buy date. Using sell date or "Various" logic.
                    buyPrice: averageCost, // The average cost at the time of sale
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
            averageCost,
            totalCostBasis: totalCost,
            remainingShares: totalShares,
            realizedGain,
            breakdown
        };
    }

    /**
     * Calculates the summary for the entire portfolio (all symbols).
     * If exchangeRates are provided, converts all non-targetCurrency trades to targetCurrency.
     */
    calculatePortfolioSummary(
        trades: StockTrade[],
        method: 'FIFO' | 'WeightedAverage',
        targetCurrency: 'EUR' | 'USD' = 'EUR',
        exchangeRates: { date: Date; rate: number; currency: string }[] = []
    ): CalculationResult[] {
        // Group trades by symbol
        const tradesBySymbol: Record<string, StockTrade[]> = {};

        for (const trade of trades) {
            // Convert trade if needed
            let processedTrade = { ...trade };

            // Logic: If trade is USD and target is EUR, we need a rate (EUR/USD or USD/EUR?)
            // The DB stores "conversionRate" which the script says is EUR/USD (e.g. 0.9 EUR per 1 USD).
            // Script logic: conversionRate = eurCost / topUp.value (USD). So Rate is EUR per USD.
            // So USD * Rate = EUR.

            if (trade.currency !== targetCurrency && exchangeRates.length > 0) {
                // Find applicable rate: Latest rate BEFORE or ON trade date
                const tradeDate = new Date(trade.date).getTime();
                // Rates are sorted ASC
                let applicableRate = exchangeRates[0]?.rate; // Default to first if no prior

                for (const rateObj of exchangeRates) {
                    if (rateObj.date.getTime() <= tradeDate) {
                        applicableRate = rateObj.rate;
                    } else {
                        break; // Future rate, stop
                    }
                }

                if (applicableRate) {
                    // Assuming rate is Target/Source (e.g. EUR/USD)
                    // If target is EUR and trade is USD, we multiply by rate.
                    if (targetCurrency === 'EUR' && trade.currency === 'USD') {
                        processedTrade.price = trade.price * applicableRate;
                        processedTrade.fees = trade.fees * applicableRate;
                        processedTrade.commission = trade.commission * applicableRate;
                        // processedTrade.currency = 'EUR'; // Conceptually
                    }
                    // Add other pairs if needed
                }
            } else if (trade.currency !== targetCurrency && exchangeRates.length === 0) {
                // No rates available, skip or keep as is? 
                // For now, if we can't convert, we might exclude or just process as is (mixed currency error).
                // Let's process as is but it will be mixed values.
            }

            if (!tradesBySymbol[processedTrade.symbol]) {
                tradesBySymbol[processedTrade.symbol] = [];
            }
            tradesBySymbol[processedTrade.symbol].push(processedTrade);
        }

        const results: CalculationResult[] = [];
        for (const symbol in tradesBySymbol) {
            const symbolTrades = tradesBySymbol[symbol];
            if (method === 'WeightedAverage') {
                results.push(this.calculateWeightedAverage(symbolTrades));
            } else {
                results.push(this.calculateFIFO(symbolTrades));
            }
        }

        return results;
    }
}

export const portfolioService = new PortfolioService();
