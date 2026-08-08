import { useEffect, useState, type ReactNode } from "react";
import { fetchAPI, postAPI, removeToken } from "@/lib/api";
import { AuthContext, type User } from "@/components/common/auth-context";

export function AuthProvider({ children }: { children: ReactNode }) {
    const [user, setUser] = useState<User | null>(null);
    const [isLoading, setIsLoading] = useState(true);

    const refetchUser = async () => {
        try {
            const userData = await fetchAPI<User>("/auth/me");
            setUser(userData);
        } catch {
            setUser(null);
        } finally {
            setIsLoading(false);
        }
    };

    useEffect(() => {
        let active = true;
        fetchAPI<User>("/auth/me")
            .then((userData) => { if (active) setUser(userData); })
            .catch(() => { if (active) setUser(null); })
            .finally(() => { if (active) setIsLoading(false); });
        return () => { active = false; };
    }, []);

    const logout = async () => {
        try {
            await postAPI("/auth/logout", {});
            removeToken();
            setUser(null);
        } catch (error) {
            removeToken();
            setUser(null);
            console.error("Logout failed", error);
        }
    };

    return (
        <AuthContext.Provider value={{ user, isLoading, refetchUser, logout }}>
            {children}
        </AuthContext.Provider>
    );
}
