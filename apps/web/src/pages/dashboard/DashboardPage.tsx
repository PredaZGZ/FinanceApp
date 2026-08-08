import { useEffect, useState } from "react";
import { Banknote, PieChart, RefreshCw, Upload, Wallet } from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import { fetchAPI } from "@/lib/api";
import type { NetWorthSummary } from "@/components/net-worth/net-worth.types";
import type { PortfolioSummary } from "@/components/portfolio/portfolio.types";
import type { SalaryListResponse } from "@/components/salary/salary.types";

type DashboardData = {
  netWorth: NetWorthSummary;
  portfolio: PortfolioSummary;
  salaries: SalaryListResponse;
  imports: { myinvestor: string | null; revolut: string | null };
};

const formatCurrency = (value: number, currency = "EUR") => new Intl.NumberFormat("es-ES", {
  style: "currency",
  currency,
  maximumFractionDigits: 2,
}).format(value);

export default function DashboardPage() {
  const [data, setData] = useState<DashboardData | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);

  const loadDashboard = async () => {
    setLoading(true);
    try {
      const [netWorth, portfolio, salaries, imports] = await Promise.all([
        fetchAPI<NetWorthSummary>("/networth/summary"),
        fetchAPI<PortfolioSummary>("/portfolio/summary"),
        fetchAPI<SalaryListResponse>("/salary?limit=100"),
        fetchAPI<DashboardData["imports"]>("/import/status"),
      ]);
      setData({ netWorth, portfolio, salaries, imports });
      setError(null);
    } catch (loadError) {
      console.error(loadError);
      setError("No se ha podido cargar el resumen financiero.");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    // eslint-disable-next-line react-hooks/set-state-in-effect -- initial remote data synchronization
    loadDashboard();
  }, []);

  const salaryTotal = data?.salaries.data.reduce((sum, salary) => sum + Number(salary.netSalary ?? 0), 0) ?? 0;
  const latestImport = data
    ? [data.imports.myinvestor, data.imports.revolut].filter((value): value is string => Boolean(value)).sort().at(-1)
    : null;

  return (
    <div className="h-full overflow-auto p-4 md:p-8">
      <div className="mb-6 flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold tracking-tight">Resumen</h1>
          <p className="text-sm text-muted-foreground">Datos consolidados de tu cuenta.</p>
        </div>
        <Button variant="outline" onClick={loadDashboard} disabled={loading}>
          <RefreshCw className={`mr-2 h-4 w-4 ${loading ? "animate-spin" : ""}`} /> Actualizar
        </Button>
      </div>

      {error && <p className="mb-4 rounded-md border border-destructive/30 bg-destructive/10 p-3 text-sm text-destructive">{error}</p>}

      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
        {loading && !data ? Array.from({ length: 4 }).map((_, index) => (
          <Card key={index}><CardHeader><Skeleton className="h-4 w-28" /></CardHeader><CardContent><Skeleton className="h-8 w-36" /></CardContent></Card>
        )) : data && (
          <>
            <Card><CardHeader className="flex-row items-center justify-between"><CardTitle className="text-sm">Patrimonio en EUR</CardTitle><Wallet className="h-4 w-4" /></CardHeader><CardContent><div className="text-2xl font-bold">{formatCurrency(data.netWorth.totalCurrentNetWorth)}</div><p className="text-xs text-muted-foreground">{data.netWorth.countActive} activos activos</p></CardContent></Card>
            <Card><CardHeader className="flex-row items-center justify-between"><CardTitle className="text-sm">Capital invertido</CardTitle><PieChart className="h-4 w-4" /></CardHeader><CardContent><div className="text-2xl font-bold">{data.portfolio.totalCostBasis === null ? "No disponible" : formatCurrency(data.portfolio.totalCostBasis)}</div><p className="text-xs text-muted-foreground">{data.portfolio.holdings.filter(item => item.remainingShares > 0).length} posiciones</p></CardContent></Card>
            <Card><CardHeader className="flex-row items-center justify-between"><CardTitle className="text-sm">Nómina neta registrada</CardTitle><Banknote className="h-4 w-4" /></CardHeader><CardContent><div className="text-2xl font-bold">{formatCurrency(salaryTotal)}</div><p className="text-xs text-muted-foreground">{data.salaries.meta.total} registros</p></CardContent></Card>
            <Card><CardHeader className="flex-row items-center justify-between"><CardTitle className="text-sm">Última importación</CardTitle><Upload className="h-4 w-4" /></CardHeader><CardContent><div className="text-lg font-bold">{latestImport ? new Date(latestImport).toLocaleDateString("es-ES") : "Nunca"}</div><p className="text-xs text-muted-foreground">MyInvestor y Revolut</p></CardContent></Card>
          </>
        )}
      </div>
    </div>
  );
}
