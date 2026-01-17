import { useEffect, useState } from "react";
import { format } from "date-fns";
import {
    Dialog,
    DialogContent,
    DialogHeader,
    DialogTitle,
} from "@/components/ui/dialog";
import type { SalaryRecord } from "./salary.types";
import { fetchAPI } from "@/lib/api";
import { FileText, Download, Building2 } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";

interface SalaryDetailModalProps {
    salaryId: string | null;
    onClose: () => void;
}

export default function SalaryDetailModal({ salaryId, onClose }: SalaryDetailModalProps) {
    const [data, setData] = useState<SalaryRecord | null>(null);

    useEffect(() => {
        if (salaryId) {
            fetchAPI<SalaryRecord>(`/salary/${salaryId}`).then(setData).catch(console.error);
        } else {
            setData(null);
        }
    }, [salaryId]);

    if (!salaryId || !data) return null;

    const payments = data.breakdown?.filter(i => i.type === 'payment') || [];
    const deductions = data.breakdown?.filter(i => i.type === 'deduction') || [];

    return (
        <Dialog open={!!salaryId} onOpenChange={(open) => !open && onClose()}>
            <DialogContent className="max-w-md p-0 overflow-hidden gap-0">
                <div className="bg-primary/5 p-6 border-b">
                    <DialogHeader className="mb-4">
                        <DialogTitle className="flex justify-between items-center">
                            <span className="text-xl">Payslip Details</span>
                            <Badge variant="outline" className="bg-background">{format(new Date(data.date), "MMM yyyy")}</Badge>
                        </DialogTitle>
                    </DialogHeader>

                    <div className="flex items-center gap-3">
                        <div className="h-10 w-10 rounded-full bg-primary/10 flex items-center justify-center text-primary">
                            <Building2 className="w-5 h-5" />
                        </div>
                        <div>
                            <p className="text-sm text-muted-foreground uppercase font-semibold tracking-wider text-[10px]">Company</p>
                            <p className="font-bold text-lg leading-none">{data.company}</p>
                        </div>
                    </div>
                </div>

                <div className="p-6 space-y-6">
                    {/* Breakdown List */}
                    <div className="space-y-4">
                        {payments.length > 0 && (
                            <div>
                                <h4 className="text-xs font-semibold text-muted-foreground uppercase mb-2">Earnings (Devengos)</h4>
                                <div className="space-y-2">
                                    {payments.map((item, i) => (
                                        <div key={i} className="flex justify-between text-sm">
                                            <span>{item.concept}</span>
                                            <span className="font-medium">€{item.amount.toLocaleString('en-US', { minimumFractionDigits: 2 })}</span>
                                        </div>
                                    ))}
                                </div>
                            </div>
                        )}

                        {deductions.length > 0 && (
                            <div>
                                <h4 className="text-xs font-semibold text-muted-foreground uppercase mb-2 text-rose-500">Deductions</h4>
                                <div className="space-y-2">
                                    {deductions.map((item, i) => (
                                        <div key={i} className="flex justify-between text-sm text-muted-foreground">
                                            <span>{item.concept}</span>
                                            <span className="text-rose-500">- €{item.amount.toLocaleString('en-US', { minimumFractionDigits: 2 })}</span>
                                        </div>
                                    ))}
                                </div>
                            </div>
                        )}

                        {(payments.length === 0 && deductions.length === 0) && (
                            <p className="text-sm text-muted-foreground italic text-center py-4">No breakdown details available.</p>
                        )}
                    </div>

                    <div className="border-t pt-4 border-dashed">
                        <div className="flex justify-between items-center text-sm text-muted-foreground mb-1">
                            <span>Gross Total</span>
                            <span>€{data.grossSalary?.toLocaleString('en-US', { minimumFractionDigits: 2 }) || '0.00'}</span>
                        </div>
                        <div className="flex justify-between items-center text-2xl font-bold bg-muted/30 p-4 rounded-lg mt-2">
                            <span>Net Pay</span>
                            <span className="text-emerald-600">€{data.netSalary?.toLocaleString('en-US', { minimumFractionDigits: 2 }) || '0.00'}</span>
                        </div>
                    </div>

                    {data.notes && (
                        <div className="text-sm bg-yellow-50 dark:bg-yellow-900/10 p-3 rounded-md text-yellow-800 dark:text-yellow-200 border border-yellow-100 dark:border-yellow-900/20">
                            <p className="text-xs font-bold uppercase opacity-50 mb-1">Notes</p>
                            {data.notes}
                        </div>
                    )}

                    {data.fileName && (
                        <Button variant="outline" className="w-full gap-2 h-12" onClick={() => window.open(data.fileUrl || '#', '_blank')}>
                            <FileText className="w-4 h-4 text-primary" />
                            <div className="flex flex-col items-start flex-1 text-left">
                                <span className="text-sm font-medium leading-none">Original Document</span>
                                <span className="text-[10px] text-muted-foreground">{data.fileName}</span>
                            </div>
                            <Download className="w-4 h-4 text-muted-foreground" />
                        </Button>
                    )}
                </div>
            </DialogContent>
        </Dialog>
    );
}
