import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Plus, Trash2, Upload, CalendarIcon, Building, Euro, FileText, Sparkles, Image, ClipboardPaste, Copy } from "lucide-react";
import { Textarea } from "@/components/ui/textarea";

import type { CreateSalaryInput, SalaryRecord } from "./salary.types";
import { postAPI, fetchAPI } from "@/lib/api";
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
            let bd = initialData.breakdown;
            if (typeof bd === 'string') {
                try {
                    bd = JSON.parse(bd);
                } catch {
                    return [];
                }
            }
            if (Array.isArray(bd)) {
                return bd.map((b: any) => ({
                    concept: b.concept,
                    amount: b.amount,
                    type: b.type
                }));
            }
            return [];
        })(),
    });
    const [file, setFile] = useState<File | null>(null);

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
    const [previewInfo, setPreviewInfo] = useState<{ blob: Blob, url: string } | null>(null);

    const handleJpgAction = async (e: React.MouseEvent) => {
        e.preventDefault();
        e.stopPropagation();
        if (!file) return;

        try {
            setIsConverting(true);
            let blob: Blob | null = null;

            if (file.type === 'application/pdf') {
                const { convertPdfToImage } = await import("@/lib/pdfUtils");
                blob = await convertPdfToImage(file, formData.pdfPassword);
            } else if (file.type.startsWith('image/')) {
                blob = file;
            }

            if (blob) {
                const url = URL.createObjectURL(blob);
                setPreviewInfo({ blob, url });
            } else {
                throw new Error("Could not process file to image");
            }

        } catch (err: any) {
            console.error(err);
            setError("Failed to convert image: " + err.message);
        } finally {
            setIsConverting(false);
        }
    };

    const handleCopyPreview = async () => {
        if (!previewInfo) return;
        try {
            const item = new ClipboardItem({ [previewInfo.blob.type]: previewInfo.blob });
            await navigator.clipboard.write([item]);
            alert("Image copied to clipboard!");
            setPreviewInfo(null); // Close after copy
        } catch (err: any) {
            console.error(err);
            setError("Failed to copy from preview: " + err.message);
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
        } catch (jsonErr) {
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
        } catch (err: any) {
            console.error(err);
            setError(err.message || "Failed to save salary record. Please try again.");
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
                            "border-2 border-dashed rounded-lg p-6 flex flex-col items-center justify-center text-muted-foreground hover:bg-muted/50 transition-all cursor-pointer relative",
                            file ? "border-emerald-400 bg-emerald-50/10" : "border-muted-foreground/25"
                        )}
                    >
                        <input
                            type="file"
                            accept="application/pdf,image/*"
                            className="absolute inset-0 opacity-0 cursor-pointer z-10"
                            onChange={e => setFile(e.target.files?.[0] || null)}
                        />
                        {file ? (
                            <div className="flex flex-col items-center z-20">
                                <FileText className="w-10 h-10 mb-2 text-emerald-500" />
                                <p className="text-sm font-medium text-foreground">{file.name}</p>
                                <p className="text-xs text-muted-foreground">{(file.size / 1024).toFixed(0)} KB</p>
                                <Button variant="ghost" size="sm" className="mt-2 text-destructive hover:text-destructive" onClick={(e) => {
                                    e.stopPropagation();
                                    e.preventDefault();
                                    setFile(null);
                                }}>Remove</Button>
                            </div>
                        ) : (
                            <>
                                <Upload className="w-10 h-10 mb-2 opacity-50" />
                                <p className="text-sm font-medium">Click or drag PDF to upload</p>
                                <p className="text-xs text-muted-foreground mt-1">Supports PDF, PNG, JPG</p>
                            </>
                        )}

                        {/* Toolbar Overlay */}
                        <div className="absolute bottom-2 right-2 flex gap-1 z-30 pointer-events-none">
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
                                    {isConverting ? <div className="animate-spin rounded-full h-3 w-3 border-b-2 border-primary"></div> : <Image className="w-4 h-4 text-blue-600" />}
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

                    {file && file.type === 'application/pdf' && (
                        <div className="flex items-center gap-2 animate-in fade-in slide-in-from-top-1 mt-2 justify-center">
                            <Label htmlFor="pdfPass" className="text-xs text-muted-foreground whitespace-nowrap">PDF Password (Optional):</Label>
                            <Input
                                id="pdfPass"
                                type="password"
                                className="h-8 text-xs w-48 bg-background"
                                placeholder="Required if PDF is locked"
                                value={formData.pdfPassword || ''}
                                onChange={e => setFormData({ ...formData, pdfPassword: e.target.value })}
                            />
                        </div>
                    )}
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

            <Dialog open={!!previewInfo} onOpenChange={(open) => !open && setPreviewInfo(null)}>
                <DialogContent className="max-w-4xl max-h-[90vh] overflow-hidden flex flex-col">
                    <DialogHeader>
                        <DialogTitle>Converted Image Preview</DialogTitle>
                    </DialogHeader>

                    <div className="flex-1 overflow-auto bg-muted/20 p-4 rounded-md flex items-center justify-center">
                        {previewInfo && (
                            <img src={previewInfo.url} alt="PDF Preview" className="max-w-full shadow-lg border" />
                        )}
                    </div>

                    <DialogFooter className="gap-2 sm:justify-between">
                        <Button variant="ghost" onClick={() => setPreviewInfo(null)}>Close</Button>
                        <Button onClick={handleCopyPreview} className="bg-indigo-600 hover:bg-indigo-700">
                            <Copy className="w-4 h-4 mr-2" />
                            Copy Image to Clipboard
                        </Button>
                    </DialogFooter>
                </DialogContent>
            </Dialog>

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
