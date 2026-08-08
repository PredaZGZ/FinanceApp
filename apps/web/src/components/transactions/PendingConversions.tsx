import { useEffect, useState } from "react";
import { fetchAPI, postAPI } from "@/lib/api";
import {
    Table,
    TableBody,
    TableCell,
    TableHead,
    TableHeader,
    TableRow,
} from "@/components/ui/table";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { formatDate } from "@/lib/utils";

interface PendingTransaction {
    id: string;
    date: string;
    currency: string;
    type: string;
    value: number;
    entity: "cash" | "trade";
    symbol?: string;
    name?: string | null;
    isin?: string | null;
}

export default function PendingConversions() {
    const [transactions, setTransactions] = useState<PendingTransaction[]>([]);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState<string | null>(null);
    const [eurCosts, setEurCosts] = useState<Record<string, string>>({});
    const [submitting, setSubmitting] = useState<string | null>(null);

    const loadPending = async () => {
        setLoading(true);
        try {
            const response = await fetchAPI<{ data: PendingTransaction[] }>("/transactions/pending-conversion");
            setTransactions(response.data);
        } catch (err) {
            setError("Failed to load pending conversions");
            console.error(err);
        } finally {
            setLoading(false);
        }
    };

    useEffect(() => {
        // eslint-disable-next-line react-hooks/set-state-in-effect -- initial remote data synchronization
        loadPending();
    }, []);

    const handleCostChange = (id: string, value: string) => {
        setEurCosts((prev) => ({ ...prev, [id]: value }));
    };

    const handleSubmit = async (id: string) => {
        const cost = parseFloat(eurCosts[id]);
        if (isNaN(cost) || cost <= 0) return;

        setSubmitting(id);
        try {
            await postAPI(`/transactions/${id}/conversion`, { eurCost: cost });
            // Remove from list
            setTransactions((prev) => prev.filter((t) => t.id !== id));
            // Clear input
            setEurCosts((prev) => {
                const next = { ...prev };
                delete next[id];
                return next;
            });
        } catch (err) {
            console.error("Failed to update conversion", err);
            alert("Failed to update conversion");
        } finally {
            setSubmitting(null);
        }
    };

    const handleKeyDown = (e: React.KeyboardEvent<HTMLInputElement>, id: string) => {
        if (e.key === "Enter") {
            handleSubmit(id);
        }
    };

    if (loading && !transactions.length) return <div>Loading...</div>;
    if (error) return <div className="text-red-500">{error}</div>;

    if (transactions.length === 0) {
        return <div className="text-muted-foreground p-4">No pending conversions found.</div>;
    }

    return (
        <div className="rounded-md border overflow-auto">
            <Table>
                <TableHeader>
                    <TableRow>
                        <TableHead>Date</TableHead>
                        <TableHead>Asset</TableHead>
                        <TableHead>Type</TableHead>
                        <TableHead>Currency</TableHead>
                        <TableHead className="text-right">Original Value</TableHead>
                        <TableHead className="w-[200px]">EUR Cost</TableHead>
                        <TableHead className="w-[100px]"></TableHead>
                    </TableRow>
                </TableHeader>
                <TableBody>
                    {transactions.map((tx, index) => (
                        <TableRow key={tx.id}>
                            <TableCell>{formatDate(tx.date)}</TableCell>
                            <TableCell>
                                {tx.name || tx.symbol || "Cash movement"}
                                {(tx.symbol || tx.isin) && (
                                    <div className="text-xs text-muted-foreground">
                                        {tx.symbol}{tx.isin ? ` · ISIN ${tx.isin}` : ""}
                                    </div>
                                )}
                            </TableCell>
                            <TableCell>{tx.type}</TableCell>
                            <TableCell>{tx.currency}</TableCell>
                            <TableCell className="text-right">
                                {tx.value.toLocaleString("en-US", {
                                    style: "currency",
                                    currency: tx.currency,
                                })}
                            </TableCell>
                            <TableCell>
                                <Input
                                    type="number"
                                    placeholder="EUR Cost"
                                    value={eurCosts[tx.id] || ""}
                                    onChange={(e) => handleCostChange(tx.id, e.target.value)}
                                    onKeyDown={(e) => handleKeyDown(e, tx.id)}
                                    step="0.01"
                                    tabIndex={index + 1}
                                />
                            </TableCell>
                            <TableCell>
                                <Button
                                    size="sm"
                                    onClick={() => handleSubmit(tx.id)}
                                    disabled={submitting === tx.id || !eurCosts[tx.id]}
                                    tabIndex={-1} // Skip button in tab order to speed up input
                                >
                                    {submitting === tx.id ? "Saving..." : "Save"}
                                </Button>
                            </TableCell>
                        </TableRow>
                    ))}
                </TableBody>
            </Table>
        </div>
    );
}
