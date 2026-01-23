import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import type { PortfolioSummary } from "@/components/portfolio/portfolio.types";
import { TrendingUp, Wallet, Layers } from "lucide-react";

interface PortfolioSummaryCardsProps {
    summary: PortfolioSummary;
    prices: Record<string, { price: number; currency: string }>;
}

export function PortfolioSummaryCards({ summary, prices }: PortfolioSummaryCardsProps) {
    const { totalRealizedGain, totalCostBasis, holdings } = summary;
    const activeHoldingsCount = holdings.filter(h => h.remainingShares > 0).length;

    // Calculate Unrealized metrics
    const usdEurRate = prices?.["USDEUR=X"]?.price || 0.95;
    let totalMarketValue = 0;
    let totalCalculatedCostBasis = 0;

    console.log('--- Subtotals Calculation Start ---');
    holdings.forEach((holding, index) => {
        if (holding.remainingShares <= 0) return;

        // --- Market Value Calculation ---
        const quote = prices?.[holding.symbol];
        let marketValueEUR = 0;
        let marketConvNote = 'None';

        if (quote) {
            let priceVal = quote.price;

            // Normalize Quote to EUR
            if (quote.currency === 'USD') {
                priceVal = quote.price * usdEurRate;
                marketConvNote = `USD->EUR (Rate: ${usdEurRate})`;
            }
            marketValueEUR = priceVal * holding.remainingShares;
            totalMarketValue += marketValueEUR;
        } else {
            console.log(`-${index + 1} [${holding.symbol}] No quote found. Market Value: 0`);
        }

        // --- Cost Basis Calculation ---
        // Calculate cost in EUR
        let costNative = holding.averageCost * holding.remainingShares;
        let costEUR = costNative;
        let costConvNote = 'None';

        if (holding.currency === 'USD') {
            costEUR = costNative * usdEurRate;
            costConvNote = `USD->EUR (Rate: ${usdEurRate})`;
        }
        totalCalculatedCostBasis += costEUR;

        console.log(`+${index + 1} [${holding.symbol}] Shares: ${holding.remainingShares} 
    | Price: ${quote?.price} ${quote?.currency} -> Val (EUR): ${marketValueEUR.toFixed(2)} (${marketConvNote})
    | Cost: ${holding.averageCost} ${holding.currency} -> Cost (EUR): ${costEUR.toFixed(2)} (${costConvNote})
    | RunTotal Val: ${totalMarketValue.toFixed(2)} | RunTotal Cost: ${totalCalculatedCostBasis.toFixed(2)}`);
    });
    console.log(`--- End. Final Val: ${totalMarketValue.toFixed(2)} | Final Cost: ${totalCalculatedCostBasis.toFixed(2)} ---`);

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
                    </div>
                    <p className="text-xs text-muted-foreground">
                        Total Market Value: €{totalMarketValue.toFixed(2)}
                    </p>
                </CardContent>
            </Card>
        </div>
    );
}
