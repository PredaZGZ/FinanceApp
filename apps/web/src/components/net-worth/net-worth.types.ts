
export interface Asset {
    id: string;
    name: string;
    description?: string;
    category?: string;
    originalCost: number;
    originalCurrency: string;
    notes?: string;
    isSold: boolean;
    soldAt?: string | null;
    createdAt: string;
    updatedAt: string;
    currentValue?: number;
    lastValuationDate?: string;
}

export interface Valuation {
    id: string;
    assetId: string;
    value: number;
    currency: string;
    valuedAt: string;
    source?: string;
    createdAt: string;
}

export interface Trend {
    date: string;
    totalValue: number;
}

export interface CategoryBreakdown {
    category: string;
    currency: string;
    totalValue: number;
    count: number;
}

// Updated to match backend response
export interface NetWorthSummary {
    totalCurrentNetWorth: number;
    countActive: number;
    countSold: number;
    breakdownByCategory: CategoryBreakdown[];
    // Computed/UI specific fields (optional or mapped)
    totalAssets?: number;
    totalLiabilities?: number;
    change24h?: number;
    change24hPercent?: number;
    currency?: string;
    totalsByCurrency: Record<string, number>;
}

export interface CreateAssetRequest {
    name: string;
    description?: string;
    category?: string;
    originalCost: number;
    originalCurrency?: string;
    notes?: string;
    initialValuationValue?: number;
    initialValuationDate?: string;
}

export interface UpdateAssetRequest {
    name?: string;
    description?: string;
    category?: string;
    originalCost?: number;
    originalCurrency?: string;
    notes?: string;
    isSold?: boolean;
    soldAt?: string | null;
}

export interface CreateValuationRequest {
    value: number;
    valuedAt?: string;
    currency?: string;
    source?: string;
}
