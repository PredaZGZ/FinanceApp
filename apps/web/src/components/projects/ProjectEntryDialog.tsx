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
    onSubmit: (data: { type: ProjectEntryType; amount: number; description: string; category?: string; date: string }) => Promise<void>;
}

const today = () => new Date().toISOString().slice(0, 10);

export function ProjectEntryDialog({ open, type, onOpenChange, onSubmit }: ProjectEntryDialogProps) {
    const [amount, setAmount] = useState('');
    const [description, setDescription] = useState('');
    const [category, setCategory] = useState('');
    const [date, setDate] = useState(today());
    const [entryType, setEntryType] = useState<ProjectEntryType>(type);
    const [isSaving, setIsSaving] = useState(false);
    const [error, setError] = useState('');

    const reset = () => {
        setAmount('');
        setDescription('');
        setCategory('');
        setDate(today());
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
            await onSubmit({ type: entryType, amount: parsedAmount, description: description.trim(), category: category.trim() || undefined, date });
            handleOpenChange(false);
        } catch (submitError) {
            setError(submitError instanceof Error ? submitError.message : 'No se pudo guardar el movimiento');
        } finally {
            setIsSaving(false);
        }
    };

    return (
        <Dialog open={open} onOpenChange={handleOpenChange}>
            <DialogContent className="sm:max-w-[480px]">
                <DialogHeader>
                    <DialogTitle>Nuevo movimiento</DialogTitle>
                    <DialogDescription>Añade un ingreso o un gasto exclusivo de este proyecto.</DialogDescription>
                </DialogHeader>
                <form onSubmit={handleSubmit} className="space-y-4">
                    <div className="grid grid-cols-2 gap-4">
                        <div className="space-y-2">
                            <Label>Tipo</Label>
                            <Select value={entryType} onValueChange={(value) => setEntryType(value as ProjectEntryType)}>
                                <SelectTrigger><SelectValue /></SelectTrigger>
                                <SelectContent>
                                    <SelectItem value="INCOME">Ingreso</SelectItem>
                                    <SelectItem value="EXPENSE">Gasto</SelectItem>
                                </SelectContent>
                            </Select>
                        </div>
                        <div className="space-y-2">
                            <Label htmlFor="entry-amount">Importe</Label>
                            <Input id="entry-amount" type="number" min="0.01" step="0.01" value={amount} onChange={(event) => setAmount(event.target.value)} required placeholder="0,00" />
                        </div>
                    </div>
                    <div className="space-y-2">
                        <Label htmlFor="entry-description">Concepto</Label>
                        <Input id="entry-description" value={description} onChange={(event) => setDescription(event.target.value)} maxLength={200} required placeholder="Factura de materiales" />
                    </div>
                    <div className="grid grid-cols-2 gap-4">
                        <div className="space-y-2">
                            <Label htmlFor="entry-category">Categoría</Label>
                            <Input id="entry-category" value={category} onChange={(event) => setCategory(event.target.value)} maxLength={80} placeholder="Materiales" />
                        </div>
                        <div className="space-y-2">
                            <Label htmlFor="entry-date">Fecha</Label>
                            <Input id="entry-date" type="date" value={date} onChange={(event) => setDate(event.target.value)} required />
                        </div>
                    </div>
                    {error && <p className="text-sm text-destructive">{error}</p>}
                    <DialogFooter>
                        <Button type="button" variant="outline" onClick={() => handleOpenChange(false)}>Cancelar</Button>
                        <Button type="submit" disabled={isSaving}>{isSaving ? 'Guardando…' : 'Guardar movimiento'}</Button>
                    </DialogFooter>
                </form>
            </DialogContent>
        </Dialog>
    );
}
