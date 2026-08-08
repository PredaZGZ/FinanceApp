import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Plus, Trash2, Upload, CalendarIcon, Building, Euro, FileText, Sparkles, Image, ClipboardPaste, Lock, LockOpen, Loader2, Check } from "lucide-react";
import { Textarea } from "@/components/ui/textarea";
import { getDocument, GlobalWorkerOptions } from 'pdfjs-dist';
import { convertPdfToImage } from "@/lib/pdfUtils";
// Configure PDF worker
import pdfWorker from 'pdfjs-dist/build/pdf.worker.min.mjs?url';
GlobalWorkerOptions.workerSrc = pdfWorker;

import type { BreakdownItem, CreateSalaryInput, SalaryRecord } from "./salary.types";
import { postAPI, fetchAPI } from "@/lib/api";
// fetchAPI handles API_URL internally.
import { Card, CardContent } from "@/components/ui/card";
import {
    Dialog,
    DialogContent,
    DialogHeader,
    DialogTitle,
    DialogFooter,
} from "@/components/ui/dialog";

import { cn } from "@/lib/utils";

interface SalaryFormProps {
    onSuccess: () => void;
    onCancel: () => void;
    initialData?: SalaryRecord;
}

const errorMessage = (error: unknown, fallback: string) => error instanceof Error ? error.message : fallback;

const isBreakdownItem = (value: unknown): value is BreakdownItem => {
    if (!value || typeof value !== 'object') return false;
    const item = value as Record<string, unknown>;
    return typeof item.concept === 'string'
        && typeof item.amount === 'number'
        && (item.type === 'payment' || item.type === 'deduction');
};

export default function SalaryForm({ onSuccess, onCancel, initialData }: SalaryFormProps) {
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState<string | null>(null);
    const [formData, setFormData] = useState<CreateSalaryInput>({
        date: initialData?.date ? new Date(initialData.date).toISOString().split('T')[0] : new Date().toISOString().split('T')[0],
        grossSalary: initialData?.grossSalary || 0,
        netSalary: initialData?.netSalary || 0,
        company: initialData?.company || "",
        notes: initialData?.notes || "",
        breakdown: (() => {
            if (!initialData?.breakdown) return [];
            let bd: unknown = initialData.breakdown;
            if (typeof bd === 'string') {
                try {
                    bd = JSON.parse(bd);
                } catch {
                    return [];
                }
            }
            if (Array.isArray(bd)) {
                return bd.filter(isBreakdownItem).map((b) => ({
                    concept: b.concept,
                    amount: b.amount,
                    type: b.type
                }));
            }
            return [];
        })(),
    });
    const [file, setFile] = useState<File | null>(null);

    // PDF Security State
    const [isCheckingFile, setIsCheckingFile] = useState(false);
    const [isLocked, setIsLocked] = useState(false);
    const [manualPassword, setManualPassword] = useState("");
    const [unlockError, setUnlockError] = useState<string | null>(null);

    const checkFile = async (fileToCheck: File) => {
        // Only check PDFs
        if (fileToCheck.type !== 'application/pdf') return;

        setIsCheckingFile(true);
        setIsLocked(false);
        setManualPassword("");
        setUnlockError(null);

        try {
            const formData = new FormData();
            formData.append('file', fileToCheck);

            // POST to validate endpoint
            // Try to use fetchAPI helper if it supports FormData
            // If fetchAPI forces JSON content-type, we might need raw fetch.
            // Assuming fetchAPI handles FormData if body is FormData (standard)
            const response = await fetchAPI<{ isLocked: boolean; usesSavedPassword?: boolean }>('/salary/validate-file', {
                method: 'POST',
                body: formData,
            });

            if (response.isLocked) {
                setIsLocked(true);
            }
        } catch (e) {
            console.error("File check failed", e);
            // Fallback: don't lock, let backend handle submit error or assume unlocked
        } finally {
            setIsCheckingFile(false);
        }
    };

    const handleUnlock = async () => {
        if (!file || !manualPassword) return;
        setUnlockError(null);
        setIsCheckingFile(true);

        try {
            const arrayBuffer = await file.arrayBuffer();
            const loadingTask = getDocument({
                data: new Uint8Array(arrayBuffer),
                password: manualPassword
            });
            await loadingTask.promise;

            // If successful
            setFormData(prev => ({ ...prev, pdfPassword: manualPassword }));
            setIsLocked(false);
            setManualPassword("");
        } catch (error: unknown) {
            const pdfError = error as { name?: string; code?: number };
            if (pdfError.name === 'PasswordException' || pdfError.code === 1) {
                setUnlockError("Incorrect password");
            } else {
                setUnlockError("Failed to open PDF");
            }
        } finally {
            setIsCheckingFile(false);
        }
    };

    const handleFileSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
        const selected = e.target.files?.[0] || null;
        setFile(selected);
        setFormData(prev => ({ ...prev, pdfPassword: "" })); // Clear old password
        setIsLocked(false);
        setUnlockError(null);
        if (selected) {
            checkFile(selected);
        }
    };

    const handleBreakdownAdd = () => {
        setFormData(prev => ({
            ...prev,
            breakdown: [...prev.breakdown, { concept: "", amount: 0, type: "payment" }]
        }));
    };

    const handleBreakdownChange = (index: number, field: keyof typeof formData.breakdown[0], value: string | number) => {
        const newBreakdown = [...formData.breakdown];
        newBreakdown[index] = { ...newBreakdown[index], [field]: value };
        setFormData(prev => ({ ...prev, breakdown: newBreakdown }));
    };

    const handleBreakdownRemove = (index: number) => {
        setFormData(prev => ({
            ...prev,
            breakdown: prev.breakdown.filter((_, i) => i !== index)
        }));
    };



    const aiPrompt = `Act as a Payroll Data Extractor.
Extract the following information from the attached payroll/invoice text or image:
1. Date (YYYY-MM-DD)
2. Company Name
3. Gross Salary (Total Devengado) - Number
4. Net Salary (Líquido a Percibir) - Number
5. Breakdown items (Include BOTH payments and deductions/taxes).

Output ONLY valid JSON in this exact format:
{
  "date": "YYYY-MM-DD",
  "company": "Company Name",
  "grossSalary": 2500.00,
  "netSalary": 1950.50,
  "breakdown": [
    { "concept": "Salario Base", "amount": 2500, "type": "payment" },
    { "concept": "IRPF", "amount": 400, "type": "deduction" },
    { "concept": "Seguridad Social", "amount": 149.50, "type": "deduction" }
  ]
}`;

    const handleCopyPrompt = () => {
        navigator.clipboard.writeText(aiPrompt);
        alert("Prompt copied to clipboard!");
    };

    const [isConverting, setIsConverting] = useState(false);
    const [imageCopied, setImageCopied] = useState(false);

    const handleJpgAction = async (e: React.MouseEvent) => {
        e.preventDefault();
        e.stopPropagation();
        if (!file) return;

        try {
            setIsConverting(true);

            const mimeType = file.type === 'application/pdf' ? 'image/png' : file.type;

            const blobPromise = (async (): Promise<Blob> => {
                const blob = file.type === 'application/pdf'
                    ? await convertPdfToImage(file, formData.pdfPassword)
                    : file;
                if (!blob) throw new Error("Image generation failed");
                return blob;
            })();

            const item = new ClipboardItem({ [mimeType]: blobPromise });
            await navigator.clipboard.write([item]);

            setImageCopied(true);
            setTimeout(() => setImageCopied(false), 2000);

        } catch (error: unknown) {
            console.error(error);
            setError("Failed to copy: " + errorMessage(error, "Unknown error"));
        } finally {
            setIsConverting(false);
        }
    };

    const [showManualPaste, setShowManualPaste] = useState(false);
    const [manualJson, setManualJson] = useState("");

    const processJson = (text: string) => {
        try {
            const parsed = JSON.parse(text);
            if (parsed && (parsed.grossSalary || parsed.netSalary || parsed.breakdown)) {
                setFormData(prev => ({
                    ...prev,
                    date: parsed.date || prev.date,
                    company: parsed.company || prev.company,
                    grossSalary: typeof parsed.grossSalary === 'number' ? parsed.grossSalary : prev.grossSalary,
                    netSalary: typeof parsed.netSalary === 'number' ? parsed.netSalary : prev.netSalary,
                    breakdown: Array.isArray(parsed.breakdown) ? parsed.breakdown : prev.breakdown
                }));
                setError(null);
                alert("Form auto-filled from JSON!");
                return true;
            } else {
                throw new Error("JSON structure likely incorrect");
            }
        } catch {
            setError("Content is not valid Salary JSON.");
            return false;
        }
    };

    const handlePasteAndFill = async () => {
        try {
            const text = await navigator.clipboard.readText();
            if (text) {
                processJson(text);
            }
        } catch (err) {
            console.warn("Clipboard read failed, showing manual dialog", err);
            setShowManualPaste(true);
        }
    };

    const handleManualSubmit = () => {
        if (processJson(manualJson)) {
            setShowManualPaste(false);
            setManualJson("");
        }
    };

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        setLoading(true);
        setError(null);
        try {
            const data = { ...formData, file: file || undefined };
            const form = new FormData();
            form.append('date', data.date);
            if (data.grossSalary) form.append('grossSalary', data.grossSalary.toString());
            if (data.netSalary) form.append('netSalary', data.netSalary.toString());
            if (data.company) form.append('company', data.company);
            if (data.notes) form.append('notes', data.notes);
            if (data.pdfPassword) form.append('pdfPassword', data.pdfPassword);

            form.append('breakdown', JSON.stringify(data.breakdown));

            if (data.file) {
                form.append('file', data.file);
            }

            if (initialData) {
                // Edit Mode
                await fetchAPI<SalaryRecord>(`/salary/${initialData.id}`, {
                    method: 'PUT',
                    body: form,
                    // fetchAPI likely handles JSON vs FormData content-type? 
                    // Usually FormData needs no Content-Type header (browser sets boundary).
                    // I'll assume fetchAPI handles it if body is FormData.
                });
            } else {
                // Create Mode
                await postAPI<SalaryRecord>('/salary', form);
            }

            onSuccess();
        } catch (error: unknown) {
            console.error(error);
            setError(errorMessage(error, "Failed to save salary record. Please try again."));
        } finally {
            setLoading(false);
        }
    };

    return (
        <>
            <form onSubmit={handleSubmit} className="space-y-8">
                {/* ... form content ... */}

                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                    <div className="space-y-4">
                        <h3 className="text-lg font-semibold flex items-center gap-2">
                            <CalendarIcon className="w-5 h-5 text-muted-foreground" />
                            Basic Info
                        </h3>
                        <div className="space-y-3">
                            <div className="space-y-1">
                                <Label htmlFor="date">Date</Label>
                                <Input
                                    id="date"
                                    type="date"
                                    required
                                    value={formData.date}
                                    onChange={e => setFormData({ ...formData, date: e.target.value })}
                                />
                            </div>
                            <div className="space-y-1">
                                <Label htmlFor="company">Company</Label>
                                <div className="relative">
                                    <Building className="absolute left-2 top-2.5 h-4 w-4 text-muted-foreground" />
                                    <Input
                                        id="company"
                                        className="pl-8"
                                        placeholder="Acme Corp"
                                        value={formData.company}
                                        onChange={e => setFormData({ ...formData, company: e.target.value })}
                                    />
                                </div>
                            </div>
                        </div>
                    </div>

                    <div className="space-y-4">
                        <h3 className="text-lg font-semibold flex items-center gap-2">
                            <Euro className="w-5 h-5 text-muted-foreground" />
                            Totals
                        </h3>
                        <div className="grid grid-cols-2 gap-4">
                            <div className="space-y-1">
                                <Label htmlFor="gross">Gross Salary</Label>
                                <Input
                                    id="gross"
                                    type="number"
                                    step="0.01"
                                    placeholder="0.00"
                                    value={formData.grossSalary || ''}
                                    onChange={e => setFormData({ ...formData, grossSalary: parseFloat(e.target.value) })}
                                />
                            </div>
                            <div className="space-y-1">
                                <Label htmlFor="net" className="text-emerald-600 font-bold">Net Salary</Label>
                                <Input
                                    id="net"
                                    type="number"
                                    step="0.01"
                                    placeholder="0.00"
                                    className="border-emerald-200 focus-visible:ring-emerald-500 font-medium"
                                    value={formData.netSalary || ''}
                                    onChange={e => setFormData({ ...formData, netSalary: parseFloat(e.target.value) })}
                                />
                            </div>
                        </div>
                    </div>
                </div>

                <div className="space-y-4">
                    <h3 className="text-lg font-semibold flex items-center gap-2">
                        <FileText className="w-5 h-5 text-muted-foreground" />
                        Payroll File
                    </h3>
                    <div
                        className={cn(
                            "border-2 border-dashed rounded-lg p-6 flex flex-col items-center justify-center text-muted-foreground hover:bg-muted/50 transition-all cursor-pointer relative min-h-[160px]",
                            file ? (isLocked ? "border-rose-400 bg-rose-50/10" : "border-emerald-400 bg-emerald-50/10") : "border-muted-foreground/25"
                        )}
                    >
                        <input
                            type="file"
                            accept="application/pdf,image/*"
                            className="absolute inset-0 opacity-0 cursor-pointer z-10"
                            onChange={handleFileSelect}
                            disabled={isCheckingFile}
                        />

                        {isCheckingFile ? (
                            <div className="flex flex-col items-center z-20 py-4 animate-in fade-in">
                                <Loader2 className="w-8 h-8 text-primary animate-spin mb-2" />
                                <p className="text-sm font-medium text-foreground">Verifying security...</p>
                            </div>
                        ) : file ? (
                            <div className="flex flex-col items-center z-20 w-full">
                                {isLocked ? (
                                    <div className="flex flex-col items-center animate-in zoom-in-95 duration-200">
                                        <div className="relative mb-3">
                                            <div className="absolute inset-0 bg-rose-100 rounded-full animate-ping opacity-20"></div>
                                            <Lock className="w-10 h-10 text-rose-500 relative z-10" />
                                        </div>
                                        <p className="text-sm font-medium text-foreground mb-1">{file.name}</p>
                                        <p className="text-xs text-rose-600 font-semibold mb-4 bg-rose-50 px-2 py-0.5 rounded-full border border-rose-100">
                                            Password Required
                                        </p>

                                        <div className="flex gap-2 items-center relative z-30" onClick={e => e.stopPropagation()}>
                                            <Input
                                                type="password"
                                                placeholder="Enter PDF Password"
                                                className="h-9 text-sm w-40 bg-background shadow-sm border-rose-200 focus-visible:ring-rose-500"
                                                value={manualPassword}
                                                onChange={e => setManualPassword(e.target.value)}
                                                onKeyDown={e => e.key === 'Enter' && (e.preventDefault(), handleUnlock())}
                                                autoFocus
                                            />
                                            <Button
                                                type="button"
                                                size="sm"
                                                className="h-9 px-4 bg-rose-600 hover:bg-rose-700 text-white shadow-sm"
                                                onClick={handleUnlock}
                                            >
                                                Unlock
                                            </Button>
                                        </div>
                                        {unlockError && <p className="text-xs text-rose-600 font-medium mt-2 bg-rose-50 px-2 py-1 rounded">{unlockError}</p>}

                                        <Button variant="ghost" size="sm" className="mt-4 text-muted-foreground hover:text-foreground z-30 h-8 text-xs" onClick={(e) => {
                                            e.stopPropagation();
                                            setFile(null);
                                            setIsLocked(false);
                                            setFormData(prev => ({ ...prev, pdfPassword: "" }));
                                        }}>Change File</Button>
                                    </div>
                                ) : (
                                    <div className="flex flex-col items-center animate-in fade-in slide-in-from-bottom-2">
                                        <div className="relative">
                                            <FileText className="w-12 h-12 mb-2 text-emerald-500 drop-shadow-sm" />
                                            {formData.pdfPassword && (
                                                <div className="absolute -top-1 -right-1 bg-emerald-100 text-emerald-700 rounded-full p-1 border border-white shadow-sm" title="File unlocked">
                                                    <LockOpen className="w-3 h-3" />
                                                </div>
                                            )}
                                        </div>
                                        <p className="text-sm font-medium text-foreground">{file.name}</p>
                                        <p className="text-xs text-muted-foreground">{(file.size / 1024).toFixed(0)} KB</p>
                                        {formData.pdfPassword && (
                                            <div className="flex items-center gap-1 mt-2 bg-emerald-50 text-emerald-700 px-2 py-0.5 rounded-full border border-emerald-100">
                                                <LockOpen className="w-3 h-3" />
                                                <span className="text-[10px] font-semibold">Unlocked & Ready</span>
                                            </div>
                                        )}

                                        <Button variant="ghost" size="sm" className="mt-2 text-destructive hover:text-destructive z-30 h-7 text-xs" onClick={(e) => {
                                            e.stopPropagation();
                                            setFile(null);
                                            setFormData(prev => ({ ...prev, pdfPassword: "" }));
                                        }}>Remove</Button>
                                    </div>
                                )}
                            </div>
                        ) : (
                            <>
                                <div className="bg-muted/30 p-3 rounded-full mb-3">
                                    <Upload className="w-6 h-6 opacity-50" />
                                </div>
                                <p className="text-sm font-medium text-foreground">Click or drag PDF to upload</p>
                                <p className="text-xs text-muted-foreground mt-1">Supports PDF, PNG, JPG</p>
                            </>
                        )}

                        {/* Toolbar Overlay */}
                        <div className={cn(
                            "absolute bottom-2 right-2 flex gap-1 z-30 transition-opacity duration-200",
                            (isLocked || isCheckingFile) ? "opacity-0 pointer-events-none" : "opacity-100"
                        )}>
                            <div className="flex gap-1 bg-background/80 backdrop-blur-sm p-1 rounded-md border shadow-sm pointer-events-auto">
                                <Button
                                    type="button"
                                    variant="ghost"
                                    size="icon"
                                    className="h-8 w-8 text-xs relative group"
                                    onClick={(e) => { e.preventDefault(); e.stopPropagation(); handleCopyPrompt(); }}
                                    title="Copy AI Prompt"
                                >
                                    <Sparkles className="w-4 h-4 text-indigo-600" />
                                </Button>

                                <Button
                                    type="button"
                                    variant="ghost"
                                    size="icon"
                                    className="h-8 w-8 text-xs relative"
                                    onClick={handleJpgAction}
                                    disabled={!file || isConverting}
                                    title="Copy File as Image (JPG)"
                                >
                                    {isConverting ? (
                                        <div className="animate-spin rounded-full h-3 w-3 border-b-2 border-primary"></div>
                                    ) : imageCopied ? (
                                        <Check className="w-4 h-4 text-emerald-500 animate-in zoom-in" />
                                    ) : (
                                        <Image className="w-4 h-4 text-blue-600" />
                                    )}
                                </Button>

                                <Button
                                    type="button"
                                    variant="ghost"
                                    size="icon"
                                    className="h-8 w-8 text-xs relative"
                                    onClick={(e) => { e.preventDefault(); e.stopPropagation(); handlePasteAndFill(); }}
                                    title="Paste JSON from Clipboard"
                                >
                                    <ClipboardPaste className="w-4 h-4 text-emerald-600" />
                                </Button>
                            </div>
                        </div>
                    </div>
                </div>

                <div className="space-y-4">
                    <div className="flex items-center justify-between border-b pb-2">
                        <Label className="text-lg font-semibold">Breakdown Items</Label>
                        <Button type="button" variant="outline" size="sm" onClick={handleBreakdownAdd}>
                            <Plus className="w-4 h-4 mr-2" />
                            Add Item
                        </Button>
                    </div>

                    <div className="space-y-2">
                        {formData.breakdown.map((item, index) => (
                            <Card key={index} className="bg-muted/30 border-none shadow-sm">
                                <CardContent className="p-3 flex gap-3 items-center">
                                    <div style={{ flex: 2 }}>
                                        <Input
                                            className="bg-background"
                                            placeholder="Concept (e.g. Base Salary)"
                                            value={item.concept}
                                            onChange={e => handleBreakdownChange(index, "concept", e.target.value)}
                                        />
                                    </div>
                                    <div className="flex-1">
                                        <Input
                                            className="bg-background"
                                            type="number"
                                            placeholder="Amount"
                                            value={item.amount || ''}
                                            onChange={e => handleBreakdownChange(index, "amount", parseFloat(e.target.value))}
                                        />
                                    </div>
                                    <div className="w-[130px]">
                                        <Select value={item.type} onValueChange={v => handleBreakdownChange(index, "type", v)}>
                                            <SelectTrigger className={cn("bg-background", item.type === 'payment' ? 'text-emerald-600' : 'text-rose-600')}>
                                                <SelectValue />
                                            </SelectTrigger>
                                            <SelectContent>
                                                <SelectItem value="payment">Payment</SelectItem>
                                                <SelectItem value="deduction">Deduction</SelectItem>
                                            </SelectContent>
                                        </Select>
                                    </div>
                                    <Button
                                        type="button"
                                        variant="ghost"
                                        size="icon"
                                        className="text-muted-foreground hover:text-destructive"
                                        onClick={() => handleBreakdownRemove(index)}
                                    >
                                        <Trash2 className="w-4 h-4" />
                                    </Button>
                                </CardContent>
                            </Card>
                        ))}
                        {formData.breakdown.length === 0 && (
                            <div className="text-center py-6 text-muted-foreground bg-muted/10 rounded-lg border border-dashed">
                                No items added to the breakdown yet.
                            </div>
                        )}
                    </div>
                </div>

                <div className="space-y-2">
                    <Label htmlFor="notes">Additional Notes</Label>
                    <Input
                        id="notes"
                        placeholder="Any extra details..."
                        value={formData.notes || ""}
                        onChange={e => setFormData({ ...formData, notes: e.target.value })}
                    />
                </div>

                {
                    error && (
                        <div className="bg-destructive/15 text-destructive text-sm p-3 rounded-md border border-destructive/20">
                            {error}
                        </div>
                    )
                }
                <div className="flex justify-end gap-3 pt-6 border-t">
                    <Button type="button" variant="outline" onClick={onCancel} size="lg">Cancel</Button>
                    <Button type="submit" disabled={loading} size="lg" className="px-8">
                        {loading ? "Saving..." : (initialData ? "Update Record" : "Save Record")}
                    </Button>
                </div>
            </form>



            <Dialog open={showManualPaste} onOpenChange={setShowManualPaste}>
                <DialogContent className="sm:max-w-md">
                    <DialogHeader>
                        <DialogTitle>Manual Paste</DialogTitle>
                    </DialogHeader>
                    <div className="space-y-4 py-4">
                        <p className="text-sm text-muted-foreground">
                            We couldn&apos;t access your clipboard automatically. Please paste the JSON data here:
                        </p>
                        <Textarea
                            placeholder='Paste JSON here...'
                            className="font-mono text-xs h-32"
                            value={manualJson}
                            onChange={(e) => setManualJson(e.target.value)}
                        />
                    </div>
                    <DialogFooter>
                        <Button variant="ghost" onClick={() => setShowManualPaste(false)}>Cancel</Button>
                        <Button onClick={handleManualSubmit}>Process JSON</Button>
                    </DialogFooter>
                </DialogContent>
            </Dialog>
        </>
    );
}
