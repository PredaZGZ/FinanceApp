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
    currency: string;
    realizedGain: number;
    remainingShares: number;
    totalCostBasis: number;
    averageCost: number;
    conversionComplete?: boolean;
    breakdown?: BreakdownItem[];
}

export interface PortfolioSummary {
    currency: string;
    method: string;
    totalRealizedGain: number | null;
    totalCostBasis: number | null;
    conversionComplete: boolean;
    holdings: Holding[];
}
