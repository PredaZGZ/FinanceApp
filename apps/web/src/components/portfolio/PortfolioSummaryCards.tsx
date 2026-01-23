import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import type { PortfolioSummary } from "@/components/portfolio/portfolio.types";
import { TrendingUp, Wallet, Layers } from "lucide-react";

interface PortfolioSummaryCardsProps {
    summary: PortfolioSummary;
    prices: Record<string, { price: number; currency: string }>;
}

export function PortfolioSummaryCards({ summary, prices }: PortfolioSummaryCardsProps) {
    const { totalRealizedGain, holdings } = summary;
    const activeHoldingsCount = holdings.filter(h => h.remainingShares > 0).length;

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
        let costNative = holding.averageCost * holding.remainingShares;
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
                    <TrendingUp className={`h-4 w-4 ${totalRealizedGain >= 0 ? 'text-green-500' : 'text-red-500'}`} />
                </CardHeader>
                <CardContent>
                    <div className={`text-2xl font-bold ${totalRealizedGain >= 0 ? 'text-green-500' : 'text-red-500'}`}>
                        {totalRealizedGain >= 0 ? '+' : ''}€{totalRealizedGain.toFixed(2)}
                    </div>
                    <p className="text-xs text-muted-foreground">
                        Lifetime realized gains
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
                        Active Holdings
                    </CardTitle>
                    <Layers className="h-4 w-4 text-muted-foreground" />
                </CardHeader>
                <CardContent>
                    <div className="text-2xl font-bold">
                        {activeHoldingsCount}
                    </div>
                    <p className="text-xs text-muted-foreground">
                        Diversification across assets
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
