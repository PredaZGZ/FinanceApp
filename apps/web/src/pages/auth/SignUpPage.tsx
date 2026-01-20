import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent, CardFooter } from "@/components/ui/card";
import { Link, useNavigate } from "react-router-dom";
import { useState } from "react";
import { postAPI } from "@/lib/api";
import { useAuth } from "@/components/common/AuthContext";
import { Lock, Mail, TrendingUp, ArrowRight } from "lucide-react";

export default function SignUpPage() {
    const navigate = useNavigate();
    const { refetchUser } = useAuth();
    const [isLoading, setIsLoading] = useState(false);
    const [error, setError] = useState<string | null>(null);

    const [formData, setFormData] = useState({
        email: "",
        password: "",
        confirmPassword: ""
    });

    const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
        setFormData(prev => ({ ...prev, [e.target.id]: e.target.value }));
    };

    const handleRegister = async (e: React.FormEvent) => {
        e.preventDefault();
        setError(null);

        if (formData.password !== formData.confirmPassword) {
            setError("Passwords do not match");
            return;
        }

        setIsLoading(true);
        try {
            await postAPI("/auth/register", {
                email: formData.email,
                password: formData.password
            });
            await refetchUser();
            navigate("/");
        } catch (err) {
            if (err instanceof Error) {
                setError(err.message);
            } else {
                setError("An error occurred during registration");
            }
        } finally {
            setIsLoading(false);
        }
    };

    return (
        <div className="min-h-screen w-full flex bg-background text-foreground animate-in fade-in duration-500">
            {/* Left Side - Visual/Branding */}
            <div className="hidden lg:flex w-1/2 bg-zinc-900 border-r border-border items-center justify-center p-12 relative overflow-hidden">

                {/* Abstract Shapes/Gradients */}
                <div className="absolute top-1/4 left-1/4 w-96 h-96 bg-primary/20 rounded-full blur-[100px] animate-pulse" />
                <div className="absolute bottom-1/4 right-1/4 w-64 h-64 bg-secondary/20 rounded-full blur-[80px]" />

                <div className="relative z-10 max-w-md space-y-8 backdrop-blur-sm bg-black/5 p-8 rounded-3xl border border-white/5 shadow-2xl">
                    <div className="flex items-center gap-3">
                        <div className="p-3 bg-linear-to-br from-primary to-primary/50 rounded-xl shadow-lg shadow-primary/20">
                            <TrendingUp className="w-8 h-8 text-white" />
                        </div>
                        <h1 className="text-3xl font-bold tracking-tight text-white">FinanceApp</h1>
                    </div>
                    <div className="space-y-4">
                        <h2 className="text-4xl font-extrabold tracking-tight leading-tight text-white">
                            Start your journey to financial freedom.
                        </h2>
                        <p className="text-lg text-zinc-400 leading-relaxed">
                            Join thousands of users who are taking control of their wealth with our advanced analytics platform.
                        </p>
                    </div>

                    <div className="flex items-center gap-4 pt-4">
                        <div className="flex -space-x-4">
                            {[1, 2, 3, 4].map(i => (
                                <div key={i} className={`w-10 h-10 rounded-full border-2 border-black bg-zinc-800 flex items-center justify-center text-xs font-bold text-zinc-500 z-${10 - i}`}>
                                    {/* Placeholder avatars if we had images */}
                                    U{i}
                                </div>
                            ))}
                        </div>
                        <p className="text-sm text-zinc-500 font-medium">Join 2,000+ investors</p>
                    </div>
                </div>
            </div>

            {/* Right Side - Sign Up Form */}
            <div className="flex-1 flex items-center justify-center p-6 sm:p-12 relative">
                <div className="absolute top-4 right-4 lg:hidden">
                    <Link to="/login" className="text-sm font-medium text-primary hover:underline">
                        Already have an account?
                    </Link>
                </div>

                <div className="w-full max-w-[400px] space-y-8">
                    <div className="flex flex-col space-y-2 text-center lg:text-left">
                        <h1 className="text-3xl font-bold tracking-tight">Create an account</h1>
                        <p className="text-muted-foreground">
                            Enter your email below to create your account
                        </p>
                    </div>

                    <Card className="border-0 shadow-none bg-transparent p-0">
                        <CardContent className="p-0 space-y-4">
                            <form onSubmit={handleRegister} className="space-y-4">
                                {error && (
                                    <div className="p-3 text-sm text-red-500 bg-red-500/10 border border-red-500/20 rounded-md">
                                        {error}
                                    </div>
                                )}

                                <div className="space-y-2">
                                    <Label htmlFor="email">Email</Label>
                                    <div className="relative group">
                                        <Mail className="absolute left-3 top-3 h-4 w-4 text-muted-foreground group-focus-within:text-primary transition-colors" />
                                        <Input
                                            id="email"
                                            type="email"
                                            placeholder="name@example.com"
                                            value={formData.email}
                                            onChange={handleChange}
                                            required
                                            className="pl-10 h-11 bg-secondary/30 border-border/50 focus:border-primary focus:ring-1 focus:ring-primary transition-all"
                                        />
                                    </div>
                                </div>

                                <div className="space-y-2">
                                    <Label htmlFor="password">Password</Label>
                                    <div className="relative group">
                                        <Lock className="absolute left-3 top-3 h-4 w-4 text-muted-foreground group-focus-within:text-primary transition-colors" />
                                        <Input
                                            id="password"
                                            type="password"
                                            placeholder="••••••••"
                                            value={formData.password}
                                            onChange={handleChange}
                                            required
                                            minLength={6}
                                            className="pl-10 h-11 bg-secondary/30 border-border/50 focus:border-primary focus:ring-1 focus:ring-primary transition-all"
                                        />
                                    </div>
                                </div>

                                <div className="space-y-2">
                                    <Label htmlFor="confirmPassword">Confirm Password</Label>
                                    <div className="relative group">
                                        <Lock className="absolute left-3 top-3 h-4 w-4 text-muted-foreground group-focus-within:text-primary transition-colors" />
                                        <Input
                                            id="confirmPassword"
                                            type="password"
                                            placeholder="••••••••"
                                            value={formData.confirmPassword}
                                            onChange={handleChange}
                                            required
                                            minLength={6}
                                            className="pl-10 h-11 bg-secondary/30 border-border/50 focus:border-primary focus:ring-1 focus:ring-primary transition-all"
                                        />
                                    </div>
                                </div>

                                <Button
                                    type="submit"
                                    className="w-full h-11 font-medium bg-linear-to-r from-primary to-indigo-600 hover:from-primary/90 hover:to-indigo-600/90 shadow-lg shadow-primary/20 transition-all duration-300 transform hover:-translate-y-0.5"
                                    disabled={isLoading}
                                >
                                    {isLoading ? (
                                        <div className="flex items-center gap-2">
                                            <div className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                                            <span>Creating account...</span>
                                        </div>
                                    ) : (
                                        <div className="flex items-center gap-2">
                                            <span>Sign Up</span>
                                            <ArrowRight className="w-4 h-4" />
                                        </div>
                                    )}
                                </Button>
                            </form>
                        </CardContent>
                        <CardFooter className="flex flex-col gap-4 p-0 mt-6">
                            <p className="text-sm text-center text-muted-foreground">
                                Already have an account?{" "}
                                <Link to="/login" className="font-semibold text-primary hover:text-primary/80 transition-colors">
                                    Sign in
                                </Link>
                            </p>
                        </CardFooter>
                    </Card>
                </div>

                {/* Footer info or terms could go here */}
                <div className="absolute bottom-6 text-xs text-muted-foreground">
                    By clicking continue, you agree to our <a href="#" className="underline hover:text-foreground">Terms of Service</a> and <a href="#" className="underline hover:text-foreground">Privacy Policy</a>.
                </div>
            </div>
        </div>
    );
}
