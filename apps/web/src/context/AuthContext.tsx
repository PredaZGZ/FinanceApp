import { createContext, useContext, useEffect, useState, type ReactNode } from "react";
import { fetchAPI, postAPI } from "@/lib/api";

type User = {
    id: string;
    email: string;
    createdAt: string;
    name?: string;
    profileImage?: string;
    role?: string;
};

type AuthContextType = {
    user: User | null;
    isLoading: boolean;
    refetchUser: () => Promise<void>;
    logout: () => Promise<void>;
};

const AuthContext = createContext<AuthContextType | null>(null);

export function AuthProvider({ children }: { children: ReactNode }) {
    const [user, setUser] = useState<User | null>(null);
    const [isLoading, setIsLoading] = useState(true);

    const refetchUser = async () => {
        try {
            const userData = await fetchAPI<User>("/auth/me");
            setUser(userData);
        } catch (error) {
            setUser(null);
        } finally {
            setIsLoading(false);
        }
    };

    useEffect(() => {
        refetchUser();
    }, []);

    const logout = async () => {
        try {
            await postAPI("/auth/logout", {});
            setUser(null);
        } catch (error) {
            console.error("Logout failed", error);
        }
    };

    return (
        <AuthContext.Provider value={{ user, isLoading, refetchUser, logout }}>
            {children}
        </AuthContext.Provider>
    );
}

export function useAuth() {
    const context = useContext(AuthContext);
    if (!context) {
        throw new Error("useAuth must be used within an AuthProvider");
    }
    return context;
}
