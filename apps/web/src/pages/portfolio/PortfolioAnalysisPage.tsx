import { useEffect, useState } from "react";
import { useParams, useNavigate } from "react-router-dom";
import { type Holding, portfolioService } from "@/lib/services/portfolio";
import { PortfolioBreakdown } from "@/components/portfolio/PortfolioBreakdown";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import {
    Select,
    SelectContent,
    SelectItem,
    SelectTrigger,
    SelectValue,
} from "@/components/ui/select";
import { ArrowLeft } from "lucide-react";

export default function PortfolioAnalysisPage() {
    const { symbol } = useParams<{ symbol: string }>();
    const navigate = useNavigate();
    const [holding, setHolding] = useState<Holding | null>(null);
    const [loading, setLoading] = useState(true);
    const [_, setError] = useState<string | null>(null);
    const [method, setMethod] = useState<string>("FIFO");

    useEffect(() => {
        if (!symbol) return;

        const fetchAnalysis = async () => {
            setLoading(true);
            try {
                const data = await portfolioService.getAnalysis(symbol, method);
                setHolding(data);
                setError(null);
            } catch (err) {
                setError("Failed to load analysis");
                console.error(err);
            } finally {
                setLoading(false);
            }
        };

        fetchAnalysis();
    }, [symbol, method]);

    return (
        <div className="space-y-6 p-8">
            <div className="flex items-center gap-4">
                <Button variant="outline" size="icon" onClick={() => navigate("/portfolio")}>
                    <ArrowLeft className="h-4 w-4" />
                </Button>
                <h1 className="text-3xl font-bold tracking-tight">{symbol} Analysis</h1>
            </div>

            <div className="flex gap-4 mb-6">
                <Select value={method} onValueChange={setMethod}>
                    <SelectTrigger className="w-[180px]">
                        <SelectValue placeholder="Select method" />
                    </SelectTrigger>
                    <SelectContent>
                        <SelectItem value="FIFO">FIFO</SelectItem>
                        <SelectItem value="WeightedAverage">Weighted Average</SelectItem>
                    </SelectContent>
                </Select>
            </div>

            {(loading && !holding) ? (
                <div className="p-8">Loading analysis...</div>
            ) : (
                holding && (
                    <div className={loading ? "opacity-50 pointer-events-none transition-opacity" : "transition-opacity"}>
                        <div className="grid gap-4 md:grid-cols-3">
                            <Card>
                                <CardHeader className="pb-2">
                                    <CardTitle className="text-sm font-medium">Realized Gain</CardTitle>
                                </CardHeader>
                                <CardContent>
                                    <div className={`text-2xl font-bold ${holding.realizedGain >= 0 ? 'text-green-500' : 'text-red-500'}`}>
                                        {holding.realizedGain >= 0 ? '+' : ''}€{holding.realizedGain.toFixed(2)}
                                    </div>
                                </CardContent>
                            </Card>
                            <Card>
                                <CardHeader className="pb-2">
                                    <CardTitle className="text-sm font-medium">Remaining Shares</CardTitle>
                                </CardHeader>
                                <CardContent>
                                    <div className="text-2xl font-bold">{holding.remainingShares}</div>
                                </CardContent>
                            </Card>
                            <Card>
                                <CardHeader className="pb-2">
                                    <CardTitle className="text-sm font-medium">Avg Cost</CardTitle>
                                </CardHeader>
                                <CardContent>
                                    <div className="text-2xl font-bold">€{holding.averageCost.toFixed(2)}</div>
                                </CardContent>
                            </Card>
                        </div>

                        <Card className="mt-6">
                            <CardHeader>
                                <CardTitle>Tax Lot Breakdown ({method})</CardTitle>
                            </CardHeader>
                            <CardContent className="overflow-x-auto">
                                <PortfolioBreakdown breakdown={holding.breakdown || []} />
                            </CardContent>
                        </Card>
                    </div>
                )
            )}
        </div>
    );
}
