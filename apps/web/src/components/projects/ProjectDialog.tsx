import { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';

interface ProjectDialogProps {
    open: boolean;
    onOpenChange: (open: boolean) => void;
    onSubmit: (data: { name: string; description?: string }) => Promise<void>;
}

export function ProjectDialog({ open, onOpenChange, onSubmit }: ProjectDialogProps) {
    const [name, setName] = useState('');
    const [description, setDescription] = useState('');
    const [isSaving, setIsSaving] = useState(false);
    const [error, setError] = useState('');

    const reset = () => {
        setName('');
        setDescription('');
        setError('');
    };

    const handleOpenChange = (nextOpen: boolean) => {
        if (!nextOpen) reset();
        onOpenChange(nextOpen);
    };

    const handleSubmit = async (event: React.FormEvent) => {
        event.preventDefault();
        if (!name.trim()) return;
        setIsSaving(true);
        setError('');
        try {
            await onSubmit({ name: name.trim(), description: description.trim() || undefined });
            handleOpenChange(false);
        } catch (submitError) {
            setError(submitError instanceof Error ? submitError.message : 'Project could not be created');
        } finally {
            setIsSaving(false);
        }
    };

    return (
        <Dialog open={open} onOpenChange={handleOpenChange}>
            <DialogContent className="sm:max-w-[480px]">
                <DialogHeader>
                    <DialogTitle>New project</DialogTitle>
                    <DialogDescription>Create a separate space to track its income and expenses.</DialogDescription>
                </DialogHeader>
                <form onSubmit={handleSubmit} className="space-y-4">
                    <div className="space-y-2">
                        <Label htmlFor="project-name">Name</Label>
                        <Input id="project-name" value={name} onChange={(event) => setName(event.target.value)} maxLength={120} autoFocus required placeholder="Home renovation" />
                    </div>
                    <div className="space-y-2">
                        <Label htmlFor="project-description">Description</Label>
                        <Textarea id="project-description" value={description} onChange={(event) => setDescription(event.target.value)} maxLength={500} placeholder="Goal, scope, or project notes" />
                    </div>
                    {error && <p className="text-sm text-destructive">{error}</p>}
                    <DialogFooter>
                        <Button type="button" variant="outline" onClick={() => handleOpenChange(false)}>Cancel</Button>
                        <Button type="submit" disabled={isSaving || !name.trim()}>{isSaving ? 'Creating...' : 'Create project'}</Button>
                    </DialogFooter>
                </form>
            </DialogContent>
        </Dialog>
    );
}
