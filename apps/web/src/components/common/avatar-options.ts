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
    { value: "user-round", label: "Persona", icon: UserRound },
    { value: "circle-user", label: "Perfil", icon: CircleUserRound },
    { value: "badge-euro", label: "Euro", icon: BadgeEuro },
    { value: "landmark", label: "Banco", icon: Landmark },
    { value: "wallet-cards", label: "Cartera", icon: WalletCards },
    { value: "chart-no-axes-combined", label: "Inversión", icon: ChartNoAxesCombined },
];

export const avatarColors: Array<{ value: AvatarColor; label: string; className: string }> = [
    { value: "slate", label: "Grafito", className: "bg-slate-700 text-white" },
    { value: "indigo", label: "Índigo", className: "bg-indigo-600 text-white" },
    { value: "emerald", label: "Esmeralda", className: "bg-emerald-600 text-white" },
    { value: "amber", label: "Ámbar", className: "bg-amber-500 text-slate-950" },
    { value: "rose", label: "Rosa", className: "bg-rose-600 text-white" },
    { value: "sky", label: "Cielo", className: "bg-sky-600 text-white" },
];
