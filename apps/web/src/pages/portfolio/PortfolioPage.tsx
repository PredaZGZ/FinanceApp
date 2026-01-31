import { useEffect, useState } from "react";
import { fetchAPI, fetchPrices } from "@/lib/api";
import type { PortfolioSummary } from "@/components/portfolio/portfolio.types";
import { PortfolioSummaryCards, PortfolioSummarySkeleton } from "@/components/portfolio/PortfolioSummaryCards";
import { PortfolioTable } from "@/components/portfolio/PortfolioTable";
import { TableSkeleton } from "@/components/common/TableSkeleton";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import {
    Select,
    SelectContent,
    SelectItem,
    SelectTrigger,
    SelectValue,
} from "@/components/ui/select";

export default function PortfolioPage() {
    const [summary, setSummary] = useState<PortfolioSummary | null>(null);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState<string | null>(null);
    const [method, setMethod] = useState<string>("FIFO");

    const [prices, setPrices] = useState<Record<string, { price: number; currency: string }>>({});

    useEffect(() => {
        const fetchSummary = async () => {
            setLoading(true);
            try {
                const data = await fetchAPI<PortfolioSummary>(`/portfolio/summary?method=${method}&_t=${Date.now()}`);
                setSummary(data);

                // Fetch prices
                const symbols = data.holdings.map(h => h.symbol);
                if (symbols.length > 0) {
                    // Add currency pairs to fetch
                    const symbolsToFetch = [...symbols, "USDEUR=X"];
                    try {
                        const pricesData = await fetchPrices(symbolsToFetch);
                        setPrices(pricesData);
                    } catch (e) {
                        console.error("Failed to fetch prices", e);
                    }
                }

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
            </div>

            {loading && !summary ? (
                <div className="space-y-6">
                    <PortfolioSummarySkeleton />
                    <Card>
                        <CardHeader>
                            <CardTitle>Holdings</CardTitle>
                        </CardHeader>
                        <CardContent>
                            <TableSkeleton columns={8} rows={5} />
                        </CardContent>
                    </Card>
                </div>
            ) : error ? (
                <div className="p-8 text-red-500">{error}</div>
            ) : (
                summary && (
                    <>
                        <div className="transition-opacity">
                            <PortfolioSummaryCards summary={summary} prices={prices} />
                        </div>

                        <Card className="transition-opacity">
                            <CardHeader>
                                <CardTitle>Holdings</CardTitle>
                            </CardHeader>
                            <CardContent className="overflow-x-auto">
                                <PortfolioTable holdings={summary.holdings} prices={prices} />
                            </CardContent>
                        </Card>
                    </>
                )
            )}
        </div>
    );
}
