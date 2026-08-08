import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { Check, ChevronDown, CircleHelp, Laptop, LogOut, Moon, Settings, Sun } from "lucide-react";
import { useAuth } from "@/components/common/auth-context";
import { useTheme } from "@/components/common/ThemeProvider";
import { UserAvatar } from "@/components/common/UserAvatar";
import {
    DropdownMenu,
    DropdownMenuContent,
    DropdownMenuItem,
    DropdownMenuLabel,
    DropdownMenuRadioGroup,
    DropdownMenuRadioItem,
    DropdownMenuSeparator,
    DropdownMenuSub,
    DropdownMenuSubContent,
    DropdownMenuSubTrigger,
    DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { cn } from "@/lib/utils";

type AccountMenuProps = {
    onNavigate?: () => void;
};

export function AccountMenu({ onNavigate }: AccountMenuProps) {
    const { user, logout } = useAuth();
    const { theme, setTheme } = useTheme();
    const navigate = useNavigate();
    const [isOpen, setIsOpen] = useState(false);
    const [isLoggingOut, setIsLoggingOut] = useState(false);

    const goTo = (path: string) => {
        navigate(path);
        onNavigate?.();
    };

    const handleLogout = async () => {
        setIsLoggingOut(true);
        await logout();
        onNavigate?.();
        navigate("/login", { replace: true });
    };

    return (
        <DropdownMenu open={isOpen} onOpenChange={setIsOpen}>
            <DropdownMenuTrigger asChild>
                <button
                    type="button"
                    className="group flex w-full items-center gap-3 rounded-xl border border-sidebar-border bg-sidebar-accent/40 p-2.5 text-left outline-none transition-colors hover:bg-sidebar-accent focus-visible:ring-2 focus-visible:ring-sidebar-ring data-[state=open]:bg-sidebar-accent"
                    aria-label="Open account menu"
                >
                    <UserAvatar user={user} className="h-10 w-10" />
                    <span className="min-w-0 flex-1">
                        <span className="block truncate text-sm font-semibold text-sidebar-foreground">
                            {user?.name || "Your account"}
                        </span>
                        <span className="block truncate text-xs text-sidebar-foreground/60">{user?.email}</span>
                    </span>
                    <ChevronDown className="h-4 w-4 shrink-0 text-sidebar-foreground/50 transition-transform group-data-[state=open]:rotate-180" />
                </button>
            </DropdownMenuTrigger>
            <DropdownMenuContent
                side="top"
                align="start"
                sideOffset={10}
                collisionPadding={12}
                className="w-[var(--radix-dropdown-menu-trigger-width)] min-w-56 rounded-xl p-1.5 shadow-xl"
            >
                <DropdownMenuLabel className="flex items-center gap-3 px-2 py-2.5 font-normal">
                    <UserAvatar user={user} className="h-9 w-9 rounded-lg" iconClassName="h-4 w-4" />
                    <span className="min-w-0">
                        <span className="block truncate text-sm font-semibold">{user?.name || "Your account"}</span>
                        <span className="block truncate text-xs text-muted-foreground">{user?.email}</span>
                    </span>
                </DropdownMenuLabel>
                <DropdownMenuSeparator />
                <DropdownMenuItem onSelect={() => goTo("/settings")} className="cursor-pointer py-2">
                    <Settings />
                    Account settings
                </DropdownMenuItem>
                <DropdownMenuSub>
                    <DropdownMenuSubTrigger className="cursor-pointer py-2">
                        {theme === "dark" ? <Moon /> : theme === "light" ? <Sun /> : <Laptop />}
                        Appearance
                    </DropdownMenuSubTrigger>
                    <DropdownMenuSubContent className="min-w-40 rounded-xl p-1.5">
                        <DropdownMenuRadioGroup value={theme} onValueChange={(value) => setTheme(value as "light" | "dark" | "system")}>
                            {[
                                { value: "light", label: "Light", icon: Sun },
                                { value: "dark", label: "Dark", icon: Moon },
                                { value: "system", label: "System", icon: Laptop },
                            ].map((option) => (
                                <DropdownMenuRadioItem key={option.value} value={option.value} className="cursor-pointer py-2 pl-2 pr-8 [&>span]:hidden">
                                    <option.icon />
                                    {option.label}
                                    <Check className={cn("ml-auto h-4 w-4", theme === option.value ? "opacity-100" : "opacity-0")} />
                                </DropdownMenuRadioItem>
                            ))}
                        </DropdownMenuRadioGroup>
                    </DropdownMenuSubContent>
                </DropdownMenuSub>
                <DropdownMenuItem onSelect={() => goTo("/support")} className="cursor-pointer py-2">
                    <CircleHelp />
                    Help & support
                </DropdownMenuItem>
                <DropdownMenuSeparator />
                <DropdownMenuItem
                    disabled={isLoggingOut}
                    onSelect={(event) => {
                        event.preventDefault();
                        void handleLogout();
                    }}
                    className="cursor-pointer py-2 text-destructive focus:bg-destructive/10 focus:text-destructive"
                >
                    <LogOut />
                    {isLoggingOut ? "Signing out…" : "Sign out"}
                </DropdownMenuItem>
            </DropdownMenuContent>
        </DropdownMenu>
    );
}
