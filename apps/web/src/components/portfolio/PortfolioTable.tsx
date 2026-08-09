import {
    Table,
    TableBody,
    TableCell,
    TableHead,
    TableHeader,
    TableRow,
} from "@/components/ui/table";
import type { Holding } from "@/components/portfolio/portfolio.types";
import { Link } from "react-router-dom";

interface PortfolioTableProps {
    holdings: Holding[];
    prices?: Record<string, { price: number; currency: string }>;
}

export function PortfolioTable({ holdings, prices }: PortfolioTableProps) {
    const usdEurRate = prices?.["USDEUR=X"]?.price || 0.95; // Default fallback if missing

    return (
        <div className="rounded-md border overflow-x-auto">
            <Table className="min-w-[800px]">
                <TableHeader>
                    <TableRow>
                        <TableHead>Activo</TableHead>
                        <TableHead className="text-right">Quantity</TableHead>
                        <TableHead className="text-right">Avg Cost</TableHead>
                        <TableHead className="text-right">Current Price</TableHead>
                        <TableHead className="text-right">Market Value</TableHead>
                        <TableHead className="text-right">Total Cost</TableHead>
                        <TableHead className="text-right">Realized Gain</TableHead>
                        <TableHead className="text-right">Unrealized Gain</TableHead>
                    </TableRow>
                </TableHeader>
                <TableBody>
                    {holdings.map((holding) => {
                        const quote = prices?.[holding.symbol];
                        let marketValue = 0;
                        let priceDisplay = '-';

                        // Determine display symbol based on holding currency (from backend)
                        const currencySymbol = holding.currency === 'USD' ? '$' : '€';

                        if (quote && holding.remainingShares > 0) {
                            // If quote matches holding currency, use as is.
                            // If quote is USD and holding is EUR, convert (not expected here if we skipped conversion).
                            // If quote is USD and holding is USD, use as is.

                            let priceVal = quote.price;

                            // Mismatch handling (e.g. Quote is EUR, Holding is USD? Unlikely for US stocks).
                            // We trust holding.currency as the "Account Currency" for this asset.

                            if (quote.currency === 'USD' && holding.currency === 'EUR') {
                                // We have a rate?
                                priceVal = quote.price * usdEurRate;
                            } else if (quote.currency === 'EUR' && holding.currency === 'USD') {
                                // Inverse?
                                priceVal = quote.price / usdEurRate;
                            }

                            priceDisplay = `${currencySymbol}${quote.price.toFixed(2)}`;
                            // Actually show the value in the holding's currency
                            if (quote.currency !== holding.currency) {
                                // Simplified: Just use the Converted Price for display
                                priceDisplay = `${currencySymbol}${priceVal.toFixed(2)}`;
                            }

                            marketValue = priceVal * holding.remainingShares;
                        }

                        const unrealizedGain = marketValue > 0 ? marketValue - holding.totalCostBasis : 0;

                        return (
                            <TableRow key={holding.symbol}>
                                <TableCell className="font-medium">
                                    <Link to={`/portfolio/${holding.symbol}`} className="hover:underline text-blue-500">
                                        {holding.name || holding.symbol}
                                    </Link>
                                    <div className="text-xs text-muted-foreground">
                                        {holding.symbol}
                                        {holding.isin ? ` · ISIN ${holding.isin}` : ''}
                                    </div>
                                </TableCell>
                                <TableCell className="text-right">
                                    {holding.remainingShares > 0 ? holding.remainingShares.toFixed(4) : '-'}
                                </TableCell>
                                <TableCell className="text-right">
                                    {holding.remainingShares > 0 ? `${currencySymbol}${holding.averageCost.toFixed(2)}` : '-'}
                                </TableCell>
                                <TableCell className="text-right">
                                    {priceDisplay}
                                </TableCell>
                                <TableCell className="text-right font-medium">
                                    {marketValue > 0 ? `${currencySymbol}${marketValue.toFixed(2)}` : '-'}
                                </TableCell>
                                <TableCell className="text-right text-muted-foreground">
                                    {holding.remainingShares > 0 ? `${currencySymbol}${holding.totalCostBasis.toFixed(2)}` : '-'}
                                </TableCell>
                                <TableCell className={`text-right ${holding.realizedGain >= 0 ? 'text-green-500' : 'text-red-500'}`}>
                                    {holding.realizedGain !== 0 ? `${holding.realizedGain > 0 ? '+' : ''}${currencySymbol}${holding.realizedGain.toFixed(2)}` : '-'}
                                </TableCell>
                                <TableCell className={`text-right ${unrealizedGain >= 0 ? 'text-green-500' : 'text-red-500'}`}>
                                    {marketValue > 0 ? (
                                        <>
                                            {unrealizedGain > 0 ? '+' : ''}{currencySymbol}{unrealizedGain.toFixed(2)}
                                            <br />
                                            <span className="text-xs opacity-80">
                                                ({unrealizedGain > 0 ? '+' : ''}{((unrealizedGain / holding.totalCostBasis) * 100).toFixed(2)}%)
                                            </span>
                                        </>
                                    ) : '-'}
                                </TableCell>
                            </TableRow>
                        );
                    })}
                </TableBody>
            </Table>
        </div>
    );
}

export function ClosedPositionsTable({ holdings }: { holdings: Holding[] }) {
    return (
        <div className="rounded-md border overflow-x-auto">
            <Table>
                <TableHeader>
                    <TableRow>
                        <TableHead>Asset</TableHead>
                        <TableHead className="text-right">Realized Profit</TableHead>
                    </TableRow>
                </TableHeader>
                <TableBody>
                    {holdings.map((holding) => {
                        const currencySymbol = holding.currency === 'USD' ? '$' : '€';
                        const gain = holding.realizedGain;

                        return (
                            <TableRow key={holding.symbol}>
                                <TableCell className="font-medium">
                                    <Link to={`/portfolio/${holding.symbol}`} className="hover:underline text-blue-500">
                                        {holding.name || holding.symbol}
                                    </Link>
                                    <div className="text-xs text-muted-foreground">
                                        {holding.symbol}
                                        {holding.isin ? ` · ISIN ${holding.isin}` : ''}
                                    </div>
                                </TableCell>
                                <TableCell className={`text-right font-medium ${gain >= 0 ? 'text-green-500' : 'text-red-500'}`}>
                                    {gain >= 0 ? '+' : ''}{currencySymbol}{gain.toFixed(2)}
                                </TableCell>
                            </TableRow>
                        );
                    })}
                </TableBody>
            </Table>
        </div>
    );
}
