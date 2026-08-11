import { useCallback, useEffect, useMemo, useState } from "react";
import { Activity, Banknote, PieChart, RefreshCw, TrendingUp, Wallet } from "lucide-react";
import { fetchAPI } from "@/lib/api";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";
import {
    Table,
    TableBody,
    TableCell,
    TableHead,
    TableHeader,
    TableRow,
} from "@/components/ui/table";
import type { NetWorthSummary } from "@/components/net-worth/net-worth.types";
import type { PortfolioSummary } from "@/components/portfolio/portfolio.types";
import type { SalaryListResponse } from "@/components/salary/salary.types";
import {
    AssetAllocationChart,
    PortfolioExposureChart,
    SalaryTrendChart,
} from "@/components/reports/ReportCharts";

interface Transaction {
    id: string;
    date: string;
    currency: string;
    symbol?: string;
    name?: string | null;
    isin?: string | null;
    type: string;
    side?: string;
    value: number;
}

interface TransactionsResponse {
    data: Transaction[];
}

interface ReportData {
    netWorth: NetWorthSummary;
    portfolio: PortfolioSummary;
    salaries: SalaryListResponse;
    transactions: TransactionsResponse;
}

type ReportSection = keyof ReportData;

const emptyNetWorth: NetWorthSummary = {
    totalCurrentNetWorth: 0,
    countActive: 0,
    countSold: 0,
    breakdownByCategory: [],
    totalsByCurrency: {},
};

const emptyPortfolio: PortfolioSummary = {
    currency: "EUR",
    method: "FIFO",
    totalRealizedGain: null,
    totalCostBasis: null,
    conversionComplete: true,
    holdings: [],
};

const emptySalaries: SalaryListResponse = {
    data: [],
    meta: {
        total: 0,
        page: 1,
        limit: 100,
        totalPages: 0,
    },
};

const emptyTransactions: TransactionsResponse = {
    data: [],
};

const numberFormatter = new Intl.NumberFormat("es-ES", {
    maximumFractionDigits: 2,
});

function formatCurrency(value: number | null | undefined, currency = "EUR") {
    return new Intl.NumberFormat("es-ES", {
        style: "currency",
        currency,
        maximumFractionDigits: 2,
    }).format(value ?? 0);
}

function formatDate(value: string) {
    const date = new Date(value);
    if (Number.isNaN(date.getTime())) return "—";
    return new Intl.DateTimeFormat("es-ES", {
        day: "2-digit",
        month: "short",
        year: "numeric",
    }).format(date);
}

function displayTransactionType(type: string, side?: string) {
    if (type === "InternalTransfer") return side === "Buy" ? "Transfer in" : "Transfer out";
    return side || type;
}

function MetricCard({
    title,
    value,
    description,
    icon: Icon,
    valueClassName = "",
}: {
    title: string;
    value: string;
    description: string;
    icon: typeof Wallet;
    valueClassName?: string;
}) {
    return (
        <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                <CardTitle className="text-sm font-medium">{title}</CardTitle>
                <Icon className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
                <div className={`text-2xl font-bold ${valueClassName}`}>{value}</div>
                <p className="mt-1 text-xs text-muted-foreground">{description}</p>
            </CardContent>
        </Card>
    );
}

function LoadingState() {
    return (
        <div className="space-y-6">
            <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-4">
                {[1, 2, 3, 4].map((item) => (
                    <Card key={item}>
                        <CardContent className="space-y-3 pt-6">
                            <Skeleton className="h-4 w-28" />
                            <Skeleton className="h-8 w-36" />
                            <Skeleton className="h-3 w-24" />
                        </CardContent>
                    </Card>
                ))}
            </div>
            <div className="grid gap-6 lg:grid-cols-2">
                {[1, 2].map((item) => (
                    <Card key={item}>
                        <CardContent className="space-y-4 pt-6">
                            <Skeleton className="h-5 w-40" />
                            <Skeleton className="h-40 w-full" />
                        </CardContent>
                    </Card>
                ))}
            </div>
        </div>
    );
}

export default function ReportsPage() {
    const [data, setData] = useState<ReportData | null>(null);
    const [isLoading, setIsLoading] = useState(true);
    const [error, setError] = useState<string | null>(null);
    const [sectionErrors, setSectionErrors] = useState<Partial<Record<ReportSection, string>>>({});

    const loadReports = useCallback(async () => {
        setIsLoading(true);
        const requests = {
            netWorth: fetchAPI<NetWorthSummary>("/networth/summary"),
            portfolio: fetchAPI<PortfolioSummary>("/portfolio/summary?method=FIFO"),
            salaries: fetchAPI<SalaryListResponse>("/salary?page=1&limit=100"),
            transactions: fetchAPI<TransactionsResponse>("/transactions?page=1&limit=8"),
        } satisfies Record<ReportSection, Promise<unknown>>;

        const entries = await Promise.all(
            Object.entries(requests).map(async ([section, request]) => {
                try {
                    return [section, { status: "fulfilled", value: await request }] as const;
                } catch (loadError) {
                    console.error(`Failed to load reports section: ${section}`, loadError);
                    return [
                        section,
                        {
                            status: "rejected",
                            reason: loadError instanceof Error ? loadError.message : "Error desconocido",
                        },
                    ] as const;
                }
            })
        );

        const results = Object.fromEntries(entries) as Record<
            ReportSection,
            | { status: "fulfilled"; value: unknown }
            | { status: "rejected"; reason: string }
        >;
        const nextSectionErrors = Object.fromEntries(
            Object.entries(results)
                .filter(([, result]) => result.status === "rejected")
                .map(([section, result]) => [section, result.status === "rejected" ? result.reason : ""])
        ) as Partial<Record<ReportSection, string>>;

        setData({
            netWorth: results.netWorth.status === "fulfilled" ? results.netWorth.value as NetWorthSummary : emptyNetWorth,
            portfolio: results.portfolio.status === "fulfilled" ? results.portfolio.value as PortfolioSummary : emptyPortfolio,
            salaries: results.salaries.status === "fulfilled" ? results.salaries.value as SalaryListResponse : emptySalaries,
            transactions: results.transactions.status === "fulfilled" ? results.transactions.value as TransactionsResponse : emptyTransactions,
        });
        setSectionErrors(nextSectionErrors);
        setError(Object.keys(nextSectionErrors).length === 4 ? "No se han podido cargar los informes." : null);
        setIsLoading(false);
    }, []);

    useEffect(() => {
        // eslint-disable-next-line react-hooks/set-state-in-effect -- initial remote data synchronization
        loadReports();
    }, [loadReports]);

    const salaryMetrics = useMemo(() => {
        const currentYear = new Date().getFullYear();
        const currentYearSalaries = data?.salaries.data.filter((salary) => {
            return salary.date && new Date(salary.date).getFullYear() === currentYear;
        }) ?? [];

        return {
            gross: currentYearSalaries.reduce((total, salary) => total + Number(salary.grossSalary ?? 0), 0),
            net: currentYearSalaries.reduce((total, salary) => total + Number(salary.netSalary ?? 0), 0),
            count: currentYearSalaries.length,
            latest: data?.salaries.data[0] ?? null,
        };
    }, [data]);

    const categoryTotals = useMemo(() => {
        return data?.netWorth.breakdownByCategory.reduce<Record<string, number>>((totals, item) => {
            totals[item.currency] = (totals[item.currency] ?? 0) + item.totalValue;
            return totals;
        }, {}) ?? {};
    }, [data]);

    const holdings = useMemo(() => {
        return [...(data?.portfolio.holdings ?? [])]
            .filter((holding) => holding.remainingShares > 0)
            .sort((left, right) => right.totalCostBasis - left.totalCostBasis);
    }, [data]);

    if (isLoading && !data) {
        return <div className="space-y-6 p-6 md:p-8"><LoadingState /></div>;
    }

    if (error || !data) {
        return (
            <div className="flex min-h-[420px] flex-col items-center justify-center gap-4 p-8 text-center">
                <Activity className="h-10 w-10 text-muted-foreground" />
                <div>
                    <h2 className="text-lg font-semibold">Reports no disponible</h2>
                    <p className="mt-1 text-sm text-muted-foreground">{error ?? "No hay datos suficientes todavía."}</p>
                </div>
                <Button variant="outline" onClick={loadReports}>Reintentar</Button>
            </div>
        );
    }

    return (
        <div className="space-y-6 p-6 md:p-8">
            <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
                <div>
                    <h1 className="text-3xl font-bold tracking-tight">Reports</h1>
                    <p className="mt-1 text-sm text-muted-foreground">
                        Una visión consolidada de tu patrimonio, inversiones e ingresos.
                    </p>
                </div>
                <Button variant="outline" onClick={loadReports} disabled={isLoading}>
                    <RefreshCw className={`mr-2 h-4 w-4 ${isLoading ? "animate-spin" : ""}`} />
                    Actualizar
                </Button>
            </div>

            {Object.keys(sectionErrors).length > 0 && (
                <Card className="border-amber-200 bg-amber-50 text-amber-950">
                    <CardContent className="p-4 text-sm">
                        Algunos bloques no han podido actualizarse ahora mismo. El resto del informe sigue disponible.
                    </CardContent>
                </Card>
            )}

            <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-4">
                <MetricCard
                    title="Patrimonio neto"
                    value={formatCurrency(data.netWorth.totalCurrentNetWorth)}
                    description={`${data.netWorth.countActive} activos en cartera`}
                    icon={Wallet}
                />
                <MetricCard
                    title="Capital invertido"
                    value={data.portfolio.totalCostBasis === null ? "No disponible" : formatCurrency(data.portfolio.totalCostBasis)}
                    description={`${holdings.length} posiciones abiertas`}
                    icon={PieChart}
                />
                <MetricCard
                    title="Beneficio realizado"
                    value={data.portfolio.totalRealizedGain === null ? "No disponible" : formatCurrency(data.portfolio.totalRealizedGain)}
                    description="Acumulado de operaciones cerradas"
                    icon={TrendingUp}
                    valueClassName={(data.portfolio.totalRealizedGain ?? 0) >= 0 ? "text-emerald-600" : "text-red-600"}
                />
                <MetricCard
                    title="Annual Gross Salary"
                    value={formatCurrency(salaryMetrics.gross)}
                    description={`${salaryMetrics.count} nóminas en ${new Date().getFullYear()}`}
                    icon={Banknote}
                />
            </div>

            <div className="grid gap-6 lg:grid-cols-2">
                <AssetAllocationChart categories={data.netWorth.breakdownByCategory} />
                <PortfolioExposureChart holdings={data.portfolio.holdings} />
            </div>

            <div className="grid gap-6 lg:grid-cols-2">
                <SalaryTrendChart salaries={data.salaries.data} />
            </div>

            <div className="grid gap-6 lg:grid-cols-2">
                <Card>
                    <CardHeader>
                        <CardTitle>Distribución del patrimonio</CardTitle>
                    </CardHeader>
                    <CardContent>
                        {data.netWorth.breakdownByCategory.length === 0 ? (
                            <p className="py-10 text-center text-sm text-muted-foreground">Todavía no hay activos categorizados.</p>
                        ) : (
                            <div className="space-y-5">
                                {data.netWorth.breakdownByCategory
                                    .slice()
                                    .sort((left, right) => right.totalValue - left.totalValue)
                                    .map((item) => {
                                        const categoryTotal = categoryTotals[item.currency] ?? 0;
                                        const percentage = categoryTotal > 0 ? (item.totalValue / categoryTotal) * 100 : 0;
                                        return (
                                            <div key={`${item.category}-${item.currency}`} className="space-y-2">
                                                <div className="flex items-center justify-between text-sm">
                                                    <span className="font-medium">{item.category}</span>
                                                    <span className="text-muted-foreground">{formatCurrency(item.totalValue, item.currency)}</span>
                                                </div>
                                                <div className="h-2 overflow-hidden rounded-full bg-muted">
                                                    <div className="h-full rounded-full bg-primary" style={{ width: `${percentage}%` }} />
                                                </div>
                                                <p className="text-xs text-muted-foreground">{percentage.toFixed(1)}% · {item.count} activo{item.count === 1 ? "" : "s"}</p>
                                            </div>
                                        );
                                    })}
                            </div>
                        )}
                    </CardContent>
                </Card>

                <Card>
                    <CardHeader>
                        <CardTitle>Exposición de cartera</CardTitle>
                    </CardHeader>
                    <CardContent className="overflow-x-auto">
                        {holdings.length === 0 ? (
                            <p className="py-10 text-center text-sm text-muted-foreground">Todavía no hay posiciones abiertas.</p>
                        ) : (
                            <Table>
                                <TableHeader>
                                    <TableRow>
                                        <TableHead>Activo</TableHead>
                                        <TableHead className="text-right">Unidades</TableHead>
                                        <TableHead className="text-right">Coste</TableHead>
                                        <TableHead className="text-right">Peso</TableHead>
                                    </TableRow>
                                </TableHeader>
                                <TableBody>
                                    {holdings.slice(0, 8).map((holding) => {
                                        const portfolioCostBasis = data.portfolio.totalCostBasis;
                                        const weight = portfolioCostBasis !== null && portfolioCostBasis > 0
                                            ? (holding.totalCostBasis / portfolioCostBasis) * 100
                                            : 0;
                                        return (
                                            <TableRow key={`${holding.symbol}-${holding.currency}`}>
                                                <TableCell>
                                                    <div className="font-medium">{holding.name || holding.symbol}</div>
                                                    <div className="text-xs text-muted-foreground">
                                                        {holding.symbol}
                                                        {holding.isin ? ` · ISIN ${holding.isin}` : ''}
                                                        {` · ${holding.currency}`}
                                                    </div>
                                                </TableCell>
                                                <TableCell className="text-right">{numberFormatter.format(holding.remainingShares)}</TableCell>
                                                <TableCell className="text-right">{formatCurrency(holding.totalCostBasis)}</TableCell>
                                                <TableCell className="text-right">{weight.toFixed(1)}%</TableCell>
                                            </TableRow>
                                        );
                                    })}
                                </TableBody>
                            </Table>
                        )}
                    </CardContent>
                </Card>
            </div>

            <div className="grid gap-6 lg:grid-cols-[1fr_1.4fr]">
                <Card>
                    <CardHeader>
                        <CardTitle>Resumen de ingresos</CardTitle>
                    </CardHeader>
                    <CardContent className="space-y-4">
                        <div className="flex items-center justify-between border-b pb-3 text-sm">
                            <span className="text-muted-foreground">Bruto anual</span>
                            <span className="font-semibold">{formatCurrency(salaryMetrics.gross)}</span>
                        </div>
                        <div className="flex items-center justify-between border-b pb-3 text-sm">
                            <span className="text-muted-foreground">Neto anual</span>
                            <span className="font-semibold">{formatCurrency(salaryMetrics.net)}</span>
                        </div>
                        <div className="flex items-center justify-between text-sm">
                            <span className="text-muted-foreground">Última nómina</span>
                            <span className="font-semibold">
                                {salaryMetrics.latest ? formatCurrency(Number(salaryMetrics.latest.netSalary ?? 0)) : "—"}
                            </span>
                        </div>
                        {salaryMetrics.latest && (
                            <p className="text-xs text-muted-foreground">
                                {salaryMetrics.latest.company || "Sin empresa"} · {formatDate(salaryMetrics.latest.date)}
                            </p>
                        )}
                    </CardContent>
                </Card>

                <Card>
                    <CardHeader>
                        <CardTitle>Actividad reciente</CardTitle>
                    </CardHeader>
                    <CardContent className="overflow-x-auto">
                        {data.transactions.data.length === 0 ? (
                            <p className="py-10 text-center text-sm text-muted-foreground">No hay transacciones recientes.</p>
                        ) : (
                            <Table>
                                <TableHeader>
                                    <TableRow>
                                        <TableHead>Fecha</TableHead>
                                        <TableHead>Concepto</TableHead>
                                        <TableHead>Tipo</TableHead>
                                        <TableHead className="text-right">Importe</TableHead>
                                    </TableRow>
                                </TableHeader>
                                <TableBody>
                                    {data.transactions.data.map((transaction) => (
                                        <TableRow key={transaction.id}>
                                            <TableCell className="whitespace-nowrap">{formatDate(transaction.date)}</TableCell>
                                            <TableCell className="font-medium">
                                                {transaction.name || transaction.symbol || transaction.type}
                                                {(transaction.symbol || transaction.isin) && (
                                                    <div className="text-xs text-muted-foreground">
                                                        {transaction.symbol}
                                                        {transaction.isin ? ` · ISIN ${transaction.isin}` : ''}
                                                    </div>
                                                )}
                                            </TableCell>
                                            <TableCell className="text-muted-foreground">{displayTransactionType(transaction.type, transaction.side)}</TableCell>
                                            <TableCell className="text-right">
                                                {formatCurrency(transaction.value)}
                                                <span className="ml-1 text-xs text-muted-foreground">{transaction.currency}</span>
                                            </TableCell>
                                        </TableRow>
                                    ))}
                                </TableBody>
                            </Table>
                        )}
                    </CardContent>
                </Card>
            </div>
        </div>
    );
}
