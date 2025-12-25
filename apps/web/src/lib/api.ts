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
