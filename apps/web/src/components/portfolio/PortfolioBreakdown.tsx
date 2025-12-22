import {
    Table,
    TableBody,
    TableCell,
    TableHead,
    TableHeader,
    TableRow,
} from "@/components/ui/table";
import type { BreakdownItem } from "@/lib/services/portfolio";

interface PortfolioBreakdownProps {
    breakdown: BreakdownItem[];
}

export function PortfolioBreakdown({ breakdown }: PortfolioBreakdownProps) {
    if (!breakdown || breakdown.length === 0) {
        return <div className="text-muted-foreground p-4">No realized gains/losses breakdown available.</div>;
    }

    return (
        <div className="rounded-md border mt-4">
            <Table>
                <TableHeader>
                    <TableRow>
                        <TableHead>Sell Date</TableHead>
                        <TableHead className="text-right">Qty Sold</TableHead>
                        <TableHead className="text-right">Sell Price</TableHead>
                        <TableHead>Buy Date</TableHead>
                        <TableHead className="text-right">Buy Price</TableHead>
                        <TableHead className="text-right">Realized Gain</TableHead>
                    </TableRow>
                </TableHeader>
                <TableBody>
                    {breakdown.map((item, index) => (
                        <TableRow key={index}>
                            <TableCell>{new Date(item.sellDate).toLocaleDateString()}</TableCell>
                            <TableCell className="text-right">{item.quantitySold.toFixed(4)}</TableCell>
                            <TableCell className="text-right">€{item.sellPrice.toFixed(2)}</TableCell>
                            <TableCell>{new Date(item.buyDate).toLocaleDateString()}</TableCell>
                            <TableCell className="text-right">€{item.buyPrice.toFixed(2)}</TableCell>
                            <TableCell className={`text-right ${item.gain >= 0 ? 'text-green-500' : 'text-red-500'}`}>
                                {item.gain > 0 ? '+' : ''}€{item.gain.toFixed(2)}
                            </TableCell>
                        </TableRow>
                    ))}
                </TableBody>
            </Table>
        </div>
    );
}
