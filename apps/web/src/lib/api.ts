const API_URL = import.meta.env.VITE_API_URL || "http://localhost:4000";

export async function fetchAPI<T>(endpoint: string, options?: RequestInit): Promise<T> {
    const headers = {
        "Content-Type": "application/json",
        ...options?.headers,
    } as Record<string, string>;

    if (options?.body instanceof FormData) {
        delete headers["Content-Type"];
    }

    const response = await fetch(`${API_URL}${endpoint}`, {
        credentials: "include",
        ...options,
        headers,
    });

    if (!response.ok) {
        throw new Error(`API Error: ${response.statusText}`);
    }

    return response.json();
}

// eslint-disable-next-line @typescript-eslint/no-explicit-any
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

export async function fetchPrices(symbols: string[]): Promise<Record<string, { price: number; currency: string }>> {
    if (!symbols.length) return {};
    const query = symbols.join(",");
    return fetchAPI<Record<string, { price: number; currency: string }>>(
        `/prices/batch?symbols=${encodeURIComponent(query)}`
    );
}

