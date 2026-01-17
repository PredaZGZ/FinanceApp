import type { PortfolioSummary, Holding } from "@/components/portfolio/portfolio.types";

const API_URL = import.meta.env.VITE_API_URL || "http://localhost:4000";

export async function fetchAPI<T>(endpoint: string, options?: RequestInit): Promise<T> {
    const response = await fetch(`${API_URL}${endpoint}`, {
        ...options,
        headers: {
            "Content-Type": "application/json",
            ...options?.headers,
        },
    });

    if (!response.ok) {
        throw new Error(`API Error: ${response.statusText}`);
    }

    return response.json();
}

export async function postAPI<T>(endpoint: string, body: any, options?: RequestInit): Promise<T> {
    const isFormData = body instanceof FormData;
    const headers = { ...options?.headers } as Record<string, string>;

    if (isFormData) {
        // Let browser set Content-Type for FormData
        delete headers["Content-Type"];
    }

    return fetchAPI<T>(endpoint, {
        ...options,
        method: "POST",
        headers: isFormData ? headers : { "Content-Type": "application/json", ...headers },
        body: isFormData ? body : JSON.stringify(body),
    });
}

export const portfolioApi = {
    getSummary: async (method: string = 'FIFO'): Promise<PortfolioSummary> => {
        return fetchAPI<PortfolioSummary>(`/portfolio/summary?method=${method}`);
    },

    getAnalysis: async (symbol: string, method: string = 'FIFO'): Promise<Holding> => {
        return fetchAPI<Holding>(`/portfolio/analysis/${symbol}?method=${method}`);
    }
};

import type { Asset, CreateAssetRequest, UpdateAssetRequest, Valuation, CreateValuationRequest, NetWorthSummary } from "@/components/net-worth/net-worth.types";

export const netWorthApi = {
    getAssets: async (query?: any): Promise<{ data: Asset[], meta: any }> => {
        const queryString = query ? '?' + new URLSearchParams(query).toString() : '';
        return fetchAPI<{ data: Asset[], meta: any }>(`/networth/assets${queryString}`);
    },

    createAsset: async (data: CreateAssetRequest): Promise<Asset> => {
        return postAPI<Asset>('/networth/assets', data);
    },

    getAssetById: async (id: string): Promise<Asset> => {
        return fetchAPI<Asset>(`/networth/assets/${id}`);
    },

    updateAsset: async (id: string, data: UpdateAssetRequest): Promise<Asset> => {
        return fetchAPI<Asset>(`/networth/assets/${id}`, {
            method: 'PUT',
            body: JSON.stringify(data)
        });
    },

    deleteAsset: async (id: string): Promise<void> => {
        return fetchAPI<void>(`/networth/assets/${id}`, {
            method: 'DELETE'
        });
    },

    revalueAsset: async (id: string, data: CreateValuationRequest): Promise<Valuation> => {
        return postAPI<Valuation>(`/networth/assets/${id}/valuations`, data);
    },

    getAssetValuations: async (id: string): Promise<Valuation[]> => {
        return fetchAPI<Valuation[]>(`/networth/assets/${id}/valuations`);
    },

    getSummary: async (): Promise<NetWorthSummary> => {
        return fetchAPI<NetWorthSummary>('/networth/summary');
    }
};
