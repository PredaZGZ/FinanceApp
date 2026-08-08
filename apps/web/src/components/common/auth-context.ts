import { createContext, useContext } from "react";

export type User = {
    id: string;
    email: string;
    createdAt: string;
    name?: string;
    profileImage?: string;
    role?: string;
};

export type AuthContextType = {
    user: User | null;
    isLoading: boolean;
    refetchUser: () => Promise<void>;
    logout: () => Promise<void>;
};

export const AuthContext = createContext<AuthContextType | null>(null);

export function useAuth() {
    const context = useContext(AuthContext);
    if (!context) throw new Error("useAuth must be used within an AuthProvider");
    return context;
}
