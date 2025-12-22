import { fetchAPI } from "../api";

export interface PortfolioSummary {
    currency: string;
    method: string;
    totalRealizedGain: number;
    totalCostBasis: number;
    holdings: Holding[];
}

export interface Holding {
    symbol: string;
    realizedGain: number;
    remainingShares: number;
    totalCostBasis: number;
    averageCost: number;
    breakdown?: BreakdownItem[];
}

export interface BreakdownItem {
    sellDate: string;
    quantitySold: number;
    sellPrice: number;
    buyDate: string;
    buyPrice: number;
    gain: number;
}

export const portfolioService = {
    getSummary: async (method: string = 'FIFO'): Promise<PortfolioSummary> => {
        return fetchAPI(`/portfolio/summary?method=${method}`);
    },

    getAnalysis: async (symbol: string, method: string = 'FIFO'): Promise<Holding> => {
        return fetchAPI(`/portfolio/analysis/${symbol}?method=${method}`);
    }
};
