import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Plus, Trash2, Upload, CalendarIcon, Building, DollarSign, FileText, Sparkles, Copy } from "lucide-react";
import { Textarea } from "@/components/ui/textarea";
import type { CreateSalaryInput, SalaryRecord } from "./salary.types";
import { postAPI } from "@/lib/api";
import { Card, CardContent } from "@/components/ui/card";
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { cn } from "@/lib/utils";

interface SalaryFormProps {
    onSuccess: () => void;
    onCancel: () => void;
}

export default function SalaryForm({ onSuccess, onCancel }: SalaryFormProps) {
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState<string | null>(null);
    const [formData, setFormData] = useState<CreateSalaryInput>({
        date: new Date().toISOString().split('T')[0],
        grossSalary: 0,
        netSalary: 0,
        company: "",
        notes: "",
        breakdown: [],
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

    const [showAiHelper, setShowAiHelper] = useState(false);
    const [jsonInput, setJsonInput] = useState("");
    const [parseError, setParseError] = useState(false);

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
    };

    const handleFillForm = () => {
        try {
            const parsed = JSON.parse(jsonInput);
            if (parsed) {
                setFormData(prev => ({
                    ...prev,
                    date: parsed.date || prev.date,
                    company: parsed.company || prev.company,
                    grossSalary: typeof parsed.grossSalary === 'number' ? parsed.grossSalary : prev.grossSalary,
                    netSalary: typeof parsed.netSalary === 'number' ? parsed.netSalary : prev.netSalary,
                    breakdown: Array.isArray(parsed.breakdown) ? parsed.breakdown : prev.breakdown
                }));
                setShowAiHelper(false);
                setParseError(false);
            }
        } catch (err) {
            setParseError(true);
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

            form.append('breakdown', JSON.stringify(data.breakdown));

            if (data.file) {
                form.append('file', data.file);
            }

            await postAPI<SalaryRecord>('/salary', form);
            onSuccess();
        } catch (err: any) {
            console.error(err);
            setError(err.message || "Failed to save salary record. Please try again.");
        } finally {
            setLoading(false);
        }
    };

    return (
        <form onSubmit={handleSubmit} className="space-y-8">
            <Dialog open={showAiHelper} onOpenChange={setShowAiHelper}>
                <div className="flex justify-end">
                    <Button
                        type="button"
                        variant="outline"
                        className="bg-indigo-50 border-indigo-200 text-indigo-700 hover:bg-indigo-100"
                        onClick={() => setShowAiHelper(true)}
                    >
                        <Sparkles className="w-4 h-4 mr-2" />
                        AI Auto-fill
                    </Button>
                </div>

                <DialogContent className="sm:max-w-md">
                    <DialogHeader>
                        <DialogTitle className="flex items-center gap-2">
                            <Sparkles className="w-5 h-5 text-indigo-600" />
                            AI Payroll Extractor
                        </DialogTitle>
                        <DialogDescription>
                            Use Gemini or ChatGPT to extract data from your PDF.
                        </DialogDescription>
                    </DialogHeader>

                    <div className="space-y-4 py-4">
                        <div className="space-y-2">
                            <Label className="text-xs font-semibold uppercase text-muted-foreground">Step 1: Copy Prompt</Label>
                            <div className="flex gap-2">
                                <Button type="button" variant="secondary" size="sm" onClick={handleCopyPrompt} className="w-full">
                                    <Copy className="w-3 h-3 mr-2" />
                                    Copy Extraction Prompt
                                </Button>
                            </div>
                            <p className="text-[10px] text-muted-foreground">
                                Paste this prompt along with your PDF file into your AI chat.
                            </p>
                        </div>

                        <div className="space-y-2">
                            <Label className="text-xs font-semibold uppercase text-muted-foreground">Step 2: Paste JSON Response</Label>
                            <Textarea
                                placeholder='Paste the JSON here (e.g. { "company": "...", ... })'
                                className={cn("font-mono text-xs h-32 resize-none", parseError ? "border-red-500 focus-visible:ring-red-500" : "")}
                                value={jsonInput}
                                onChange={(e) => {
                                    setJsonInput(e.target.value);
                                    setParseError(false);
                                }}
                            />
                            {parseError && <p className="text-xs text-red-500">Invalid JSON. Please check the format.</p>}
                        </div>
                    </div>

                    <DialogFooter>
                        <Button type="button" variant="secondary" onClick={() => setShowAiHelper(false)}>Cancel</Button>
                        <Button type="button" onClick={handleFillForm} disabled={!jsonInput.trim()}>
                            Auto-fill Form
                        </Button>
                    </DialogFooter>
                </DialogContent>
            </Dialog>

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
                        <DollarSign className="w-5 h-5 text-muted-foreground" />
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
                        "border-2 border-dashed rounded-lg p-8 flex flex-col items-center justify-center text-muted-foreground hover:bg-muted/50 transition-all cursor-pointer relative",
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
                        <>
                            <FileText className="w-10 h-10 mb-2 text-emerald-500" />
                            <p className="text-sm font-medium text-foreground">{file.name}</p>
                            <p className="text-xs text-muted-foreground">{(file.size / 1024).toFixed(0)} KB</p>
                            <Button variant="ghost" size="sm" className="mt-2 text-destructive hover:text-destructive z-20" onClick={(e) => {
                                e.stopPropagation();
                                e.preventDefault();
                                setFile(null);
                            }}>Remove</Button>
                        </>
                    ) : (
                        <>
                            <Upload className="w-10 h-10 mb-2 opacity-50" />
                            <p className="text-sm font-medium">Click or drag PDF to upload</p>
                            <p className="text-xs text-muted-foreground mt-1">Supports PDF, PNG, JPG</p>
                        </>
                    )}
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

            {error && (
                <div className="bg-destructive/15 text-destructive text-sm p-3 rounded-md border border-destructive/20">
                    {error}
                </div>
            )}
            <div className="flex justify-end gap-3 pt-6 border-t">
                <Button type="button" variant="outline" onClick={onCancel} size="lg">Cancel</Button>
                <Button type="submit" disabled={loading} size="lg" className="px-8">
                    {loading ? "Saving..." : "Save Record"}
                </Button>
            </div>
        </form>
    );
}
