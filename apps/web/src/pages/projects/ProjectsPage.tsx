import { useCallback, useEffect, useState } from 'react';
import { ArrowDownLeft, ArrowUpRight, FileText, FolderKanban, Plus, Trash2, WalletCards } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { ProjectDialog } from '@/components/projects/ProjectDialog';
import { ProjectEntryDialog } from '@/components/projects/ProjectEntryDialog';
import type { ProjectDetail, ProjectEntryType, ProjectSummary } from '@/components/projects/project.types';
import { fetchAPI, fetchBlob, postAPI } from '@/lib/api';
import { cn } from '@/lib/utils';

const money = new Intl.NumberFormat('en-US', { style: 'currency', currency: 'EUR' });
const dateFormatter = new Intl.DateTimeFormat('en-US', { day: '2-digit', month: 'short', year: 'numeric', timeZone: 'UTC' });

export default function ProjectsPage() {
    const [projects, setProjects] = useState<ProjectSummary[]>([]);
    const [selectedId, setSelectedId] = useState<string | null>(null);
    const [detail, setDetail] = useState<ProjectDetail | null>(null);
    const [isLoading, setIsLoading] = useState(true);
    const [error, setError] = useState('');
    const [projectDialogOpen, setProjectDialogOpen] = useState(false);
    const [entryDialogOpen, setEntryDialogOpen] = useState(false);
    const [newEntryType, setNewEntryType] = useState<ProjectEntryType>('INCOME');
    const [deleteTarget, setDeleteTarget] = useState<{ kind: 'project'; name: string } | { kind: 'entry'; id: string; name: string } | null>(null);
    const [isDeleting, setIsDeleting] = useState(false);

    const loadProjects = useCallback(async (preferredId?: string) => {
        const response = await fetchAPI<{ data: ProjectSummary[] }>('/projects');
        setProjects(response.data);
        setSelectedId((current) => preferredId || current || response.data[0]?.id || null);
    }, []);

    const loadDetail = useCallback(async (projectId: string) => {
        const response = await fetchAPI<ProjectDetail>(`/projects/${projectId}`);
        setDetail(response);
    }, []);

    useEffect(() => {
        void fetchAPI<{ data: ProjectSummary[] }>('/projects')
            .then((response) => {
                setProjects(response.data);
                setSelectedId((current) => current || response.data[0]?.id || null);
            })
            .catch((loadError) => setError(loadError instanceof Error ? loadError.message : 'Projects could not be loaded'))
            .finally(() => setIsLoading(false));
    }, []);

    useEffect(() => {
        if (!selectedId) {
            return;
        }
        void fetchAPI<ProjectDetail>(`/projects/${selectedId}`)
            .then(setDetail)
            .catch((loadError) => setError(loadError instanceof Error ? loadError.message : 'Project could not be loaded'));
    }, [selectedId]);

    const refresh = async (projectId: string) => {
        await Promise.all([loadProjects(projectId), loadDetail(projectId)]);
    };

    const createProject = async (data: { name: string; description?: string }) => {
        const project = await postAPI<ProjectSummary>('/projects', data);
        await loadProjects(project.id);
        setSelectedId(project.id);
    };

    const createEntry = async (data: { type: ProjectEntryType; amount: number; description: string; category?: string; date: string; file?: File }) => {
        if (!selectedId) return;
        const form = new FormData();
        form.append('type', data.type);
        form.append('amount', String(data.amount));
        form.append('description', data.description);
        if (data.category) form.append('category', data.category);
        form.append('date', data.date);
        if (data.file) form.append('file', data.file);
        await postAPI(`/projects/${selectedId}/entries`, form);
        await refresh(selectedId);
    };

    const openEntryFile = async (entryId: string) => {
        if (!selectedId) return;
        try {
            const blob = await fetchBlob(`/projects/${selectedId}/entries/${entryId}/file`);
            const url = URL.createObjectURL(blob);
            window.open(url, '_blank', 'noopener,noreferrer');
            window.setTimeout(() => URL.revokeObjectURL(url), 60_000);
        } catch (fileError) {
            setError(fileError instanceof Error ? fileError.message : 'Document could not be opened');
        }
    };

    const confirmDelete = async () => {
        if (!selectedId || !deleteTarget) return;
        setIsDeleting(true);
        setError('');
        try {
            if (deleteTarget.kind === 'entry') {
                await fetchAPI(`/projects/${selectedId}/entries/${deleteTarget.id}`, { method: 'DELETE' });
                await refresh(selectedId);
            } else {
                await fetchAPI(`/projects/${selectedId}`, { method: 'DELETE' });
                setSelectedId(null);
                setDetail(null);
                await loadProjects();
            }
            setDeleteTarget(null);
        } catch (deleteError) {
            setError(deleteError instanceof Error ? deleteError.message : 'The delete action could not be completed');
        } finally {
            setIsDeleting(false);
        }
    };

    const openEntry = (type: ProjectEntryType) => {
        setNewEntryType(type);
        setEntryDialogOpen(true);
    };

    return (
        <div className="p-4 md:p-6 space-y-6">
            <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
                <div>
                    <h1 className="text-3xl font-bold tracking-tight">Projects</h1>
                    <p className="mt-1 text-muted-foreground">Track each project's income and expenses separately.</p>
                </div>
                <Button onClick={() => setProjectDialogOpen(true)}><Plus className="mr-2 h-4 w-4" />New project</Button>
            </div>

            {error && <div className="rounded-lg border border-destructive/30 bg-destructive/10 p-3 text-sm text-destructive">{error}</div>}

            <div className="grid gap-6 lg:grid-cols-[300px_minmax(0,1fr)]">
                <Card className="h-fit">
                    <CardHeader>
                        <CardTitle className="text-base">Your projects</CardTitle>
                        <CardDescription>{projects.length} {projects.length === 1 ? 'project' : 'projects'}</CardDescription>
                    </CardHeader>
                    <CardContent className="space-y-2">
                        {isLoading ? <p className="py-6 text-center text-sm text-muted-foreground">Loading...</p> : projects.length === 0 ? (
                            <div className="py-8 text-center">
                                <FolderKanban className="mx-auto mb-3 h-8 w-8 text-muted-foreground" />
                                <p className="text-sm font-medium">No projects yet</p>
                                <p className="mt-1 text-xs text-muted-foreground">Create your first one to get started.</p>
                            </div>
                        ) : projects.map((project) => (
                            <button key={project.id} onClick={() => setSelectedId(project.id)} className={cn('w-full rounded-lg border p-3 text-left transition-colors hover:bg-accent', selectedId === project.id && 'border-primary bg-accent')}>
                                <div className="truncate font-medium">{project.name}</div>
                                <div className={cn('mt-1 text-sm font-semibold', project.balance >= 0 ? 'text-emerald-600 dark:text-emerald-400' : 'text-destructive')}>{money.format(project.balance)}</div>
                            </button>
                        ))}
                    </CardContent>
                </Card>

                {!detail ? (
                    <Card className="flex min-h-80 items-center justify-center"><CardContent className="pt-6 text-center text-muted-foreground"><WalletCards className="mx-auto mb-3 h-10 w-10" /><p>Select or create a project.</p></CardContent></Card>
                ) : (
                    <div className="min-w-0 space-y-6">
                        <div className="flex items-start justify-between gap-4">
                            <div><h2 className="text-2xl font-semibold">{detail.name}</h2>{detail.description && <p className="mt-1 text-sm text-muted-foreground">{detail.description}</p>}</div>
                            <Button variant="ghost" size="icon" onClick={() => setDeleteTarget({ kind: 'project', name: detail.name })} title="Delete project"><Trash2 className="h-4 w-4 text-destructive" /></Button>
                        </div>

                        <div className="grid gap-4 sm:grid-cols-3">
                            <Card><CardHeader className="pb-2"><CardDescription>Income</CardDescription><CardTitle className="text-2xl text-emerald-600 dark:text-emerald-400">{money.format(detail.income)}</CardTitle></CardHeader></Card>
                            <Card><CardHeader className="pb-2"><CardDescription>Expenses</CardDescription><CardTitle className="text-2xl text-destructive">{money.format(detail.expense)}</CardTitle></CardHeader></Card>
                            <Card><CardHeader className="pb-2"><CardDescription>Balance</CardDescription><CardTitle className={cn('text-2xl', detail.balance >= 0 ? 'text-emerald-600 dark:text-emerald-400' : 'text-destructive')}>{money.format(detail.balance)}</CardTitle></CardHeader></Card>
                        </div>

                        <Card>
                            <CardHeader className="gap-4 sm:flex-row sm:items-center sm:justify-between">
                                <div><CardTitle>Entries</CardTitle><CardDescription>Income and expenses linked only to this project</CardDescription></div>
                                <div className="grid grid-cols-2 gap-2 sm:flex">
                                    <Button size="sm" variant="outline" onClick={() => openEntry('INCOME')}><ArrowDownLeft className="mr-2 h-4 w-4 text-emerald-600" />Income</Button>
                                    <Button size="sm" variant="outline" onClick={() => openEntry('EXPENSE')}><ArrowUpRight className="mr-2 h-4 w-4 text-destructive" />Expense</Button>
                                </div>
                            </CardHeader>
                            <CardContent>
                                {detail.entries.length === 0 ? <div className="py-12 text-center text-sm text-muted-foreground">Add the first income or expense for this project.</div> : (
                                    <>
                                        <div className="space-y-3 sm:hidden">
                                            {detail.entries.map((entry) => (
                                                <div key={entry.id} className="rounded-lg border bg-muted/20 p-4">
                                                    <div className="flex items-start justify-between gap-3">
                                                        <div className="min-w-0">
                                                            <div className="font-medium">{entry.description}</div>
                                                            <div className="mt-1 text-xs text-muted-foreground">{dateFormatter.format(new Date(entry.date))}{entry.category ? ` · ${entry.category}` : ''}</div>
                                                        </div>
                                                        <div className="-mr-2 -mt-2 flex shrink-0">
                                                            {entry.fileName && (
                                                                <Button variant="ghost" size="icon" onClick={() => void openEntryFile(entry.id)} title="Open document"><FileText className="h-4 w-4 text-primary" /></Button>
                                                            )}
                                                            <Button variant="ghost" size="icon" onClick={() => setDeleteTarget({ kind: 'entry', id: entry.id, name: entry.description })} title="Delete entry"><Trash2 className="h-4 w-4" /></Button>
                                                        </div>
                                                    </div>
                                                    {entry.fileName && <div className="mt-2 flex items-center gap-1 text-xs text-muted-foreground"><FileText className="h-3 w-3" />{entry.fileName}</div>}
                                                    <div className="mt-3 flex items-center justify-between gap-3">
                                                        <span className={cn('rounded-full px-2 py-1 text-xs font-medium', entry.type === 'INCOME' ? 'bg-emerald-500/10 text-emerald-700 dark:text-emerald-400' : 'bg-destructive/10 text-destructive')}>{entry.type === 'INCOME' ? 'Income' : 'Expense'}</span>
                                                        <span className={cn('font-semibold', entry.type === 'INCOME' ? 'text-emerald-600 dark:text-emerald-400' : 'text-destructive')}>{entry.type === 'INCOME' ? '+' : '−'}{money.format(entry.amount)}</span>
                                                    </div>
                                                </div>
                                            ))}
                                        </div>
                                        <div className="hidden sm:block">
                                            <Table>
                                                <TableHeader><TableRow><TableHead>Date</TableHead><TableHead>Description</TableHead><TableHead>Category</TableHead><TableHead>Type</TableHead><TableHead>Document</TableHead><TableHead className="text-right">Amount</TableHead><TableHead className="w-12" /></TableRow></TableHeader>
                                                <TableBody>{detail.entries.map((entry) => (
                                                    <TableRow key={entry.id}>
                                                        <TableCell className="whitespace-nowrap">{dateFormatter.format(new Date(entry.date))}</TableCell>
                                                        <TableCell className="font-medium">{entry.description}</TableCell>
                                                        <TableCell className="text-muted-foreground">{entry.category || '—'}</TableCell>
                                                        <TableCell><span className={cn('rounded-full px-2 py-1 text-xs font-medium', entry.type === 'INCOME' ? 'bg-emerald-500/10 text-emerald-700 dark:text-emerald-400' : 'bg-destructive/10 text-destructive')}>{entry.type === 'INCOME' ? 'Income' : 'Expense'}</span></TableCell>
                                                        <TableCell>
                                                            {entry.fileName ? (
                                                                <Button variant="ghost" size="sm" className="h-8 max-w-40 justify-start gap-2 px-2" onClick={() => void openEntryFile(entry.id)} title={entry.fileName}>
                                                                    <FileText className="h-4 w-4 shrink-0 text-primary" />
                                                                    <span className="truncate">{entry.fileName}</span>
                                                                </Button>
                                                            ) : '—'}
                                                        </TableCell>
                                                        <TableCell className={cn('text-right font-semibold', entry.type === 'INCOME' ? 'text-emerald-600 dark:text-emerald-400' : 'text-destructive')}>{entry.type === 'INCOME' ? '+' : '−'}{money.format(entry.amount)}</TableCell>
                                                        <TableCell><Button variant="ghost" size="icon" onClick={() => setDeleteTarget({ kind: 'entry', id: entry.id, name: entry.description })} title="Delete entry"><Trash2 className="h-4 w-4" /></Button></TableCell>
                                                    </TableRow>
                                                ))}</TableBody>
                                            </Table>
                                        </div>
                                    </>
                                )}
                            </CardContent>
                        </Card>
                    </div>
                )}
            </div>

            <ProjectDialog open={projectDialogOpen} onOpenChange={setProjectDialogOpen} onSubmit={createProject} />
            <ProjectEntryDialog key={newEntryType} open={entryDialogOpen} type={newEntryType} onOpenChange={setEntryDialogOpen} onSubmit={createEntry} />
            <Dialog open={deleteTarget !== null} onOpenChange={(open) => !open && !isDeleting && setDeleteTarget(null)}>
                <DialogContent className="sm:max-w-[440px]">
                    <DialogHeader>
                        <DialogTitle>{deleteTarget?.kind === 'project' ? 'Delete project' : 'Delete entry'}</DialogTitle>
                        <DialogDescription>
                            {deleteTarget?.kind === 'project'
                                ? `"${deleteTarget.name}" and all its income and expenses will be deleted. This action cannot be undone.`
                                : `"${deleteTarget?.name}" will be deleted. This action cannot be undone.`}
                        </DialogDescription>
                    </DialogHeader>
                    <DialogFooter>
                        <Button variant="outline" onClick={() => setDeleteTarget(null)} disabled={isDeleting}>Cancel</Button>
                        <Button variant="destructive" onClick={confirmDelete} disabled={isDeleting}>{isDeleting ? 'Deleting...' : 'Delete'}</Button>
                    </DialogFooter>
                </DialogContent>
            </Dialog>
        </div>
    );
}
