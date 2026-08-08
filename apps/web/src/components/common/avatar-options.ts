import {
    BadgeEuro,
    ChartNoAxesCombined,
    CircleUserRound,
    Landmark,
    UserRound,
    WalletCards,
} from "lucide-react";
import type { AvatarColor, AvatarIcon } from "@/components/common/auth-context";

export const avatarIcons: Array<{ value: AvatarIcon; label: string; icon: typeof UserRound }> = [
    { value: "user-round", label: "Person", icon: UserRound },
    { value: "circle-user", label: "Profile", icon: CircleUserRound },
    { value: "badge-euro", label: "Euro", icon: BadgeEuro },
    { value: "landmark", label: "Bank", icon: Landmark },
    { value: "wallet-cards", label: "Wallet", icon: WalletCards },
    { value: "chart-no-axes-combined", label: "Investment", icon: ChartNoAxesCombined },
];

export const avatarColors: Array<{ value: AvatarColor; label: string; className: string }> = [
    { value: "slate", label: "Slate", className: "bg-slate-700 text-white" },
    { value: "indigo", label: "Indigo", className: "bg-indigo-600 text-white" },
    { value: "emerald", label: "Emerald", className: "bg-emerald-600 text-white" },
    { value: "amber", label: "Amber", className: "bg-amber-500 text-slate-950" },
    { value: "rose", label: "Rose", className: "bg-rose-600 text-white" },
    { value: "sky", label: "Sky", className: "bg-sky-600 text-white" },
];
