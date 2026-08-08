import { UserRound } from "lucide-react";
import type { AvatarColor, AvatarIcon, User } from "@/components/common/auth-context";
import { avatarColors, avatarIcons } from "@/components/common/avatar-options";
import { cn } from "@/lib/utils";

type UserAvatarProps = {
    user?: Pick<User, "name" | "email" | "avatarIcon" | "avatarColor"> | null;
    icon?: AvatarIcon;
    color?: AvatarColor;
    className?: string;
    iconClassName?: string;
};

export function UserAvatar({ user, icon, color, className, iconClassName }: UserAvatarProps) {
    const selectedIcon = icon ?? user?.avatarIcon ?? "user-round";
    const selectedColor = color ?? user?.avatarColor ?? "slate";
    const Icon = avatarIcons.find((item) => item.value === selectedIcon)?.icon ?? UserRound;
    const colorClass = avatarColors.find((item) => item.value === selectedColor)?.className ?? avatarColors[0].className;
    const accessibleName = user?.name || user?.email || "User";

    return (
        <span
            role="img"
            aria-label={`Avatar of ${accessibleName}`}
            className={cn("inline-flex shrink-0 items-center justify-center rounded-xl shadow-sm", colorClass, className)}
        >
            <Icon aria-hidden="true" className={cn("h-5 w-5", iconClassName)} />
        </span>
    );
}
