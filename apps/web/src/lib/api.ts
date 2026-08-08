const API_URL = import.meta.env.VITE_API_URL || "http://localhost:3001";

const TOKEN_KEY = 'auth_token';

export function setToken(token: string) {
    localStorage.setItem(TOKEN_KEY, token);
}

export function getToken(): string | null {
    return localStorage.getItem(TOKEN_KEY);
}

export function removeToken() {
    localStorage.removeItem(TOKEN_KEY);
}

export async function fetchAPI<T>(endpoint: string, options?: RequestInit): Promise<T> {
    const token = getToken();
    const headers = {
        "Content-Type": "application/json",
        ...(token ? { "Authorization": `Bearer ${token}` } : {}),
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
        const payload = await response.json().catch(() => null) as { error?: string } | null;
        throw new Error(payload?.error || `API Error: ${response.status} ${response.statusText}`);
    }

    if (response.status === 204) return undefined as T;
    return response.json() as Promise<T>;
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
