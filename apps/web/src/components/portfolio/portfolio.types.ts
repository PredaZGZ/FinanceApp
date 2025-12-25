export interface BreakdownItem {
    sellDate: string;
    quantitySold: number;
    sellPrice: number;
    buyDate: string;
    buyPrice: number;
    gain: number;
}

export interface Holding {
    symbol: string;
    realizedGain: number;
    remainingShares: number;
    totalCostBasis: number;
    averageCost: number;
    breakdown?: BreakdownItem[];
}

export interface PortfolioSummary {
    currency: string;
    method: string;
    totalRealizedGain: number;
    totalCostBasis: number;
    holdings: Holding[];
}
