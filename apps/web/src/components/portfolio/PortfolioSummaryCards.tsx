import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import type { PortfolioSummary } from "@/components/portfolio/portfolio.types";
import { TrendingUp, Wallet, Layers } from "lucide-react";

interface PortfolioSummaryCardsProps {
    summary: PortfolioSummary;
}

export function PortfolioSummaryCards({ summary }: PortfolioSummaryCardsProps) {
    const { totalRealizedGain, totalCostBasis, holdings } = summary;
    const activeHoldingsCount = holdings.filter(h => h.remainingShares > 0).length;

    return (
        <div className="grid gap-4 md:grid-cols-3">
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
                        €{totalCostBasis.toFixed(2)}
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
        </div>
    );
}
