import { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import type { ProjectEntryType } from './project.types';

interface ProjectEntryDialogProps {
    open: boolean;
    type: ProjectEntryType;
    onOpenChange: (open: boolean) => void;
    onSubmit: (data: { type: ProjectEntryType; amount: number; description: string; category?: string; date: string; file?: File }) => Promise<void>;
}

const today = () => new Date().toISOString().slice(0, 10);

export function ProjectEntryDialog({ open, type, onOpenChange, onSubmit }: ProjectEntryDialogProps) {
    const [amount, setAmount] = useState('');
    const [description, setDescription] = useState('');
    const [category, setCategory] = useState('');
    const [date, setDate] = useState(today());
    const [file, setFile] = useState<File | null>(null);
    const [entryType, setEntryType] = useState<ProjectEntryType>(type);
    const [isSaving, setIsSaving] = useState(false);
    const [error, setError] = useState('');

    const reset = () => {
        setAmount('');
        setDescription('');
        setCategory('');
        setDate(today());
        setFile(null);
        setEntryType(type);
        setError('');
    };

    const handleOpenChange = (nextOpen: boolean) => {
        if (!nextOpen) reset();
        onOpenChange(nextOpen);
    };

    const handleSubmit = async (event: React.FormEvent) => {
        event.preventDefault();
        const parsedAmount = Number(amount);
        if (!Number.isFinite(parsedAmount) || parsedAmount <= 0 || !description.trim()) return;
        setIsSaving(true);
        setError('');
        try {
            await onSubmit({ type: entryType, amount: parsedAmount, description: description.trim(), category: category.trim() || undefined, date, file: file || undefined });
            handleOpenChange(false);
        } catch (submitError) {
            setError(submitError instanceof Error ? submitError.message : 'Entry could not be saved');
        } finally {
            setIsSaving(false);
        }
    };

    return (
        <Dialog open={open} onOpenChange={handleOpenChange}>
            <DialogContent className="sm:max-w-[480px]">
                <DialogHeader>
                    <DialogTitle>New entry</DialogTitle>
                    <DialogDescription>Add income or an expense linked only to this project.</DialogDescription>
                </DialogHeader>
                <form onSubmit={handleSubmit} className="space-y-4">
                    <div className="grid grid-cols-2 gap-4">
                        <div className="space-y-2">
                            <Label>Type</Label>
                            <Select value={entryType} onValueChange={(value) => setEntryType(value as ProjectEntryType)}>
                                <SelectTrigger><SelectValue /></SelectTrigger>
                                <SelectContent>
                                    <SelectItem value="INCOME">Income</SelectItem>
                                    <SelectItem value="EXPENSE">Expense</SelectItem>
                                </SelectContent>
                            </Select>
                        </div>
                        <div className="space-y-2">
                            <Label htmlFor="entry-amount">Amount</Label>
                            <Input id="entry-amount" type="number" min="0.01" step="0.01" value={amount} onChange={(event) => setAmount(event.target.value)} required placeholder="0.00" />
                        </div>
                    </div>
                    <div className="space-y-2">
                        <Label htmlFor="entry-description">Description</Label>
                        <Input id="entry-description" value={description} onChange={(event) => setDescription(event.target.value)} maxLength={200} required placeholder="Materials invoice" />
                    </div>
                    <div className="grid grid-cols-2 gap-4">
                        <div className="space-y-2">
                            <Label htmlFor="entry-category">Category</Label>
                            <Input id="entry-category" value={category} onChange={(event) => setCategory(event.target.value)} maxLength={80} placeholder="Materials" />
                        </div>
                        <div className="space-y-2">
                            <Label htmlFor="entry-date">Date</Label>
                            <Input id="entry-date" type="date" value={date} onChange={(event) => setDate(event.target.value)} required />
                        </div>
                    </div>
                    <div className="space-y-2">
                        <Label htmlFor="entry-file">Invoice or document</Label>
                        <Input
                            id="entry-file"
                            type="file"
                            accept="application/pdf,image/jpeg,image/png"
                            onChange={(event) => setFile(event.target.files?.[0] ?? null)}
                        />
                        <p className="text-xs text-muted-foreground">Optional PDF, JPG, or PNG up to 10 MB.</p>
                    </div>
                    {error && <p className="text-sm text-destructive">{error}</p>}
                    <DialogFooter>
                        <Button type="button" variant="outline" onClick={() => handleOpenChange(false)}>Cancel</Button>
                        <Button type="submit" disabled={isSaving}>{isSaving ? 'Saving...' : 'Save entry'}</Button>
                    </DialogFooter>
                </form>
            </DialogContent>
        </Dialog>
    );
}
