import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Plus, Trash2, Upload, CalendarIcon, Building, DollarSign, FileText } from "lucide-react";
import type { CreateSalaryInput, SalaryRecord } from "./salary.types";
import { postAPI } from "@/lib/api";
import { Card, CardContent } from "@/components/ui/card";
import { cn } from "@/lib/utils";

interface SalaryFormProps {
    onSuccess: () => void;
    onCancel: () => void;
}

export default function SalaryForm({ onSuccess, onCancel }: SalaryFormProps) {
    const [loading, setLoading] = useState(false);
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

    const handleBreakdownChange = (index: number, field: keyof typeof formData.breakdown[0], value: any) => {
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

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        setLoading(true);
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
        } catch (error) {
            console.error(error);
        } finally {
            setLoading(false);
        }
    };

    return (
        <form onSubmit={handleSubmit} className="space-y-8">
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
                        accept=".pdf,image/*"
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
                                <div className="flex-[2]">
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

            <div className="flex justify-end gap-3 pt-6 border-t">
                <Button type="button" variant="outline" onClick={onCancel} size="lg">Cancel</Button>
                <Button type="submit" disabled={loading} size="lg" className="px-8">
                    {loading ? "Saving..." : "Save Record"}
                </Button>
            </div>
        </form>
    );
}
