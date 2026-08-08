import { useCallback, useEffect, useState } from 'react';
import { ArrowDownLeft, ArrowUpRight, FolderKanban, Plus, Trash2, WalletCards } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { ProjectDialog } from '@/components/projects/ProjectDialog';
import { ProjectEntryDialog } from '@/components/projects/ProjectEntryDialog';
import type { ProjectDetail, ProjectEntryType, ProjectSummary } from '@/components/projects/project.types';
import { fetchAPI, postAPI } from '@/lib/api';
import { cn } from '@/lib/utils';

const money = new Intl.NumberFormat('es-ES', { style: 'currency', currency: 'EUR' });
const dateFormatter = new Intl.DateTimeFormat('es-ES', { day: '2-digit', month: 'short', year: 'numeric', timeZone: 'UTC' });

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
            .catch((loadError) => setError(loadError instanceof Error ? loadError.message : 'No se pudieron cargar los proyectos'))
            .finally(() => setIsLoading(false));
    }, []);

    useEffect(() => {
        if (!selectedId) {
            return;
        }
        void fetchAPI<ProjectDetail>(`/projects/${selectedId}`)
            .then(setDetail)
            .catch((loadError) => setError(loadError instanceof Error ? loadError.message : 'No se pudo cargar el proyecto'));
    }, [selectedId]);

    const refresh = async (projectId: string) => {
        await Promise.all([loadProjects(projectId), loadDetail(projectId)]);
    };

    const createProject = async (data: { name: string; description?: string }) => {
        const project = await postAPI<ProjectSummary>('/projects', data);
        await loadProjects(project.id);
        setSelectedId(project.id);
    };

    const createEntry = async (data: { type: ProjectEntryType; amount: number; description: string; category?: string; date: string }) => {
        if (!selectedId) return;
        await postAPI(`/projects/${selectedId}/entries`, data);
        await refresh(selectedId);
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
            setError(deleteError instanceof Error ? deleteError.message : 'No se pudo completar el borrado');
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
                    <h1 className="text-3xl font-bold tracking-tight">Proyectos</h1>
                    <p className="mt-1 text-muted-foreground">Controla los ingresos y gastos de cada proyecto por separado.</p>
                </div>
                <Button onClick={() => setProjectDialogOpen(true)}><Plus className="mr-2 h-4 w-4" />Nuevo proyecto</Button>
            </div>

            {error && <div className="rounded-lg border border-destructive/30 bg-destructive/10 p-3 text-sm text-destructive">{error}</div>}

            <div className="grid gap-6 lg:grid-cols-[300px_minmax(0,1fr)]">
                <Card className="h-fit">
                    <CardHeader>
                        <CardTitle className="text-base">Tus proyectos</CardTitle>
                        <CardDescription>{projects.length} {projects.length === 1 ? 'proyecto' : 'proyectos'}</CardDescription>
                    </CardHeader>
                    <CardContent className="space-y-2">
                        {isLoading ? <p className="py-6 text-center text-sm text-muted-foreground">Cargando…</p> : projects.length === 0 ? (
                            <div className="py-8 text-center">
                                <FolderKanban className="mx-auto mb-3 h-8 w-8 text-muted-foreground" />
                                <p className="text-sm font-medium">Aún no hay proyectos</p>
                                <p className="mt-1 text-xs text-muted-foreground">Crea el primero para empezar.</p>
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
                    <Card className="flex min-h-80 items-center justify-center"><CardContent className="pt-6 text-center text-muted-foreground"><WalletCards className="mx-auto mb-3 h-10 w-10" /><p>Selecciona o crea un proyecto.</p></CardContent></Card>
                ) : (
                    <div className="min-w-0 space-y-6">
                        <div className="flex items-start justify-between gap-4">
                            <div><h2 className="text-2xl font-semibold">{detail.name}</h2>{detail.description && <p className="mt-1 text-sm text-muted-foreground">{detail.description}</p>}</div>
                            <Button variant="ghost" size="icon" onClick={() => setDeleteTarget({ kind: 'project', name: detail.name })} title="Eliminar proyecto"><Trash2 className="h-4 w-4 text-destructive" /></Button>
                        </div>

                        <div className="grid gap-4 sm:grid-cols-3">
                            <Card><CardHeader className="pb-2"><CardDescription>Ingresos</CardDescription><CardTitle className="text-2xl text-emerald-600 dark:text-emerald-400">{money.format(detail.income)}</CardTitle></CardHeader></Card>
                            <Card><CardHeader className="pb-2"><CardDescription>Gastos</CardDescription><CardTitle className="text-2xl text-destructive">{money.format(detail.expense)}</CardTitle></CardHeader></Card>
                            <Card><CardHeader className="pb-2"><CardDescription>Balance</CardDescription><CardTitle className={cn('text-2xl', detail.balance >= 0 ? 'text-emerald-600 dark:text-emerald-400' : 'text-destructive')}>{money.format(detail.balance)}</CardTitle></CardHeader></Card>
                        </div>

                        <Card>
                            <CardHeader className="gap-4 sm:flex-row sm:items-center sm:justify-between">
                                <div><CardTitle>Movimientos</CardTitle><CardDescription>Ingresos y gastos exclusivos de este proyecto</CardDescription></div>
                                <div className="grid grid-cols-2 gap-2 sm:flex">
                                    <Button size="sm" variant="outline" onClick={() => openEntry('INCOME')}><ArrowDownLeft className="mr-2 h-4 w-4 text-emerald-600" />Ingreso</Button>
                                    <Button size="sm" variant="outline" onClick={() => openEntry('EXPENSE')}><ArrowUpRight className="mr-2 h-4 w-4 text-destructive" />Gasto</Button>
                                </div>
                            </CardHeader>
                            <CardContent>
                                {detail.entries.length === 0 ? <div className="py-12 text-center text-sm text-muted-foreground">Añade el primer ingreso o gasto del proyecto.</div> : (
                                    <>
                                        <div className="space-y-3 sm:hidden">
                                            {detail.entries.map((entry) => (
                                                <div key={entry.id} className="rounded-lg border bg-muted/20 p-4">
                                                    <div className="flex items-start justify-between gap-3">
                                                        <div className="min-w-0">
                                                            <div className="font-medium">{entry.description}</div>
                                                            <div className="mt-1 text-xs text-muted-foreground">{dateFormatter.format(new Date(entry.date))}{entry.category ? ` · ${entry.category}` : ''}</div>
                                                        </div>
                                                        <Button variant="ghost" size="icon" className="-mr-2 -mt-2 shrink-0" onClick={() => setDeleteTarget({ kind: 'entry', id: entry.id, name: entry.description })} title="Eliminar movimiento"><Trash2 className="h-4 w-4" /></Button>
                                                    </div>
                                                    <div className="mt-3 flex items-center justify-between gap-3">
                                                        <span className={cn('rounded-full px-2 py-1 text-xs font-medium', entry.type === 'INCOME' ? 'bg-emerald-500/10 text-emerald-700 dark:text-emerald-400' : 'bg-destructive/10 text-destructive')}>{entry.type === 'INCOME' ? 'Ingreso' : 'Gasto'}</span>
                                                        <span className={cn('font-semibold', entry.type === 'INCOME' ? 'text-emerald-600 dark:text-emerald-400' : 'text-destructive')}>{entry.type === 'INCOME' ? '+' : '−'}{money.format(entry.amount)}</span>
                                                    </div>
                                                </div>
                                            ))}
                                        </div>
                                        <div className="hidden sm:block">
                                            <Table>
                                                <TableHeader><TableRow><TableHead>Fecha</TableHead><TableHead>Concepto</TableHead><TableHead>Categoría</TableHead><TableHead>Tipo</TableHead><TableHead className="text-right">Importe</TableHead><TableHead className="w-12" /></TableRow></TableHeader>
                                                <TableBody>{detail.entries.map((entry) => (
                                                    <TableRow key={entry.id}>
                                                        <TableCell className="whitespace-nowrap">{dateFormatter.format(new Date(entry.date))}</TableCell>
                                                        <TableCell className="font-medium">{entry.description}</TableCell>
                                                        <TableCell className="text-muted-foreground">{entry.category || '—'}</TableCell>
                                                        <TableCell><span className={cn('rounded-full px-2 py-1 text-xs font-medium', entry.type === 'INCOME' ? 'bg-emerald-500/10 text-emerald-700 dark:text-emerald-400' : 'bg-destructive/10 text-destructive')}>{entry.type === 'INCOME' ? 'Ingreso' : 'Gasto'}</span></TableCell>
                                                        <TableCell className={cn('text-right font-semibold', entry.type === 'INCOME' ? 'text-emerald-600 dark:text-emerald-400' : 'text-destructive')}>{entry.type === 'INCOME' ? '+' : '−'}{money.format(entry.amount)}</TableCell>
                                                        <TableCell><Button variant="ghost" size="icon" onClick={() => setDeleteTarget({ kind: 'entry', id: entry.id, name: entry.description })} title="Eliminar movimiento"><Trash2 className="h-4 w-4" /></Button></TableCell>
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
                        <DialogTitle>{deleteTarget?.kind === 'project' ? 'Eliminar proyecto' : 'Eliminar movimiento'}</DialogTitle>
                        <DialogDescription>
                            {deleteTarget?.kind === 'project'
                                ? `Se eliminará “${deleteTarget.name}” junto con todos sus ingresos y gastos. Esta acción no se puede deshacer.`
                                : `Se eliminará el movimiento “${deleteTarget?.name}”. Esta acción no se puede deshacer.`}
                        </DialogDescription>
                    </DialogHeader>
                    <DialogFooter>
                        <Button variant="outline" onClick={() => setDeleteTarget(null)} disabled={isDeleting}>Cancelar</Button>
                        <Button variant="destructive" onClick={confirmDelete} disabled={isDeleting}>{isDeleting ? 'Eliminando…' : 'Eliminar'}</Button>
                    </DialogFooter>
                </DialogContent>
            </Dialog>
        </div>
    );
}
