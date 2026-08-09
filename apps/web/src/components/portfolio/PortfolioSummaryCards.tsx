import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";
import type { PortfolioSummary } from "@/components/portfolio/portfolio.types";
import { TrendingUp, Wallet, CircleDollarSign } from "lucide-react";

interface PortfolioSummaryCardsProps {
    summary: PortfolioSummary;
    prices: Record<string, { price: number; currency: string }>;
}

export function PortfolioSummaryCards({ summary, prices }: PortfolioSummaryCardsProps) {
    const { totalRealizedGain, holdings, conversionComplete } = summary;
    // Calculate Unrealized metrics
    const usdEurRate = prices?.["USDEUR=X"]?.price || 0.95;
    let totalMarketValue = 0;
    let totalCalculatedCostBasis = 0;

    holdings.forEach((holding) => {
        if (holding.remainingShares <= 0) return;

        // --- Market Value Calculation ---
        const quote = prices?.[holding.symbol];
        let marketValueEUR = 0;

        if (quote) {
            let priceVal = quote.price;

            // Normalize Quote to EUR
            if (quote.currency === 'USD') {
                priceVal = quote.price * usdEurRate;
            }
            marketValueEUR = priceVal * holding.remainingShares;
            totalMarketValue += marketValueEUR;
        }

        // --- Cost Basis Calculation ---
        // Calculate cost in EUR
        const costNative = holding.averageCost * holding.remainingShares;
        let costEUR = costNative;

        if (holding.currency === 'USD') {
            costEUR = costNative * usdEurRate;
        }
        totalCalculatedCostBasis += costEUR;
    });
    const totalUnrealizedGain = totalMarketValue - totalCalculatedCostBasis;


    return (
        <div className="grid gap-4 grid-cols-1 md:grid-cols-2 lg:grid-cols-4">
            <Card>
                <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                    <CardTitle className="text-sm font-medium">
                        Total Realized Profit
                    </CardTitle>
                    <TrendingUp className={`h-4 w-4 ${(totalRealizedGain ?? 0) >= 0 ? 'text-green-500' : 'text-red-500'}`} />
                </CardHeader>
                <CardContent>
                    <div className={`text-2xl font-bold ${(totalRealizedGain ?? 0) >= 0 ? 'text-green-500' : 'text-red-500'}`}>
                        {conversionComplete && totalRealizedGain !== null
                            ? `${totalRealizedGain >= 0 ? '+' : ''}€${totalRealizedGain.toFixed(2)}`
                            : 'Unavailable'}
                    </div>
                    <p className="text-xs text-muted-foreground">
                        {conversionComplete ? 'Lifetime realized gains' : 'Missing historical exchange rates'}
                    </p>
                </CardContent>
            </Card>
            <Card>
                <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                    <CardTitle className="text-sm font-medium">
                        Invested Capital
                    </CardTitle>
                    <Wallet className="h-4 w-4 text-muted-foreground" />
                </CardHeader>
                <CardContent>
                    <div className="text-2xl font-bold">
                        €{totalCalculatedCostBasis.toFixed(2)}
                    </div>
                    <p className="text-xs text-muted-foreground">
                        Current active investment
                    </p>
                </CardContent>
            </Card>
            <Card>
                <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                    <CardTitle className="text-sm font-medium">
                        Total Market Value
                    </CardTitle>
                    <CircleDollarSign className="h-4 w-4 text-muted-foreground" />
                </CardHeader>
                <CardContent>
                    <div className="text-2xl font-bold">
                        €{totalMarketValue.toFixed(2)}
                    </div>
                    <p className="text-xs text-muted-foreground">
                        Current value of active positions
                    </p>
                </CardContent>
            </Card>
            <Card>
                <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                    <CardTitle className="text-sm font-medium">
                        Unrealized Profit
                    </CardTitle>
                    <TrendingUp className={`h-4 w-4 ${totalUnrealizedGain >= 0 ? 'text-green-500' : 'text-red-500'}`} />
                </CardHeader>
                <CardContent>
                    <div className={`text-2xl font-bold ${totalUnrealizedGain >= 0 ? 'text-green-500' : 'text-red-500'}`}>
                        {totalUnrealizedGain >= 0 ? '+' : ''}€{totalUnrealizedGain.toFixed(2)}
                        <span className="text-sm ml-2 font-normal opacity-80">
                            {totalCalculatedCostBasis > 0
                                ? `(${totalUnrealizedGain >= 0 ? '+' : ''}${((totalUnrealizedGain / totalCalculatedCostBasis) * 100).toFixed(2)}%)`
                                : ''}
                        </span>
                    </div>
                    <p className="text-xs text-muted-foreground">
                        Total Market Value: €{totalMarketValue.toFixed(2)}
                    </p>
                </CardContent>
            </Card>
        </div>
    );
}

export function PortfolioSummarySkeleton() {
    return (
        <div className="grid gap-4 grid-cols-1 md:grid-cols-2 lg:grid-cols-4">
            {Array.from({ length: 4 }).map((_, i) => (
                <Card key={i}>
                    <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                        <Skeleton className="h-4 w-[100px]" />
                        <Skeleton className="h-4 w-4 rounded-full" />
                    </CardHeader>
                    <CardContent>
                        <Skeleton className="h-8 w-[120px] mb-1" />
                        <Skeleton className="h-3 w-[140px]" />
                    </CardContent>
                </Card>
            ))}
        </div>
    );
}
