import { useEffect, useState } from "react";
import { type PortfolioSummary, portfolioService } from "@/lib/services/portfolio";
import { PortfolioSummaryCards } from "@/components/portfolio/PortfolioSummaryCards";
import { PortfolioTable } from "@/components/portfolio/PortfolioTable";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";

export default function PortfolioPage() {
    const [summary, setSummary] = useState<PortfolioSummary | null>(null);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState<string | null>(null);
    const [method, setMethod] = useState<string>("FIFO");

    useEffect(() => {
        const fetchSummary = async () => {
            setLoading(true);
            try {
                const data = await portfolioService.getSummary(method);
                setSummary(data);
                setError(null);
            } catch (err) {
                setError("Failed to load portfolio summary");
                console.error(err);
            } finally {
                setLoading(false);
            }
        };

        fetchSummary();
    }, [method]);

    return (
        <div className="space-y-6 p-8">
            <div className="flex items-center justify-between">
                <h1 className="text-3xl font-bold tracking-tight">Portfolio Overview</h1>
                <div className="flex gap-4">
                    <select
                        className="h-10 w-[180px] rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 text-foreground text-center"
                        value={method}
                        onChange={(e) => setMethod(e.target.value)}
                        style={{ colorScheme: "dark" }}
                    >
                        <option value="FIFO">FIFO</option>
                        <option value="WeightedAverage">Weighted Average</option>
                    </select>
                </div>
            </div>

            {(loading && !summary) ? (
                <div className="p-8">Loading portfolio...</div>
            ) : (
                summary && (
                    <>
                        <div className={loading ? "opacity-50 pointer-events-none transition-opacity" : "transition-opacity"}>
                            <PortfolioSummaryCards summary={summary} />
                        </div>

                        <Card className={loading ? "opacity-50 pointer-events-none transition-opacity" : "transition-opacity"}>
                            <CardHeader>
                                <CardTitle>Holdings</CardTitle>
                            </CardHeader>
                            <CardContent className="overflow-x-auto">
                                <PortfolioTable holdings={summary.holdings} />
                            </CardContent>
                        </Card>
                    </>
                )
            )}
        </div>
    );
}
