import {
    Table,
    TableBody,
    TableCell,
    TableHead,
    TableHeader,
    TableRow,
} from "@/components/ui/table";
import type { Holding } from "@/lib/services/portfolio";
import { Link } from "react-router-dom";

interface PortfolioTableProps {
    holdings: Holding[];
}

export function PortfolioTable({ holdings }: PortfolioTableProps) {
    return (
        <div className="rounded-md border overflow-x-auto">
            <Table className="min-w-[600px]">
                <TableHeader>
                    <TableRow>
                        <TableHead>Symbol</TableHead>
                        <TableHead className="text-right">Quantity</TableHead>
                        <TableHead className="text-right">Avg Cost (€)</TableHead>
                        <TableHead className="text-right">Total Cost (€)</TableHead>
                        <TableHead className="text-right">Realized Gain (€)</TableHead>
                    </TableRow>
                </TableHeader>
                <TableBody>
                    {holdings.map((holding) => (
                        <TableRow key={holding.symbol}>
                            <TableCell className="font-medium">
                                <Link to={`/portfolio/${holding.symbol}`} className="hover:underline text-blue-500">
                                    {holding.symbol}
                                </Link>
                            </TableCell>
                            <TableCell className="text-right">
                                {holding.remainingShares > 0 ? holding.remainingShares.toFixed(4) : '-'}
                            </TableCell>
                            <TableCell className="text-right">
                                {holding.remainingShares > 0 ? `€${holding.averageCost.toFixed(2)}` : '-'}
                            </TableCell>
                            <TableCell className="text-right">
                                {holding.remainingShares > 0 ? `€${holding.totalCostBasis.toFixed(2)}` : '-'}
                            </TableCell>
                            <TableCell className={`text-right ${holding.realizedGain >= 0 ? 'text-green-500' : 'text-red-500'}`}>
                                {holding.realizedGain !== 0 ? `${holding.realizedGain > 0 ? '+' : ''}€${holding.realizedGain.toFixed(2)}` : '-'}
                            </TableCell>
                        </TableRow>
                    ))}
                </TableBody>
            </Table>
        </div>
    );
}
