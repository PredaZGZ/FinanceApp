export interface StockTrade {
    id?: string;
    date: Date;
    symbol: string;
    isin?: string | null;
    name?: string | null;
    currency: string;
    quantity: number;
    price: number;
    side: 'Buy' | 'Sell';
    fees: number;
    commission: number;
    type?: string;
    costBasisOverride?: number | null;
}

export interface TradeMatch {
    sellDate: Date;
    quantitySold: number;
    sellPrice: number;
    buyDate: Date;
    buyPrice: number;
    gain: number;
}

export interface CalculationResult {
    symbol: string;
    isin?: string | null;
    name?: string | null;
    currency: string;
    realizedGain: number;     // Total profit/loss from sold shares
    remainingShares: number;  // Shares currently held
    averageCost: number;      // Per share cost basis
    totalCostBasis: number;   // Total value of held shares at cost
    realizedGainEur?: number; // Converted for aggregation
    totalCostBasisEur?: number; // Converted for aggregation
    conversionComplete?: boolean;
    breakdown?: TradeMatch[];  // (FIFO only) Which buy matched which sell
}
