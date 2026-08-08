
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";
import type { NetWorthSummary } from "./net-worth.types";

interface NetWorthSummaryCardProps {
    summary: NetWorthSummary | null;
    isLoading: boolean;
}

export function NetWorthSummaryCard({ summary, isLoading }: NetWorthSummaryCardProps) {
    if (isLoading) {
        return (
            <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
                {[1, 2, 3, 4].map((i) => (
                    <Card key={i}>
                        <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                            <Skeleton className="h-4 w-[100px]" />
                        </CardHeader>
                        <CardContent>
                            <Skeleton className="h-8 w-[120px] mt-2" />
                        </CardContent>
                    </Card>
                ))}
            </div>
        );
    }

    if (!summary) return null;

    const formatCurrency = (value: number, currencyCode?: string) => {
        return new Intl.NumberFormat('en-US', {
            style: 'currency',
            currency: currencyCode || 'EUR',
        }).format(value || 0);
    };

    // Calculate derived metrics or use what we have
    // Backend returns totalCurrentNetWorth. 
    // We assume this is Total Assets for now if we don't have liabilities tracked explicitly yet.
    const totalAssets = summary.totalAssets ?? summary.totalCurrentNetWorth ?? 0;
    // const totalLiabilities = summary.totalLiabilities ?? 0;
    const netWorth = summary.totalCurrentNetWorth ?? 0;
    const currency = summary.currency || 'EUR';

    return (
        <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
            <Card>
                <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                    <CardTitle className="text-sm font-medium">Net Worth</CardTitle>
                </CardHeader>
                <CardContent>
                    <div className="text-2xl font-bold">{formatCurrency(netWorth, currency)}</div>
                    {/* 24h Change is not yet provided by backend */}
                    <p className="text-xs text-muted-foreground flex items-center mt-1">
                        <span className="text-muted-foreground">
                            -
                        </span>
                        <span className="ml-1">from yesterday</span>
                    </p>
                </CardContent>
            </Card>
            <Card>
                <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                    <CardTitle className="text-sm font-medium">Active Assets</CardTitle>
                </CardHeader>
                <CardContent>
                    <div className="text-2xl font-bold">{summary.countActive}</div>
                </CardContent>
            </Card>
            <Card>
                <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                    <CardTitle className="text-sm font-medium">Sold Assets</CardTitle>
                </CardHeader>
                <CardContent>
                    <div className="text-2xl font-bold">{summary.countSold}</div>
                </CardContent>
            </Card>
            {/* Placeholder for future Breakdown or Liabilities */}
            <Card>
                <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                    <CardTitle className="text-sm font-medium">Total Value</CardTitle>
                </CardHeader>
                <CardContent>
                    <div className="space-y-1 text-lg font-bold">
                        {Object.entries(summary.totalsByCurrency).map(([code, value]) => (
                            <div key={code}>{formatCurrency(value, code)}</div>
                        ))}
                        {Object.keys(summary.totalsByCurrency).length === 0 && formatCurrency(totalAssets, currency)}
                    </div>
                </CardContent>
            </Card>
        </div>
    );
}
