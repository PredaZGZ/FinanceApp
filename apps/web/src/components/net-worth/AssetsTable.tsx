
import {
    Table,
    TableBody,
    TableCell,
    TableHead,
    TableHeader,
    TableRow,
} from "@/components/ui/table";
import { Button } from "@/components/ui/button";
import type { Asset } from "./net-worth.types";
import { Edit2, TrendingUp, Trash2 } from "lucide-react";

interface AssetsTableProps {
    assets: Asset[];
    isLoading: boolean;
    onEdit: (asset: Asset) => void;
    onDelete: (asset: Asset) => void;
    onRevalue: (asset: Asset) => void;
}

export function AssetsTable({ assets, isLoading, onEdit, onDelete, onRevalue }: AssetsTableProps) {
    if (isLoading) {
        return <div>Loading assets...</div>;
    }

    const formatCurrency = (value: number, currency: string) => {
        return new Intl.NumberFormat('en-US', {
            style: 'currency',
            currency: currency || 'EUR',
        }).format(value);
    };

    return (
        <div className="rounded-md border">
            <Table>
                <TableHeader>
                    <TableRow>
                        <TableHead>Name</TableHead>
                        <TableHead>Category</TableHead>
                        <TableHead className="text-right">Original Cost</TableHead>
                        <TableHead className="text-right">Current Value</TableHead>
                        <TableHead className="text-right">Last Valued</TableHead>
                        <TableHead className="text-right">Actions</TableHead>
                    </TableRow>
                </TableHeader>
                <TableBody>
                    {assets.length === 0 ? (
                        <TableRow>
                            <TableCell colSpan={6} className="h-24 text-center">
                                No assets found.
                            </TableCell>
                        </TableRow>
                    ) : (
                        assets.map((asset) => (
                            <TableRow key={asset.id}>
                                <TableCell className="font-medium">
                                    <div>{asset.name}</div>
                                    {asset.description && (
                                        <div className="text-xs text-muted-foreground">{asset.description}</div>
                                    )}
                                </TableCell>
                                <TableCell>{asset.category || '-'}</TableCell>
                                <TableCell className="text-right">
                                    {formatCurrency(asset.originalCost, asset.originalCurrency)}
                                </TableCell>
                                <TableCell className="text-right font-bold">
                                    {asset.currentValue ? formatCurrency(asset.currentValue, asset.originalCurrency) : '-'}
                                </TableCell>
                                <TableCell className="text-right text-xs">
                                    {asset.lastValuationDate ? new Date(asset.lastValuationDate).toLocaleDateString() : '-'}
                                </TableCell>
                                <TableCell className="text-right">
                                    <div className="flex justify-end gap-2">
                                        <Button variant="ghost" size="icon" onClick={() => onRevalue(asset)} title="Revalue">
                                            <TrendingUp className="h-4 w-4" />
                                        </Button>
                                        <Button variant="ghost" size="icon" onClick={() => onEdit(asset)} title="Edit">
                                            <Edit2 className="h-4 w-4" />
                                        </Button>
                                        <Button variant="ghost" size="icon" onClick={() => onDelete(asset)} title="Delete" className="text-red-500 hover:text-red-600">
                                            <Trash2 className="h-4 w-4" />
                                        </Button>
                                    </div>
                                </TableCell>
                            </TableRow>
                        ))
                    )}
                </TableBody>
            </Table>
        </div>
    );
}
