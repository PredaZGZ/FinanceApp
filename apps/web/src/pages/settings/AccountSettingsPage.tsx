import { useState, type FormEvent } from "react";
import { Check, Eye, EyeOff, KeyRound, LoaderCircle, ShieldCheck, UserRoundCog } from "lucide-react";
import { useAuth, type AvatarColor, type AvatarIcon } from "@/components/common/auth-context";
import { UserAvatar } from "@/components/common/UserAvatar";
import { avatarColors, avatarIcons } from "@/components/common/avatar-options";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { fetchAPI, setToken } from "@/lib/api";
import { cn } from "@/lib/utils";

type Notice = { type: "success" | "error"; text: string } | null;

const timezones = [
    "Europe/Madrid",
    "Europe/London",
    "Europe/Paris",
    "America/New_York",
    "America/Los_Angeles",
    "America/Mexico_City",
    "America/Argentina/Buenos_Aires",
    "Asia/Tokyo",
];

function StatusNotice({ notice }: { notice: Notice }) {
    if (!notice) return null;
    return (
        <div
            role={notice.type === "error" ? "alert" : "status"}
            className={cn(
                "rounded-lg border px-4 py-3 text-sm",
                notice.type === "success"
                    ? "border-emerald-500/30 bg-emerald-500/10 text-emerald-700 dark:text-emerald-300"
                    : "border-destructive/30 bg-destructive/10 text-destructive",
            )}
        >
            {notice.text}
        </div>
    );
}

export default function AccountSettingsPage() {
    const { user, refetchUser } = useAuth();
    const [profile, setProfile] = useState({
        name: user?.name ?? "",
        email: user?.email ?? "",
        avatarIcon: user?.avatarIcon ?? "user-round" as AvatarIcon,
        avatarColor: user?.avatarColor ?? "slate" as AvatarColor,
        locale: user?.locale ?? "es-ES" as "es-ES" | "en-US" | "en-GB",
        timezone: user?.timezone ?? "Europe/Madrid",
        preferredCurrency: user?.preferredCurrency ?? "EUR" as "EUR" | "USD",
    });
    const [passwords, setPasswords] = useState({ currentPassword: "", newPassword: "", confirmPassword: "" });
    const [showPasswords, setShowPasswords] = useState(false);
    const [profileNotice, setProfileNotice] = useState<Notice>(null);
    const [passwordNotice, setPasswordNotice] = useState<Notice>(null);
    const [savingProfile, setSavingProfile] = useState(false);
    const [savingPassword, setSavingPassword] = useState(false);

    const saveProfile = async (event: FormEvent) => {
        event.preventDefault();
        setSavingProfile(true);
        setProfileNotice(null);
        try {
            await fetchAPI("/auth/profile", { method: "PATCH", body: JSON.stringify(profile) });
            await refetchUser();
            setProfileNotice({ type: "success", text: "Tu perfil y preferencias se han guardado." });
        } catch (error) {
            setProfileNotice({ type: "error", text: error instanceof Error ? error.message : "No se pudo guardar el perfil." });
        } finally {
            setSavingProfile(false);
        }
    };

    const savePassword = async (event: FormEvent) => {
        event.preventDefault();
        setPasswordNotice(null);
        if (passwords.newPassword !== passwords.confirmPassword) {
            setPasswordNotice({ type: "error", text: "Las contraseñas nuevas no coinciden." });
            return;
        }
        setSavingPassword(true);
        try {
            const response = await fetchAPI<{ token: string; message: string }>("/auth/change-password", {
                method: "POST",
                body: JSON.stringify({ currentPassword: passwords.currentPassword, newPassword: passwords.newPassword }),
            });
            setToken(response.token);
            setPasswords({ currentPassword: "", newPassword: "", confirmPassword: "" });
            setPasswordNotice({ type: "success", text: "Contraseña actualizada. El resto de sesiones se han cerrado." });
        } catch (error) {
            setPasswordNotice({ type: "error", text: error instanceof Error ? error.message : "No se pudo actualizar la contraseña." });
        } finally {
            setSavingPassword(false);
        }
    };

    const passwordChecks = [
        { label: "10 caracteres", valid: passwords.newPassword.length >= 10 },
        { label: "Una mayúscula", valid: /[A-Z]/.test(passwords.newPassword) },
        { label: "Una minúscula", valid: /[a-z]/.test(passwords.newPassword) },
        { label: "Un número", valid: /\d/.test(passwords.newPassword) },
    ];

    return (
        <div className="mx-auto w-full max-w-5xl space-y-8 px-4 py-8 sm:px-6 lg:px-8">
            <div className="space-y-2">
                <p className="text-sm font-medium text-muted-foreground">Cuenta</p>
                <h2 className="text-3xl font-bold tracking-tight">Configuración</h2>
                <p className="max-w-2xl text-muted-foreground">Gestiona cómo apareces en FinanceApp, tus preferencias regionales y la seguridad de tu cuenta.</p>
            </div>

            <form onSubmit={saveProfile} className="space-y-6">
                <Card className="overflow-hidden">
                    <CardHeader className="border-b bg-muted/30">
                        <div className="flex items-center gap-3">
                            <UserRoundCog className="h-5 w-5 text-muted-foreground" />
                            <div>
                                <CardTitle>Perfil</CardTitle>
                                <CardDescription>Tu identidad visible en la aplicación.</CardDescription>
                            </div>
                        </div>
                    </CardHeader>
                    <CardContent className="space-y-7 pt-6">
                        <div className="flex flex-col gap-5 sm:flex-row sm:items-center">
                            <UserAvatar icon={profile.avatarIcon} color={profile.avatarColor} className="h-20 w-20 rounded-2xl" iconClassName="h-9 w-9" />
                            <div>
                                <p className="font-semibold">Elige tu icono</p>
                                <p className="mb-3 text-sm text-muted-foreground">Se mostrará en el menú de tu cuenta.</p>
                                <div className="flex flex-wrap gap-2" role="radiogroup" aria-label="Icono de perfil">
                                    {avatarIcons.map(({ value, label, icon: Icon }) => (
                                        <button
                                            key={value}
                                            type="button"
                                            role="radio"
                                            aria-checked={profile.avatarIcon === value}
                                            aria-label={label}
                                            onClick={() => setProfile((current) => ({ ...current, avatarIcon: value }))}
                                            className={cn("grid h-10 w-10 place-items-center rounded-lg border transition-colors hover:bg-accent", profile.avatarIcon === value && "border-primary bg-primary text-primary-foreground")}
                                        >
                                            <Icon className="h-5 w-5" />
                                        </button>
                                    ))}
                                </div>
                            </div>
                        </div>
                        <div>
                            <Label className="mb-3 block">Color del avatar</Label>
                            <div className="flex flex-wrap gap-3" role="radiogroup" aria-label="Color del avatar">
                                {avatarColors.map(({ value, label, className }) => (
                                    <button
                                        key={value}
                                        type="button"
                                        role="radio"
                                        aria-checked={profile.avatarColor === value}
                                        aria-label={label}
                                        onClick={() => setProfile((current) => ({ ...current, avatarColor: value }))}
                                        className={cn("grid h-8 w-8 place-items-center rounded-full ring-offset-2 ring-offset-background transition-transform hover:scale-110", className, profile.avatarColor === value && "ring-2 ring-primary")}
                                    >
                                        {profile.avatarColor === value && <Check className="h-4 w-4" />}
                                    </button>
                                ))}
                            </div>
                        </div>
                        <div className="grid gap-5 md:grid-cols-2">
                            <div className="space-y-2">
                                <Label htmlFor="name">Nombre</Label>
                                <Input id="name" value={profile.name} onChange={(event) => setProfile((current) => ({ ...current, name: event.target.value }))} minLength={2} maxLength={100} required autoComplete="name" />
                            </div>
                            <div className="space-y-2">
                                <Label htmlFor="email">Correo electrónico</Label>
                                <Input id="email" type="email" value={profile.email} onChange={(event) => setProfile((current) => ({ ...current, email: event.target.value }))} required autoComplete="email" />
                            </div>
                        </div>
                    </CardContent>
                </Card>

                <Card>
                    <CardHeader>
                        <CardTitle>Preferencias regionales</CardTitle>
                        <CardDescription>Se usarán en fechas, importes y futuros resúmenes.</CardDescription>
                    </CardHeader>
                    <CardContent className="grid gap-5 md:grid-cols-3">
                        <div className="space-y-2">
                            <Label>Idioma y formato</Label>
                            <Select value={profile.locale} onValueChange={(value: "es-ES" | "en-US" | "en-GB") => setProfile((current) => ({ ...current, locale: value }))}>
                                <SelectTrigger><SelectValue /></SelectTrigger>
                                <SelectContent>
                                    <SelectItem value="es-ES">Español (España)</SelectItem>
                                    <SelectItem value="en-US">English (US)</SelectItem>
                                    <SelectItem value="en-GB">English (UK)</SelectItem>
                                </SelectContent>
                            </Select>
                        </div>
                        <div className="space-y-2">
                            <Label>Zona horaria</Label>
                            <Select value={profile.timezone} onValueChange={(timezone) => setProfile((current) => ({ ...current, timezone }))}>
                                <SelectTrigger><SelectValue /></SelectTrigger>
                                <SelectContent>{timezones.map((timezone) => <SelectItem key={timezone} value={timezone}>{timezone.replaceAll("_", " ")}</SelectItem>)}</SelectContent>
                            </Select>
                        </div>
                        <div className="space-y-2">
                            <Label>Moneda principal</Label>
                            <Select value={profile.preferredCurrency} onValueChange={(preferredCurrency: "EUR" | "USD") => setProfile((current) => ({ ...current, preferredCurrency }))}>
                                <SelectTrigger><SelectValue /></SelectTrigger>
                                <SelectContent>
                                    <SelectItem value="EUR">EUR — Euro</SelectItem>
                                    <SelectItem value="USD">USD — Dólar</SelectItem>
                                </SelectContent>
                            </Select>
                        </div>
                    </CardContent>
                </Card>

                <StatusNotice notice={profileNotice} />
                <div className="flex justify-end">
                    <Button type="submit" disabled={savingProfile || !profile.name.trim()} className="min-w-36">
                        {savingProfile && <LoaderCircle className="h-4 w-4 animate-spin" />}
                        {savingProfile ? "Guardando…" : "Guardar cambios"}
                    </Button>
                </div>
            </form>

            <form onSubmit={savePassword}>
                <Card>
                    <CardHeader className="border-b bg-muted/30">
                        <div className="flex items-center gap-3">
                            <ShieldCheck className="h-5 w-5 text-muted-foreground" />
                            <div>
                                <CardTitle>Seguridad</CardTitle>
                                <CardDescription>Cambia tu contraseña y protege el acceso a tus finanzas.</CardDescription>
                            </div>
                        </div>
                    </CardHeader>
                    <CardContent className="space-y-6 pt-6">
                        <div className="grid gap-5 md:grid-cols-3">
                            {[
                                { id: "currentPassword", label: "Contraseña actual", value: passwords.currentPassword, autoComplete: "current-password" },
                                { id: "newPassword", label: "Nueva contraseña", value: passwords.newPassword, autoComplete: "new-password" },
                                { id: "confirmPassword", label: "Confirmar contraseña", value: passwords.confirmPassword, autoComplete: "new-password" },
                            ].map((field, index) => (
                                <div className="space-y-2" key={field.id}>
                                    <Label htmlFor={field.id}>{field.label}</Label>
                                    <div className="relative">
                                        <Input
                                            id={field.id}
                                            type={showPasswords ? "text" : "password"}
                                            value={field.value}
                                            onChange={(event) => setPasswords((current) => ({ ...current, [field.id]: event.target.value }))}
                                            autoComplete={field.autoComplete}
                                            minLength={index === 0 ? 1 : 10}
                                            required
                                            className={index === 2 ? "pr-10" : undefined}
                                        />
                                        {index === 2 && (
                                            <button type="button" onClick={() => setShowPasswords((visible) => !visible)} className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground" aria-label={showPasswords ? "Ocultar contraseñas" : "Mostrar contraseñas"}>
                                                {showPasswords ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                                            </button>
                                        )}
                                    </div>
                                </div>
                            ))}
                        </div>
                        <div className="flex flex-wrap gap-x-5 gap-y-2 text-xs text-muted-foreground">
                            {passwordChecks.map((check) => (
                                <span key={check.label} className={cn("flex items-center gap-1.5", check.valid && "text-emerald-600 dark:text-emerald-400")}>
                                    <Check className="h-3.5 w-3.5" /> {check.label}
                                </span>
                            ))}
                        </div>
                        <StatusNotice notice={passwordNotice} />
                        <div className="flex justify-end">
                            <Button type="submit" variant="outline" disabled={savingPassword || passwordChecks.some((check) => !check.valid)}>
                                {savingPassword ? <LoaderCircle className="h-4 w-4 animate-spin" /> : <KeyRound className="h-4 w-4" />}
                                {savingPassword ? "Actualizando…" : "Actualizar contraseña"}
                            </Button>
                        </div>
                    </CardContent>
                </Card>
            </form>
        </div>
    );
}
