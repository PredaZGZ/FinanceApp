import { CalculationResult, StockTrade, TradeMatch } from './portfolio.types';

export class PortfolioService {
    /**
     * Calculates the cost basis and realized gains using FIFO method.
     * Assumes trades are for a single symbol. Currency is the price currency,
     * not a separate holding: the same asset may be bought in USD and sold in EUR.
     */
    calculateFIFO(trades: StockTrade[]): CalculationResult {
        // Sort trades by date ascending
        const sortedTrades = [...trades].sort((a, b) =>
            new Date(a.date).getTime() - new Date(b.date).getTime()
            || (a.side === 'Buy' ? -1 : 1) - (b.side === 'Buy' ? -1 : 1)
        );

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
                const available = buyQueue.reduce((sum, lot) => sum + lot.remainingQuantity, 0);
                if (trade.quantity > available + 0.000001) {
                    throw new Error(`Cannot sell ${trade.quantity} ${trade.symbol}; only ${available} available`);
                }
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
            isin: trades[0]?.isin,
            name: trades[0]?.name,
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
        const sortedTrades = [...trades].sort((a, b) =>
            new Date(a.date).getTime() - new Date(b.date).getTime()
            || (a.side === 'Buy' ? -1 : 1) - (b.side === 'Buy' ? -1 : 1)
        );

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
                if (trade.quantity > totalShares + 0.000001) {
                    throw new Error(`Cannot sell ${trade.quantity} ${trade.symbol}; only ${totalShares} available`);
                }
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
            isin: trades[0]?.isin,
            name: trades[0]?.name,
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
        const tradesByPosition: Record<string, { native: StockTrade[], eur: StockTrade[], conversionComplete: boolean }> = {};

        for (const trade of trades) {
            // A position is identified by its asset. The transaction currency
            // can change between operations (for example, buy in USD and sell in EUR).
            const positionKey = trade.symbol;
            if (!tradesByPosition[positionKey]) {
                tradesByPosition[positionKey] = { native: [], eur: [], conversionComplete: true };
            }

            // 1. Native Trade (Original) - Just push as is
            tradesByPosition[positionKey].native.push(trade);

            // 2. EUR Trade (Converted)
            let eurTrade = { ...trade };
            if (trade.currency === 'EUR') {
            } else if (exchangeRates.length > 0) {
                const tradeDate = new Date(trade.date).getTime();
                const applicableRate = exchangeRates
                    .filter(rate => rate.currency === trade.currency && rate.date.getTime() <= tradeDate)
                    .at(-1)?.rate;

                if (applicableRate) {
                    eurTrade.price = trade.price * applicableRate;
                    eurTrade.fees = trade.fees * applicableRate;
                    eurTrade.commission = trade.commission * applicableRate;
                    eurTrade.currency = 'EUR';
                } else {
                    tradesByPosition[positionKey].conversionComplete = false;
                }
            } else {
                tradesByPosition[positionKey].conversionComplete = false;
            }

            if (trade.currency === 'EUR' || eurTrade.currency === 'EUR') {
                tradesByPosition[positionKey].eur.push(eurTrade);
            }
        }

        for (const positionKey in tradesByPosition) {
            const { native, eur, conversionComplete } = tradesByPosition[positionKey];

            // Calculate each native currency independently so mixed-currency
            // transactions never compare prices from different currencies.
            const nativeCurrencies = new Set(native.map(trade => trade.currency));
            const nativeByCurrency = nativeCurrencies.size === 1
                ? [method === 'WeightedAverage'
                    ? this.calculateWeightedAverage(native)
                    : this.calculateFIFO(native)]
                : [];

            const nativeResult: CalculationResult = nativeCurrencies.size === 1
                ? {
                    ...nativeByCurrency[0],
                    breakdown: nativeByCurrency[0].breakdown ?? [],
                }
                : {
                    // A position can be traded in multiple currencies. Keep the
                    // share count visible, but do not invent a monetary total
                    // by adding USD and EUR cost bases together.
                    symbol: native[0]?.symbol || '',
                    isin: native[0]?.isin,
                    name: native[0]?.name,
                    currency: targetCurrency,
                    realizedGain: 0,
                    remainingShares: native.reduce(
                        (sum, trade) => sum + (trade.side === 'Buy' ? trade.quantity : -trade.quantity),
                        0
                    ),
                    totalCostBasis: 0,
                    averageCost: 0,
                    breakdown: [],
            };
            nativeResult.averageCost = nativeResult.remainingShares > 0
                ? nativeResult.totalCostBasis / nativeResult.remainingShares
                : 0;

            // Calculate EUR (For Totals)
            const eurResult = conversionComplete
                ? (method === 'WeightedAverage' ? this.calculateWeightedAverage(eur) : this.calculateFIFO(eur))
                : null;

            results.push({
                ...nativeResult,
                // Ensure currency is set from Native result
                currency: nativeResult.currency,
                // Attach EUR totals
                totalCostBasisEur: eurResult?.totalCostBasis,
                realizedGainEur: eurResult?.realizedGain,
                conversionComplete,
            });
        }

        return results;
    }
}

export const portfolioService = new PortfolioService();
