import { useEffect, useState } from "react";
import {
    Table,
    TableBody,
    TableCell,
    TableHead,
    TableHeader,
    TableRow
} from "@/components/ui/table";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Trash2, FileText, TrendingUp, DollarSign, Calendar, Pencil } from "lucide-react";
import type { SalaryRecord, SalaryListResponse } from "./salary.types";
import { fetchAPI } from "@/lib/api";
import { format } from "date-fns";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import { TableSkeleton } from "@/components/common/TableSkeleton";

interface SalaryListProps {
    refreshTrigger: number;
    onView: (id: string) => void;
    onEdit: (salary: SalaryRecord) => void;
}

export default function SalaryList({ refreshTrigger, onView, onEdit }: SalaryListProps) {
    const [salaries, setSalaries] = useState<SalaryRecord[]>([]);
    const [loading, setLoading] = useState(true);

    const fetchSalaries = async () => {
        try {
            setLoading(true);
            const res = await fetchAPI<SalaryListResponse>('/salary?limit=100');
            setSalaries(res.data);
        } catch (error) {
            console.error(error);
        } finally {
            setLoading(false);
        }
    };

    useEffect(() => {
        // eslint-disable-next-line react-hooks/set-state-in-effect -- initial remote data synchronization
        fetchSalaries();
    }, [refreshTrigger]);

    const handleDelete = async (id: string) => {
        if (!confirm("Are you sure you want to delete this salary record?")) return;
        try {
            await fetchAPI<void>(`/salary/${id}`, { method: 'DELETE' });
            fetchSalaries();
        } catch (error) {
            console.error(error);
            alert("Failed to delete record");
        }
    };

    // Calculate stats
    const totalNet = salaries.reduce((acc, curr) => acc + Number(curr.netSalary || 0), 0);
    const averageNet = salaries.length > 0 ? totalNet / salaries.length : 0;
    const lastMonth = salaries.length > 0 ? salaries[0].netSalary : 0; // Assuming sorted by date DESC

    if (loading) {
        return (
            <div className="space-y-6">
                <SalaryStatsSkeleton />
                <Card>
                    <CardHeader>
                        <CardTitle>History</CardTitle>
                        <CardDescription>
                            A list of all your uploaded payrolls and invoices.
                        </CardDescription>
                    </CardHeader>
                    <CardContent className="p-0">
                        <TableSkeleton columns={6} rows={5} withHeader={true} />
                    </CardContent>
                </Card>
            </div>
        );
    }

    return (
        <div className="space-y-6">
            {/* Stats Cards */}
            <div className="grid gap-4 md:grid-cols-3">
                <Card>
                    <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                        <CardTitle className="text-sm font-medium">Total Net Income</CardTitle>
                        <DollarSign className="h-4 w-4 text-muted-foreground" />
                    </CardHeader>
                    <CardContent>
                        <div className="text-2xl font-bold">€{totalNet.toLocaleString('en-US', { minimumFractionDigits: 2 })}</div>
                        <p className="text-xs text-muted-foreground">Lifetime earnings</p>
                    </CardContent>
                </Card>
                <Card>
                    <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                        <CardTitle className="text-sm font-medium">Average Net</CardTitle>
                        <TrendingUp className="h-4 w-4 text-muted-foreground" />
                    </CardHeader>
                    <CardContent>
                        <div className="text-2xl font-bold">€{averageNet.toLocaleString('en-US', { minimumFractionDigits: 2 })}</div>
                        <p className="text-xs text-muted-foreground">Per payroll</p>
                    </CardContent>
                </Card>
                <Card>
                    <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                        <CardTitle className="text-sm font-medium">Latest Payroll</CardTitle>
                        <Calendar className="h-4 w-4 text-muted-foreground" />
                    </CardHeader>
                    <CardContent>
                        <div className="text-2xl font-bold">€{lastMonth?.toLocaleString('en-US', { minimumFractionDigits: 2 })}</div>
                        <p className="text-xs text-muted-foreground">
                            {salaries.length > 0 ? format(new Date(salaries[0].date), "MMMM yyyy") : "-"}
                        </p>
                    </CardContent>
                </Card>
            </div>

            {/* List Card */}
            <Card>
                <CardHeader>
                    <CardTitle>History</CardTitle>
                    <CardDescription>
                        A list of all your uploaded payrolls and invoices.
                    </CardDescription>
                </CardHeader>
                <CardContent className="p-0">
                    <Table>
                        <TableHeader>
                            <TableRow>
                                <TableHead className="pl-6">Date</TableHead>
                                <TableHead>Company</TableHead>
                                <TableHead className="text-right">Gross</TableHead>
                                <TableHead className="text-right">Net</TableHead>
                                <TableHead>File</TableHead>
                                <TableHead className="text-right pr-6">Actions</TableHead>
                            </TableRow>
                        </TableHeader>
                        <TableBody>
                            {salaries.map((salary) => (
                                <TableRow key={salary.id} className="group cursor-pointer hover:bg-muted/50 transition-colors" onClick={() => onView(salary.id)}>
                                    <TableCell className="pl-6 font-medium">
                                        {format(new Date(salary.date), "MMM yyyy")}
                                    </TableCell>
                                    <TableCell>
                                        <span className="font-semibold text-foreground/80">{salary.company || "Unknown"}</span>
                                    </TableCell>
                                    <TableCell className="text-right text-muted-foreground">
                                        {salary.grossSalary ? `€${salary.grossSalary.toLocaleString()}` : "-"}
                                    </TableCell>
                                    <TableCell className="text-right font-bold text-emerald-600 dark:text-emerald-500">
                                        {salary.netSalary ? `€${salary.netSalary.toLocaleString()}` : "-"}
                                    </TableCell>
                                    <TableCell>
                                        {salary.fileName ? (
                                            <Badge variant="outline" className="gap-1 font-normal">
                                                <FileText className="w-3 h-3" />
                                                PDF
                                            </Badge>
                                        ) : (
                                            <span className="text-muted-foreground text-xs italic">No file</span>
                                        )}
                                    </TableCell>
                                    <TableCell className="text-right pr-6">
                                        <div className="flex justify-end gap-1" onClick={e => e.stopPropagation()}>
                                            <Button
                                                variant="ghost"
                                                size="icon"
                                                onClick={() => onEdit(salary)}
                                            >
                                                <Pencil className="w-4 h-4 text-muted-foreground" />
                                            </Button>
                                            <Button
                                                variant="ghost"
                                                size="icon"
                                                className="text-destructive hover:text-destructive hover:bg-destructive/10"
                                                onClick={() => handleDelete(salary.id)}
                                            >
                                                <Trash2 className="w-4 h-4" />
                                            </Button>
                                        </div>
                                    </TableCell>
                                </TableRow>
                            ))}
                            {salaries.length === 0 && (
                                <TableRow>
                                    <TableCell colSpan={6} className="text-center py-12 text-muted-foreground">
                                        <div className="flex flex-col items-center gap-2">
                                            <FileText className="w-10 h-10 opacity-20" />
                                            <p>No salary records found.</p>
                                            <p className="text-xs">Upload your first payroll to get started.</p>
                                        </div>
                                    </TableCell>
                                </TableRow>
                            )}
                        </TableBody>
                    </Table>
                </CardContent>
            </Card>
        </div>
    );
}

function SalaryStatsSkeleton() {
    return (
        <div className="grid gap-4 md:grid-cols-3">
            {Array.from({ length: 3 }).map((_, i) => (
                <Card key={i}>
                    <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                        <Skeleton className="h-4 w-[100px]" />
                        <Skeleton className="h-4 w-4 rounded-full" />
                    </CardHeader>
                    <CardContent>
                        <Skeleton className="h-8 w-[120px] mb-1" />
                        <Skeleton className="h-3 w-[80px]" />
                    </CardContent>
                </Card>
            ))}
        </div>
    );
}
