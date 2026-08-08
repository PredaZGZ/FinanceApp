import {
    Area,
    AreaChart,
    Bar,
    BarChart,
    CartesianGrid,
    Cell,
    Legend,
    Pie,
    PieChart,
    ResponsiveContainer,
    Tooltip,
    XAxis,
    YAxis,
} from "recharts";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import type { CategoryBreakdown } from "@/components/net-worth/net-worth.types";
import type { Holding } from "@/components/portfolio/portfolio.types";
import type { SalaryRecord } from "@/components/salary/salary.types";

const COLORS = ["#2563eb", "#7c3aed", "#0891b2", "#059669", "#d97706", "#dc2626", "#db2777"];
const chartTextColor = "hsl(var(--muted-foreground))";
const chartGridColor = "hsl(var(--border))";
const chartTooltipStyle = {
    backgroundColor: "hsl(var(--popover))",
    border: "1px solid hsl(var(--border))",
    borderRadius: "8px",
    color: "hsl(var(--popover-foreground))",
};

const currency = new Intl.NumberFormat("es-ES", {
    style: "currency",
    currency: "EUR",
    maximumFractionDigits: 0,
});

function formatCurrency(value: number | string | undefined) {
    return currency.format(Number(value ?? 0));
}

function EmptyChart({ message }: { message: string }) {
    return <p className="flex h-[280px] items-center justify-center text-sm text-muted-foreground">{message}</p>;
}

export function AssetAllocationChart({ categories }: { categories: CategoryBreakdown[] }) {
    const chartData = categories
        .filter((category) => category.totalValue > 0)
        .map((category) => ({ name: category.category, value: category.totalValue }));

    return (
        <Card>
            <CardHeader>
                <CardTitle>Asignación patrimonial</CardTitle>
            </CardHeader>
            <CardContent>
                {chartData.length === 0 ? <EmptyChart message="Sin datos de patrimonio" /> : (
                    <ResponsiveContainer width="100%" height={280}>
                        <PieChart>
                            <Pie
                                data={chartData}
                                dataKey="value"
                                nameKey="name"
                                cx="50%"
                                cy="50%"
                                innerRadius={68}
                                outerRadius={104}
                                paddingAngle={3}
                                stroke="hsl(var(--background))"
                                strokeWidth={3}
                            >
                                {chartData.map((entry, index) => (
                                    <Cell key={entry.name} fill={COLORS[index % COLORS.length]} />
                                ))}
                            </Pie>
                            <Tooltip formatter={(value) => formatCurrency(Number(value))} contentStyle={chartTooltipStyle} />
                            <Legend verticalAlign="bottom" height={32} />
                        </PieChart>
                    </ResponsiveContainer>
                )}
            </CardContent>
        </Card>
    );
}

export function PortfolioExposureChart({ holdings }: { holdings: Holding[] }) {
    const chartData = holdings
        .filter((holding) => holding.remainingShares > 0)
        .sort((left, right) => right.totalCostBasis - left.totalCostBasis)
        .slice(0, 8)
        .map((holding) => ({
            symbol: holding.symbol.length > 14 ? `${holding.symbol.slice(0, 14)}…` : holding.symbol,
            cost: holding.totalCostBasis,
        }));

    return (
        <Card>
            <CardHeader>
                <CardTitle>Exposición por posición</CardTitle>
            </CardHeader>
            <CardContent>
                {chartData.length === 0 ? <EmptyChart message="Sin posiciones abiertas" /> : (
                    <ResponsiveContainer width="100%" height={280}>
                        <BarChart data={chartData} margin={{ top: 8, right: 8, left: 8, bottom: 8 }}>
                            <CartesianGrid stroke={chartGridColor} strokeDasharray="3 3" vertical={false} />
                            <XAxis dataKey="symbol" tick={{ fill: chartTextColor, fontSize: 11 }} axisLine={false} tickLine={false} />
                            <YAxis tick={{ fill: chartTextColor, fontSize: 11 }} axisLine={false} tickLine={false} tickFormatter={(value) => `${Math.round(value / 1000)}k`} />
                            <Tooltip formatter={(value) => formatCurrency(Number(value))} contentStyle={chartTooltipStyle} />
                            <Bar dataKey="cost" name="Coste" fill="#2563eb" radius={[6, 6, 0, 0]} />
                        </BarChart>
                    </ResponsiveContainer>
                )}
            </CardContent>
        </Card>
    );
}

export function SalaryTrendChart({ salaries }: { salaries: SalaryRecord[] }) {
    const monthly = new Map<string, { month: string; gross: number; net: number }>();
    const currentYear = new Date().getFullYear();

    for (const salary of salaries) {
        const date = new Date(salary.date);
        if (Number.isNaN(date.getTime()) || date.getFullYear() !== currentYear) continue;
        const key = `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, "0")}`;
        const current = monthly.get(key) ?? {
            month: date.toLocaleDateString("es-ES", { month: "short" }),
            gross: 0,
            net: 0,
        };
        current.gross += Number(salary.grossSalary ?? 0);
        current.net += Number(salary.netSalary ?? 0);
        monthly.set(key, current);
    }

    const chartData = [...monthly.entries()]
        .sort(([left], [right]) => left.localeCompare(right))
        .map(([, value]) => value);

    return (
        <Card className="lg:col-span-2">
            <CardHeader>
                <CardTitle>Evolución salarial mensual</CardTitle>
            </CardHeader>
            <CardContent>
                {chartData.length === 0 ? <EmptyChart message="Sin nóminas del año actual" /> : (
                    <ResponsiveContainer width="100%" height={300}>
                        <AreaChart data={chartData} margin={{ top: 8, right: 8, left: 8, bottom: 8 }}>
                            <defs>
                                <linearGradient id="grossSalary" x1="0" y1="0" x2="0" y2="1">
                                    <stop offset="5%" stopColor="#7c3aed" stopOpacity={0.3} />
                                    <stop offset="95%" stopColor="#7c3aed" stopOpacity={0} />
                                </linearGradient>
                                <linearGradient id="netSalary" x1="0" y1="0" x2="0" y2="1">
                                    <stop offset="5%" stopColor="#059669" stopOpacity={0.3} />
                                    <stop offset="95%" stopColor="#059669" stopOpacity={0} />
                                </linearGradient>
                            </defs>
                            <CartesianGrid stroke={chartGridColor} strokeDasharray="3 3" vertical={false} />
                            <XAxis dataKey="month" tick={{ fill: chartTextColor, fontSize: 11 }} axisLine={false} tickLine={false} />
                            <YAxis tick={{ fill: chartTextColor, fontSize: 11 }} axisLine={false} tickLine={false} tickFormatter={(value) => `${Math.round(value / 1000)}k`} />
                            <Tooltip formatter={(value) => formatCurrency(Number(value))} contentStyle={chartTooltipStyle} />
                            <Legend />
                            <Area type="monotone" dataKey="gross" name="Bruto" stroke="#7c3aed" fill="url(#grossSalary)" strokeWidth={2} />
                            <Area type="monotone" dataKey="net" name="Neto" stroke="#059669" fill="url(#netSalary)" strokeWidth={2} />
                        </AreaChart>
                    </ResponsiveContainer>
                )}
            </CardContent>
        </Card>
    );
}
