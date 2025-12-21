const API_URL = "http://localhost:4000";

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
