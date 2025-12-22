import { useEffect, useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';

import {
    Table,
    TableBody,
    TableCell,
    TableHead,
    TableHeader,
    TableRow,
} from '@/components/ui/table';
import {
    Dialog,
    DialogContent,
    DialogDescription,
    DialogFooter,
    DialogHeader,
    DialogTitle,
} from '@/components/ui/dialog';
import {
    DropdownMenu,
    DropdownMenuContent,
    DropdownMenuItem,
    DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import {
    Select,
    SelectContent,
    SelectItem,
    SelectTrigger,
    SelectValue,
} from '@/components/ui/select';
import { Checkbox } from '@/components/ui/checkbox';
import {
    Search,
    MoreHorizontal,
    Trash2,
    UserPlus,
    Mail,
    ExternalLink,
    Users,
    Plus,
    FolderPlus,
    Loader2
} from 'lucide-react';
import { prospectsApi, listsApi, type Prospect, type ProspectList } from '@/api/client';
import { toast } from 'sonner';
import { Link } from 'react-router-dom';

export function ProspectsPage() {
    const [prospects, setProspects] = useState<Prospect[]>([]);
    const [lists, setLists] = useState<ProspectList[]>([]);
    const [loading, setLoading] = useState(true);
    const [search, setSearch] = useState('');
    const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set());
    const [assignDialogOpen, setAssignDialogOpen] = useState(false);
    const [selectedListId, setSelectedListId] = useState<string>('');
    const [assigning, setAssigning] = useState(false);

    useEffect(() => {
        loadProspects();
    }, []);

    async function loadProspects() {
        try {
            setLoading(true);
            const [prospectsRes, listsRes] = await Promise.all([
                prospectsApi.getAll(),
                listsApi.getAll()
            ]);
            setProspects(prospectsRes.data || []);
            setLists(listsRes.data || []);
        } catch {
            toast.error('Erreur lors du chargement des prospects');
        } finally {
            setLoading(false);
        }
    }

    function getDisplayName(p: Prospect) {
        const fullName = `${p.prenom || ''} ${p.nom || ''}`.trim();
        return fullName || p.entreprise || 'Sans nom';
    }

    function getInitials(p: Prospect) {
        const name = getDisplayName(p);
        return name.split(' ').slice(0, 2).map(w => w[0] || '').join('').toUpperCase();
    }

    const filteredProspects = prospects.filter(p => {
        const searchLower = search.toLowerCase();
        return (
            getDisplayName(p).toLowerCase().includes(searchLower) ||
            (p.email?.toLowerCase() || '').includes(searchLower) ||
            (p.entreprise?.toLowerCase() || '').includes(searchLower)
        );
    });

    const toggleSelect = (id: string) => {
        const newSet = new Set(selectedIds);
        if (newSet.has(id)) {
            newSet.delete(id);
        } else {
            newSet.add(id);
        }
        setSelectedIds(newSet);
    };

    const toggleSelectAll = () => {
        if (selectedIds.size === filteredProspects.length) {
            setSelectedIds(new Set());
        } else {
            setSelectedIds(new Set(filteredProspects.map(p => p.id)));
        }
    };

    async function handleDelete(id: string) {
        if (!confirm('Supprimer ce prospect ?')) return;
        try {
            await prospectsApi.delete(id);
            setProspects(prev => prev.filter(p => p.id !== id));
            toast.success('Prospect supprimé');
        } catch {
            toast.error('Erreur lors de la suppression');
        }
    }

    async function handleBulkDelete() {
        if (selectedIds.size === 0) return;
        if (!confirm(`Supprimer ${selectedIds.size} prospect(s) ?`)) return;

        try {
            await prospectsApi.bulkDelete(Array.from(selectedIds));
            setProspects(prev => prev.filter(p => !selectedIds.has(p.id)));
            setSelectedIds(new Set());
            toast.success(`${selectedIds.size} prospect(s) supprimé(s)`);
        } catch {
            toast.error('Erreur lors de la suppression');
        }
    }

    async function handleAssignToList() {
        if (!selectedListId || selectedIds.size === 0) return;
        setAssigning(true);
        try {
            await listsApi.bulkAssign(Array.from(selectedIds), selectedListId);
            toast.success(`${selectedIds.size} prospect(s) assigné(s) à la liste`);
            setAssignDialogOpen(false);
            setSelectedIds(new Set());
            setSelectedListId('');
        } catch {
            toast.error('Erreur lors de l\'assignation');
        } finally {
            setAssigning(false);
        }
    }

    return (
        <>
            <div className="space-y-6">
                {/* Header */}
                <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
                    <div>
                        <h1 className="text-3xl font-bold tracking-tight">Gestion des Prospects</h1>
                        <p className="text-muted-foreground">Gérez et suivez votre pipeline de prospection</p>
                    </div>
                    <div className="flex gap-2">
                        <Button asChild variant="outline">
                            <Link to="/import">
                                <Plus className="mr-2 h-4 w-4" />
                                Importer
                            </Link>
                        </Button>
                        <Button asChild>
                            <Link to="/generate">
                                <Mail className="mr-2 h-4 w-4" />
                                Générer des messages
                            </Link>
                        </Button>
                    </div>
                </div>

                {/* Stats */}
                <div className="grid gap-4 md:grid-cols-3">
                    <Card>
                        <CardHeader className="pb-2">
                            <CardTitle className="text-sm text-muted-foreground">Total prospects</CardTitle>
                        </CardHeader>
                        <CardContent>
                            <div className="text-2xl font-bold">{prospects.length}</div>
                        </CardContent>
                    </Card>
                    <Card>
                        <CardHeader className="pb-2">
                            <CardTitle className="text-sm text-muted-foreground">Sélectionnés</CardTitle>
                        </CardHeader>
                        <CardContent>
                            <div className="text-2xl font-bold">{selectedIds.size}</div>
                        </CardContent>
                    </Card>
                    <Card>
                        <CardHeader className="pb-2">
                            <CardTitle className="text-sm text-muted-foreground">Avec email</CardTitle>
                        </CardHeader>
                        <CardContent>
                            <div className="text-2xl font-bold">
                                {prospects.filter(p => p.email).length}
                            </div>
                        </CardContent>
                    </Card>
                </div>

                {/* Table Card */}
                <Card>
                    <CardHeader>
                        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
                            <div className="relative flex-1 max-w-sm">
                                <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
                                <Input
                                    placeholder="Rechercher..."
                                    value={search}
                                    onChange={(e) => setSearch(e.target.value)}
                                    className="pl-9"
                                />
                            </div>
                            {selectedIds.size > 0 && (
                                <div className="flex gap-2">
                                    <Button
                                        variant="outline"
                                        size="sm"
                                        onClick={() => setAssignDialogOpen(true)}
                                    >
                                        <FolderPlus className="mr-2 h-4 w-4" />
                                        Assigner à liste
                                    </Button>
                                    <Button variant="outline" size="sm">
                                        <UserPlus className="mr-2 h-4 w-4" />
                                        Assigner à campagne
                                    </Button>
                                    <Button variant="destructive" size="sm" onClick={handleBulkDelete}>
                                        <Trash2 className="mr-2 h-4 w-4" />
                                        Supprimer ({selectedIds.size})
                                    </Button>
                                </div>
                            )}
                        </div>
                    </CardHeader>
                    <CardContent>
                        {loading ? (
                            <div className="flex items-center justify-center py-8">
                                <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary"></div>
                            </div>
                        ) : filteredProspects.length === 0 ? (
                            <div className="flex flex-col items-center justify-center py-12 text-center">
                                <Users className="h-12 w-12 text-muted-foreground/50 mb-4" />
                                <h3 className="text-lg font-semibold">Aucun prospect</h3>
                                <p className="text-muted-foreground text-sm mb-4">
                                    Importez des contacts pour commencer
                                </p>
                                <Button asChild>
                                    <Link to="/import">Importer des prospects</Link>
                                </Button>
                            </div>
                        ) : (
                            <div className="overflow-x-auto -mx-4 px-4 md:mx-0 md:px-0">
                                <Table>
                                    <TableHeader>
                                        <TableRow>
                                            <TableHead className="w-12">
                                                <Checkbox
                                                    checked={selectedIds.size === filteredProspects.length && filteredProspects.length > 0}
                                                    onCheckedChange={toggleSelectAll}
                                                />
                                            </TableHead>
                                            <TableHead>Nom</TableHead>
                                            <TableHead className="hidden md:table-cell">Email</TableHead>
                                            <TableHead>Entreprise</TableHead>
                                            <TableHead className="hidden lg:table-cell">Poste</TableHead>
                                            <TableHead className="w-12"></TableHead>
                                        </TableRow>
                                    </TableHeader>
                                    <TableBody>
                                        {filteredProspects.map((prospect) => (
                                            <TableRow
                                                key={prospect.id}
                                                className="cursor-pointer hover:bg-muted/50"
                                            >
                                                <TableCell onClick={(e) => e.stopPropagation()}>
                                                    <Checkbox
                                                        checked={selectedIds.has(prospect.id)}
                                                        onCheckedChange={() => toggleSelect(prospect.id)}
                                                    />
                                                </TableCell>
                                                <TableCell>
                                                    <Link to={`/prospects/${prospect.id}`} className="flex items-center gap-3">
                                                        <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-primary/10 text-primary text-sm font-bold">
                                                            {getInitials(prospect)}
                                                        </div>
                                                        <div className="min-w-0">
                                                            <div className="font-medium truncate">{getDisplayName(prospect)}</div>
                                                            <div className="text-xs text-muted-foreground md:hidden truncate">
                                                                {prospect.email || prospect.entreprise || '-'}
                                                            </div>
                                                            {prospect.rating && (
                                                                <span className="text-xs text-yellow-600">⭐ {prospect.rating}</span>
                                                            )}
                                                        </div>
                                                    </Link>
                                                </TableCell>
                                                <TableCell className="hidden md:table-cell text-muted-foreground">
                                                    <span className="truncate max-w-[200px] block">{prospect.email || '-'}</span>
                                                </TableCell>
                                                <TableCell className="font-medium">
                                                    <span className="truncate max-w-[150px] block">{prospect.entreprise || '-'}</span>
                                                </TableCell>
                                                <TableCell className="hidden lg:table-cell text-muted-foreground">
                                                    <span className="truncate max-w-[150px] block">{prospect.poste || '-'}</span>
                                                </TableCell>
                                                <TableCell onClick={(e) => e.stopPropagation()}>
                                                    <DropdownMenu>
                                                        <DropdownMenuTrigger asChild>
                                                            <Button variant="ghost" size="icon">
                                                                <MoreHorizontal className="h-4 w-4" />
                                                            </Button>
                                                        </DropdownMenuTrigger>
                                                        <DropdownMenuContent align="end">
                                                            <DropdownMenuItem asChild>
                                                                <Link to={`/prospects/${prospect.id}`}>
                                                                    <ExternalLink className="mr-2 h-4 w-4" />
                                                                    Voir détails
                                                                </Link>
                                                            </DropdownMenuItem>
                                                            <DropdownMenuItem
                                                                className="text-destructive"
                                                                onClick={() => handleDelete(prospect.id)}
                                                            >
                                                                <Trash2 className="mr-2 h-4 w-4" />
                                                                Supprimer
                                                            </DropdownMenuItem>
                                                        </DropdownMenuContent>
                                                    </DropdownMenu>
                                                </TableCell>
                                            </TableRow>
                                        ))}
                                    </TableBody>
                                </Table>
                            </div>
                        )}
                    </CardContent>
                </Card>
            </div>

            {/* Assign to List Dialog */}
            <Dialog open={assignDialogOpen} onOpenChange={setAssignDialogOpen}>
                <DialogContent>
                    <DialogHeader>
                        <DialogTitle>Assigner à une liste</DialogTitle>
                        <DialogDescription>
                            Sélectionnez une liste pour y assigner {selectedIds.size} prospect(s)
                        </DialogDescription>
                    </DialogHeader>
                    <div className="py-4">
                        <Label htmlFor="list-select">Liste</Label>
                        <Select value={selectedListId} onValueChange={setSelectedListId}>
                            <SelectTrigger id="list-select" className="mt-2">
                                <SelectValue placeholder="Sélectionnez une liste" />
                            </SelectTrigger>
                            <SelectContent>
                                {lists.map((list) => (
                                    <SelectItem key={list.id} value={list.id}>
                                        {list.name} ({list.prospectIds?.length || 0} prospects)
                                    </SelectItem>
                                ))}
                            </SelectContent>
                        </Select>
                        {lists.length === 0 && (
                            <p className="text-sm text-muted-foreground mt-2">
                                Aucune liste disponible. <Link to="/lists" className="text-primary hover:underline">Créer une liste</Link>
                            </p>
                        )}
                    </div>
                    <DialogFooter>
                        <Button variant="outline" onClick={() => setAssignDialogOpen(false)}>
                            Annuler
                        </Button>
                        <Button
                            onClick={handleAssignToList}
                            disabled={!selectedListId || assigning}
                        >
                            {assigning && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                            Assigner
                        </Button>
                    </DialogFooter>
                </DialogContent>
            </Dialog>
        </>
    );
}
