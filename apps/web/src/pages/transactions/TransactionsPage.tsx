import { useEffect, useState, useMemo } from "react";
import { useSearchParams } from "react-router-dom";
import { fetchAPI } from "@/lib/api";
import {
    Table,
    TableBody,
    TableCell,
    TableHead,
    TableHeader,
    TableRow,
} from "@/components/ui/table";
import { Button } from "@/components/ui/button";
import { ChevronLeft, ChevronRight, ArrowUpDown } from "lucide-react";

interface Transaction {
    id: string;
    date: string;
    currency: string;
    symbol: string;
    type: string;
    quantity: number;
    price: number;
    side: string;
    value: number;
    fees: number;
    commission: number;
}

interface Meta {
    total: number;
    page: number;
    limit: number;
    totalPages: number;
}

interface TransactionsResponse {
    data: Transaction[];
    meta: Meta;
}

type SortConfig = {
    key: keyof Transaction;
    direction: "asc" | "desc";
} | null;

export default function TransactionsPage() {
    const [searchParams, setSearchParams] = useSearchParams();
    const [data, setData] = useState<Transaction[]>([]);
    const [meta, setMeta] = useState<Meta | null>(null);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState<string | null>(null);
    const [sortConfig, setSortConfig] = useState<SortConfig>(null);

    const page = parseInt(searchParams.get("page") || "1", 10);
    const limit = parseInt(searchParams.get("limit") || "50", 10);

    useEffect(() => {
        const loadTransactions = async () => {
            setLoading(true);
            setError(null);
            try {
                const response = await fetchAPI<TransactionsResponse>(
                    `/transactions?page=${page}&limit=${limit}`
                );
                setData(response.data);
                setMeta(response.meta);
            } catch (err) {
                setError("Failed to load transactions");
                console.error(err);
            } finally {
                setLoading(false);
            }
        };

        loadTransactions();
    }, [page, limit]);

    const handlePageChange = (newPage: number) => {
        setSearchParams({ page: newPage.toString(), limit: limit.toString() });
    };

    const handleSort = (key: keyof Transaction) => {
        let direction: "asc" | "desc" = "asc";
        if (sortConfig && sortConfig.key === key && sortConfig.direction === "asc") {
            direction = "desc";
        }
        setSortConfig({ key, direction });
    };

    const sortedData = useMemo(() => {
        if (!sortConfig) return data;
        return [...data].sort((a, b) => {
            if (a[sortConfig.key] < b[sortConfig.key]) {
                return sortConfig.direction === "asc" ? -1 : 1;
            }
            if (a[sortConfig.key] > b[sortConfig.key]) {
                return sortConfig.direction === "asc" ? 1 : -1;
            }
            return 0;
        });
    }, [data, sortConfig]);

    if (loading && !data.length) {
        return <div className="p-8 text-center">Loading transactions...</div>;
    }

    if (error) {
        return <div className="p-8 text-center text-red-500">{error}</div>;
    }

    const formatDate = (dateString: string) => {
        const date = new Date(dateString);
        const day = date.getDate().toString().padStart(2, "0");
        const month = (date.getMonth() + 1).toString().padStart(2, "0");
        const year = date.getFullYear();
        return `${day}-${month}-${year}`;
    };

    const formatTime = (dateString: string) => {
        const date = new Date(dateString);
        return date.toLocaleTimeString("en-US", {
            hour: "2-digit",
            minute: "2-digit",
            hour12: false,
        });
    };

    const formatCurrency = (value: number, currency: string) => {
        return value.toLocaleString("en-US", {
            style: "currency",
            currency: currency,
            minimumFractionDigits: 2,
            maximumFractionDigits: 2,
        });
    };

    return (
        <div className="h-full flex flex-col overflow-hidden p-4 md:p-8 space-y-4">
            <div className="flex items-center justify-between">
                <h1 className="text-3xl font-bold tracking-tight">Transactions</h1>
            </div>

            <div className="flex-1 rounded-md border overflow-auto relative">
                <Table>
                    <TableHeader className="sticky top-0 bg-background z-10">
                        <TableRow>
                            <TableHead
                                className="w-[120px] cursor-pointer hover:bg-muted/50"
                                onClick={() => handleSort("date")}
                            >
                                <div className="flex items-center gap-1">
                                    Date
                                    <ArrowUpDown className="h-3 w-3" />
                                </div>
                            </TableHead>
                            <TableHead className="w-[80px]">Time</TableHead>
                            <TableHead
                                className="w-[100px] cursor-pointer hover:bg-muted/50"
                                onClick={() => handleSort("symbol")}
                            >
                                <div className="flex items-center gap-1">
                                    Symbol
                                    <ArrowUpDown className="h-3 w-3" />
                                </div>
                            </TableHead>
                            <TableHead
                                className="w-[150px] cursor-pointer hover:bg-muted/50"
                                onClick={() => handleSort("type")}
                            >
                                <div className="flex items-center gap-1">
                                    Type
                                    <ArrowUpDown className="h-3 w-3" />
                                </div>
                            </TableHead>
                            <TableHead
                                className="w-[80px] cursor-pointer hover:bg-muted/50"
                                onClick={() => handleSort("side")}
                            >
                                <div className="flex items-center gap-1">
                                    Side
                                    <ArrowUpDown className="h-3 w-3" />
                                </div>
                            </TableHead>
                            <TableHead
                                className="w-[100px] text-right cursor-pointer hover:bg-muted/50"
                                onClick={() => handleSort("quantity")}
                            >
                                <div className="flex items-center justify-end gap-1">
                                    Quantity
                                    <ArrowUpDown className="h-3 w-3" />
                                </div>
                            </TableHead>
                            <TableHead
                                className="w-[120px] text-right cursor-pointer hover:bg-muted/50"
                                onClick={() => handleSort("price")}
                            >
                                <div className="flex items-center justify-end gap-1">
                                    Price
                                    <ArrowUpDown className="h-3 w-3" />
                                </div>
                            </TableHead>
                            <TableHead
                                className="w-[120px] text-right cursor-pointer hover:bg-muted/50"
                                onClick={() => handleSort("value")}
                            >
                                <div className="flex items-center justify-end gap-1">
                                    Value
                                    <ArrowUpDown className="h-3 w-3" />
                                </div>
                            </TableHead>
                            <TableHead
                                className="w-[100px] text-right cursor-pointer hover:bg-muted/50"
                                onClick={() => handleSort("fees")}
                            >
                                <div className="flex items-center justify-end gap-1">
                                    Fees
                                    <ArrowUpDown className="h-3 w-3" />
                                </div>
                            </TableHead>
                            <TableHead></TableHead>
                        </TableRow>
                    </TableHeader>
                    <TableBody>
                        {sortedData.map((tx) => (
                            <TableRow key={tx.id}>
                                <TableCell>{formatDate(tx.date)}</TableCell>
                                <TableCell className="text-muted-foreground">
                                    {formatTime(tx.date)}
                                </TableCell>
                                <TableCell className="font-medium">{tx.symbol}</TableCell>
                                <TableCell>{tx.type}</TableCell>
                                <TableCell>
                                    <span
                                        className={`inline-flex items-center rounded-full px-2 py-1 text-xs font-medium ring-1 ring-inset ${tx.side === "Buy"
                                            ? "bg-green-50 text-green-700 ring-green-600/20"
                                            : "bg-red-50 text-red-700 ring-red-600/20"
                                            }`}
                                    >
                                        {tx.side}
                                    </span>
                                </TableCell>
                                <TableCell className="text-right">{tx.quantity}</TableCell>
                                <TableCell className="text-right">
                                    {formatCurrency(tx.price, tx.currency)}
                                </TableCell>
                                <TableCell className="text-right font-medium">
                                    {formatCurrency(tx.value, tx.currency)}
                                </TableCell>
                                <TableCell className="text-right text-muted-foreground">
                                    {formatCurrency(tx.fees + tx.commission, tx.currency)}
                                </TableCell>
                                <TableCell></TableCell>
                            </TableRow>
                        ))}
                    </TableBody>
                </Table>
            </div>

            {meta && (
                <div className="flex-none flex items-center justify-between pt-2">
                    <div className="text-sm text-muted-foreground">
                        Page {meta.page} of {meta.totalPages}
                    </div>
                    <div className="flex items-center gap-2">
                        <Button
                            variant="outline"
                            size="sm"
                            onClick={() => handlePageChange(page - 1)}
                            disabled={page <= 1}
                        >
                            <ChevronLeft className="h-4 w-4" />
                            Previous
                        </Button>
                        <Button
                            variant="outline"
                            size="sm"
                            onClick={() => handlePageChange(page + 1)}
                            disabled={page >= meta.totalPages}
                        >
                            Next
                            <ChevronRight className="h-4 w-4" />
                        </Button>
                    </div>
                </div>
            )}
        </div>
    );
}
