import { createContext, useContext } from "react";

export type User = {
    id: string;
    email: string;
    createdAt: string;
    updatedAt: string;
    name: string | null;
    avatarIcon: AvatarIcon;
    avatarColor: AvatarColor;
    locale: "es-ES" | "en-US" | "en-GB";
    timezone: string;
    preferredCurrency: "EUR" | "USD";
};

export type AvatarIcon = "user-round" | "circle-user" | "badge-euro" | "landmark" | "wallet-cards" | "chart-no-axes-combined";
export type AvatarColor = "slate" | "indigo" | "emerald" | "amber" | "rose" | "sky";

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
