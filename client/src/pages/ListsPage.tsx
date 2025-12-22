import { useEffect, useState } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import {
    Dialog,
    DialogContent,
    DialogDescription,
    DialogFooter,
    DialogHeader,
    DialogTitle,
    DialogTrigger,
} from '@/components/ui/dialog';
import {
    DropdownMenu,
    DropdownMenuContent,
    DropdownMenuItem,
    DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import {
    Plus,
    MoreHorizontal,
    Trash2,
    Users,
    List,
    Loader2,
    FolderOpen
} from 'lucide-react';
import { listsApi, type ProspectList } from '@/api/client';
import { toast } from 'sonner';

export function ListsPage() {
    const [lists, setLists] = useState<ProspectList[]>([]);
    const [loading, setLoading] = useState(true);
    const [creating, setCreating] = useState(false);
    const [dialogOpen, setDialogOpen] = useState(false);
    const [newList, setNewList] = useState({ name: '', description: '' });

    useEffect(() => {
        loadLists();
    }, []);

    async function loadLists() {
        try {
            const result = await listsApi.getAll();
            setLists(result.data || []);
        } catch (error) {`r`n            console.error('API error:', error);`r`n            toast.error('Erreur lors du chargement');
        } finally {
            setLoading(false);
        }
    }

    async function createList() {
        if (!newList.name.trim()) {
            toast.error('Nom requis');
            return;
        }

        setCreating(true);
        try {
            const result = await listsApi.create(newList);
            setLists(prev => [result.data, ...prev]);
            setDialogOpen(false);
            setNewList({ name: '', description: '' });
            toast.success('Liste créée');
        } catch (error) {`r`n            console.error('API error:', error);`r`n            toast.error('Erreur lors de la création');
        } finally {
            setCreating(false);
        }
    }

    async function deleteList(id: string) {
        if (!confirm('Supprimer cette liste ?')) return;
        try {
            await listsApi.delete(id);
            setLists(prev => prev.filter(l => l.id !== id));
            toast.success('Liste supprimée');
        } catch (error) {`r`n            console.error('API error:', error);`r`n            toast.error('Erreur lors de la suppression');
        }
    }

    if (loading) {
        return (
            <div className="flex items-center justify-center py-12">
                <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
            </div>
        );
    }

    return (
        <div className="space-y-6">
            <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
                <div>
                    <h1 className="text-3xl font-bold tracking-tight">Listes de prospects</h1>
                    <p className="text-muted-foreground">Organisez vos prospects en groupes</p>
                </div>
                <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
                    <DialogTrigger asChild>
                        <Button>
                            <Plus className="mr-2 h-4 w-4" />
                            Nouvelle liste
                        </Button>
                    </DialogTrigger>
                    <DialogContent>
                        <DialogHeader>
                            <DialogTitle>Créer une liste</DialogTitle>
                            <DialogDescription>
                                Organisez vos prospects en groupes personnalisés
                            </DialogDescription>
                        </DialogHeader>
                        <div className="space-y-4 py-4">
                            <div className="space-y-2">
                                <Label>Nom de la liste</Label>
                                <Input
                                    placeholder="Ex: Leads qualifiés"
                                    value={newList.name}
                                    onChange={(e) => setNewList({ ...newList, name: e.target.value })}
                                />
                            </div>
                            <div className="space-y-2">
                                <Label>Description (optionnel)</Label>
                                <Input
                                    placeholder="Description de la liste..."
                                    value={newList.description}
                                    onChange={(e) => setNewList({ ...newList, description: e.target.value })}
                                />
                            </div>
                        </div>
                        <DialogFooter>
                            <Button variant="outline" onClick={() => setDialogOpen(false)}>Annuler</Button>
                            <Button onClick={createList} disabled={creating}>
                                {creating && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                                Créer
                            </Button>
                        </DialogFooter>
                    </DialogContent>
                </Dialog>
            </div>

            {/* Triage Status Overview */}
            <div className="grid gap-4 md:grid-cols-4">
                <Card className="bg-linear-to-br from-blue-50 to-blue-100 border-blue-200">
                    <CardContent className="pt-6">
                        <div className="text-2xl font-bold text-blue-700">Nouveau</div>
                        <p className="text-sm text-blue-600">Prospects non triés</p>
                    </CardContent>
                </Card>
                <Card className="bg-linear-to-br from-yellow-50 to-yellow-100 border-yellow-200">
                    <CardContent className="pt-6">
                        <div className="text-2xl font-bold text-yellow-700">À contacter</div>
                        <p className="text-sm text-yellow-600">En attente</p>
                    </CardContent>
                </Card>
                <Card className="bg-linear-to-br from-green-50 to-green-100 border-green-200">
                    <CardContent className="pt-6">
                        <div className="text-2xl font-bold text-green-700">Intéressé</div>
                        <p className="text-sm text-green-600">Prospects chauds</p>
                    </CardContent>
                </Card>
                <Card className="bg-linear-to-br from-gray-50 to-gray-100 border-gray-200">
                    <CardContent className="pt-6">
                        <div className="text-2xl font-bold text-gray-700">Archivé</div>
                        <p className="text-sm text-gray-600">Non pertinents</p>
                    </CardContent>
                </Card>
            </div>

            {/* Lists */}
            {lists.length === 0 ? (
                <Card>
                    <CardContent className="flex flex-col items-center justify-center py-12">
                        <FolderOpen className="h-12 w-12 text-muted-foreground/50 mb-4" />
                        <h3 className="text-lg font-semibold mb-2">Aucune liste</h3>
                        <p className="text-muted-foreground text-sm mb-4">Créez des listes pour organiser vos prospects</p>
                        <Button onClick={() => setDialogOpen(true)}>
                            <Plus className="mr-2 h-4 w-4" />
                            Créer une liste
                        </Button>
                    </CardContent>
                </Card>
            ) : (
                <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
                    {lists.map((list) => (
                        <Card key={list.id} className="hover:shadow-md transition-shadow">
                            <CardHeader>
                                <div className="flex items-start justify-between">
                                    <div className="flex items-center gap-3">
                                        <div className="p-2 rounded-lg bg-primary/10">
                                            <List className="h-4 w-4 text-primary" />
                                        </div>
                                        <div>
                                            <CardTitle className="text-base">{list.name}</CardTitle>
                                            <CardDescription>{list.description || 'Pas de description'}</CardDescription>
                                        </div>
                                    </div>
                                    <DropdownMenu>
                                        <DropdownMenuTrigger asChild>
                                            <Button variant="ghost" size="icon">
                                                <MoreHorizontal className="h-4 w-4" />
                                            </Button>
                                        </DropdownMenuTrigger>
                                        <DropdownMenuContent align="end">
                                            <DropdownMenuItem
                                                className="text-destructive"
                                                onClick={() => deleteList(list.id)}
                                            >
                                                <Trash2 className="mr-2 h-4 w-4" />
                                                Supprimer
                                            </DropdownMenuItem>
                                        </DropdownMenuContent>
                                    </DropdownMenu>
                                </div>
                            </CardHeader>
                            <CardContent>
                                <div className="flex items-center text-sm text-muted-foreground">
                                    <Users className="mr-1 h-4 w-4" />
                                    {list.prospectIds?.length || 0} prospects
                                </div>
                            </CardContent>
                        </Card>
                    ))}
                </div>
            )}
        </div>
    );
}
