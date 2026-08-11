import { useEffect, useRef, useState } from "react";
import { format } from "date-fns";
import { getDocument, GlobalWorkerOptions, type PDFDocumentProxy } from "pdfjs-dist";
import pdfWorker from 'pdfjs-dist/build/pdf.worker.min.mjs?url';
import {
    Dialog,
    DialogContent,
    DialogHeader,
    DialogTitle,
} from "@/components/ui/dialog";
import type { SalaryRecord } from "./salary.types";
import { fetchAPI, fetchBlob } from "@/lib/api";
import { FileText, Eye, ArrowLeft, Building2, Loader2, ZoomIn, ZoomOut } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";

GlobalWorkerOptions.workerSrc = pdfWorker;

// Helper to fix potential encoding issues (Latin1 treated as UTF-8)
const fixEncoding = (str: string) => {
    try {
        return decodeURIComponent(escape(str));
    } catch {
        return str;
    }
};

interface SalaryDetailModalProps {
    salaryId: string | null;
    onClose: () => void;
}

export default function SalaryDetailModal({ salaryId, onClose }: SalaryDetailModalProps) {
    const [data, setData] = useState<SalaryRecord | null>(null);
    const [pdfUrl, setPdfUrl] = useState<string | null>(null);
    const [pdfSalaryId, setPdfSalaryId] = useState<string | null>(null);
    const [pdfDocument, setPdfDocument] = useState<PDFDocumentProxy | null>(null);
    const [pdfPageCount, setPdfPageCount] = useState(0);
    const [pdfZoom, setPdfZoom] = useState(1);
    const [isPdfOpen, setIsPdfOpen] = useState(false);
    const [isPdfLoading, setIsPdfLoading] = useState(false);
    const [pdfError, setPdfError] = useState<string | null>(null);
    const canvasRefs = useRef<Record<number, HTMLCanvasElement | null>>({});

    useEffect(() => {
        if (salaryId) {
            fetchAPI<SalaryRecord>(`/salary/${salaryId}`).then(setData).catch(console.error);
        } else {
            // eslint-disable-next-line
            setData(null);
        }
    }, [salaryId]);

    useEffect(() => {
        return () => {
            if (pdfUrl) URL.revokeObjectURL(pdfUrl);
        };
    }, [pdfUrl]);

    useEffect(() => {
        if (!pdfUrl) return;

        let cancelled = false;
        const loadingTask = getDocument({ url: pdfUrl });
        loadingTask.onPassword = (_callback: (password: string) => void, _reason: number) => {
            void _callback;
            void _reason;
            if (!cancelled) setPdfError("Este documento está protegido con contraseña y no se puede mostrar aquí.");
        };

        loadingTask.promise
            .then((document) => {
                if (cancelled) return;
                setPdfDocument(document);
                setPdfPageCount(document.numPages);
            })
            .catch((error) => {
                if (!cancelled) {
                    console.error(error);
                    setPdfError("No se ha podido interpretar el PDF.");
                }
            })
            .finally(() => {
                if (!cancelled) setIsPdfLoading(false);
            });

        return () => {
            cancelled = true;
            void loadingTask.destroy();
        };
    }, [pdfUrl]);

    useEffect(() => {
        if (!pdfDocument || !pdfPageCount) return;

        let cancelled = false;
        const renderPages = async () => {
            setIsPdfLoading(true);
            try {
                for (let pageNumber = 1; pageNumber <= pdfPageCount; pageNumber += 1) {
                    if (cancelled) return;
                    const canvas = canvasRefs.current[pageNumber];
                    if (!canvas) continue;

                    const page = await pdfDocument.getPage(pageNumber);
                    const viewport = page.getViewport({ scale: 1.25 * pdfZoom });
                    const context = canvas.getContext('2d');
                    if (!context) continue;

                    canvas.width = viewport.width;
                    canvas.height = viewport.height;
                    await page.render({ canvas, canvasContext: context, viewport }).promise;
                }
            } catch (error) {
                if (!cancelled) {
                    console.error(error);
                    setPdfError("No se ha podido renderizar el PDF.");
                }
            } finally {
                if (!cancelled) setIsPdfLoading(false);
            }
        };

        void renderPages();
        return () => {
            cancelled = true;
        };
    }, [pdfDocument, pdfPageCount, pdfZoom]);

    const openPdf = async () => {
        if (!data?.fileName) return;
        setIsPdfOpen(true);
        setPdfError(null);
        if (pdfUrl && pdfSalaryId === data.id) return;

        if (pdfUrl) URL.revokeObjectURL(pdfUrl);
        setPdfUrl(null);
        setPdfDocument(null);
        setPdfPageCount(0);
        setPdfZoom(1);

        try {
            setIsPdfLoading(true);
            const blob = await fetchBlob(`/salary/${data.id}/file`);
            setPdfUrl(URL.createObjectURL(blob));
            setPdfSalaryId(data.id);
        } catch (error) {
            console.error(error);
            setPdfError("No se ha podido cargar el documento.");
        } finally {
            setIsPdfLoading(false);
        }
    };

    const closePdf = () => {
        setIsPdfOpen(false);
        setPdfError(null);
    };

    if (!salaryId || !data) return null;

    const payments = data.breakdown?.filter(i => i.type === 'payment') || [];
    const deductions = data.breakdown?.filter(i => i.type === 'deduction') || [];

    const detailsContent = (
        <div className="p-6 space-y-6">
            {/* Breakdown List */}
            <div className="space-y-4">
                {payments.length > 0 && (
                    <div>
                        <h4 className="text-xs font-semibold text-muted-foreground uppercase mb-2">Earnings (Devengos)</h4>
                        <div className="space-y-2">
                            {payments.map((item, i) => (
                                <div key={i} className="flex justify-between gap-4 text-sm">
                                    <span>{item.concept}</span>
                                    <span className="shrink-0 font-medium">€{item.amount.toLocaleString('en-US', { minimumFractionDigits: 2 })}</span>
                                </div>
                            ))}
                        </div>
                    </div>
                )}

                {deductions.length > 0 && (
                    <div>
                        <h4 className="text-xs font-semibold uppercase mb-2 text-rose-500">Deductions</h4>
                        <div className="space-y-2">
                            {deductions.map((item, i) => (
                                <div key={i} className="flex justify-between gap-4 text-sm text-muted-foreground">
                                    <span>{item.concept}</span>
                                    <span className="shrink-0 text-rose-500">- €{item.amount.toLocaleString('en-US', { minimumFractionDigits: 2 })}</span>
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
        </div>
    );

    return (
        <Dialog open={!!salaryId} onOpenChange={(open) => !open && onClose()}>
            <DialogContent className={isPdfOpen ? "max-w-6xl w-[96vw] h-[90vh] p-0 overflow-hidden gap-0" : "max-w-lg p-0 overflow-hidden gap-0"}>
                {isPdfOpen ? (
                    <div className="grid h-full min-h-0 grid-cols-1 lg:grid-cols-[minmax(300px,0.4fr)_minmax(0,0.6fr)]">
                        <aside className="min-h-0 overflow-y-auto border-b bg-background lg:border-b-0 lg:border-r">
                            <div className="bg-primary/5 p-5 border-b">
                                <p className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">Payslip Details</p>
                                <div className="mt-2 flex items-center gap-2">
                                    <Badge variant="outline" className="bg-background">{format(new Date(data.date), "MMM yyyy")}</Badge>
                                    <span className="truncate text-sm font-semibold">{data.company}</span>
                                </div>
                            </div>
                            {detailsContent}
                        </aside>

                        <section className="flex min-h-0 min-w-0 flex-col">
                            <DialogHeader className="shrink-0 flex-row items-center justify-between border-b px-5 py-3">
                                <div className="flex min-w-0 items-center">
                                    <Button variant="ghost" size="icon" onClick={closePdf} aria-label="Back to details">
                                        <ArrowLeft className="h-4 w-4" />
                                    </Button>
                                    <DialogTitle className="ml-2 truncate">{fixEncoding(data.fileName || "Payslip")}</DialogTitle>
                                </div>
                                <div className="flex items-center gap-1">
                                    <Button variant="ghost" size="icon" onClick={() => setPdfZoom((zoom) => Math.max(0.75, zoom - 0.25))} aria-label="Zoom out">
                                        <ZoomOut className="h-4 w-4" />
                                    </Button>
                                    <span className="w-12 text-center text-xs text-muted-foreground">{Math.round(pdfZoom * 100)}%</span>
                                    <Button variant="ghost" size="icon" onClick={() => setPdfZoom((zoom) => Math.min(2.5, zoom + 0.25))} aria-label="Zoom in">
                                        <ZoomIn className="h-4 w-4" />
                                    </Button>
                                </div>
                            </DialogHeader>
                            <div className="min-h-0 flex-1 overflow-y-auto overflow-x-auto bg-muted/30 p-4">
                                {isPdfLoading && (
                                    <div className="flex h-full items-center justify-center gap-2 text-sm text-muted-foreground">
                                        <Loader2 className="h-4 w-4 animate-spin" /> Loading document…
                                    </div>
                                )}
                                {pdfError && <p className="p-6 text-center text-sm text-destructive">{pdfError}</p>}
                                {pdfDocument && !pdfError && (
                                    <div className="flex min-w-full flex-col items-center gap-4">
                                        {Array.from({ length: pdfPageCount }, (_, index) => index + 1).map((pageNumber) => (
                                            <canvas
                                                key={pageNumber}
                                                ref={(canvas) => { canvasRefs.current[pageNumber] = canvas; }}
                                                className="rounded bg-white shadow-sm"
                                                style={{ maxWidth: pdfZoom <= 1 ? '100%' : 'none' }}
                                            />
                                        ))}
                                    </div>
                                )}
                            </div>
                        </section>
                    </div>
                ) : (
                <>
                <div className="bg-primary/5 p-6 border-b">
                    <DialogHeader className="mb-4">
                        <DialogTitle className="flex justify-start items-center gap-3">
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

                {detailsContent}
                <div className="px-6 pb-6">
                    {data.fileName && (
                        <Button variant="outline" className="w-full gap-2 h-12" onClick={openPdf}>
                            <FileText className="w-4 h-4 text-primary" />
                            <div className="flex flex-col items-start flex-1 text-left">
                                <span className="text-sm font-medium leading-none">Ver documento</span>
                                <span className="text-[10px] text-muted-foreground">{fixEncoding(data.fileName)}</span>
                            </div>
                            <Eye className="w-4 h-4 text-muted-foreground" />
                        </Button>
                    )}
                </div>
                </>
                )}
            </DialogContent>
        </Dialog>
    );
}
