import { useEffect, useState } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Badge } from '@/components/ui/badge';
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
    Play,
    Pause,
    CheckCircle,
    Trash2,
    Users,
    Loader2,
    Megaphone
} from 'lucide-react';
import { campaignsApi, type Campaign } from '@/api/client';
import { toast } from 'sonner';

export function CampaignsPage() {
    const [campaigns, setCampaigns] = useState<Campaign[]>([]);
    const [loading, setLoading] = useState(true);
    const [creating, setCreating] = useState(false);
    const [dialogOpen, setDialogOpen] = useState(false);
    const [newCampaign, setNewCampaign] = useState({ name: '', description: '' });

    useEffect(() => {
        loadCampaigns();
    }, []);

    async function loadCampaigns() {
        try {
            const result = await campaignsApi.getAll();
            setCampaigns(result.data || []);
        } catch (error) {`r`n            console.error('API error:', error);`r`n            toast.error('Erreur lors du chargement');
        } finally {
            setLoading(false);
        }
    }

    async function createCampaign() {
        if (!newCampaign.name.trim()) {
            toast.error('Nom requis');
            return;
        }

        setCreating(true);
        try {
            const result = await campaignsApi.create(newCampaign);
            setCampaigns(prev => [result.data, ...prev]);
            setDialogOpen(false);
            setNewCampaign({ name: '', description: '' });
            toast.success('Campagne créée');
        } catch (error) {`r`n            console.error('API error:', error);`r`n            toast.error('Erreur lors de la création');
        } finally {
            setCreating(false);
        }
    }

    async function changeStatus(id: string, status: string) {
        try {
            await campaignsApi.changeStatus(id, status);
            setCampaigns(prev => prev.map(c => c.id === id ? { ...c, status: status as Campaign['status'] } : c));
            toast.success('Statut mis à jour');
        } catch (error) {`r`n            console.error('API error:', error);`r`n            toast.error('Erreur lors de la mise à jour');
        }
    }

    async function deleteCampaign(id: string) {
        if (!confirm('Supprimer cette campagne ?')) return;
        try {
            await campaignsApi.delete(id);
            setCampaigns(prev => prev.filter(c => c.id !== id));
            toast.success('Campagne supprimée');
        } catch (error) {`r`n            console.error('API error:', error);`r`n            toast.error('Erreur lors de la suppression');
        }
    }

    const statusColors = {
        draft: 'bg-gray-100 text-gray-700',
        active: 'bg-green-100 text-green-700',
        paused: 'bg-yellow-100 text-yellow-700',
        completed: 'bg-blue-100 text-blue-700',
    };

    const statusLabels = {
        draft: 'Brouillon',
        active: 'Active',
        paused: 'En pause',
        completed: 'Terminée',
    };

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
                    <h1 className="text-3xl font-bold tracking-tight">Campagnes</h1>
                    <p className="text-muted-foreground">Gérez vos campagnes de prospection</p>
                </div>
                <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
                    <DialogTrigger asChild>
                        <Button>
                            <Plus className="mr-2 h-4 w-4" />
                            Nouvelle campagne
                        </Button>
                    </DialogTrigger>
                    <DialogContent>
                        <DialogHeader>
                            <DialogTitle>Créer une campagne</DialogTitle>
                            <DialogDescription>
                                Configurez votre nouvelle campagne de prospection
                            </DialogDescription>
                        </DialogHeader>
                        <div className="space-y-4 py-4">
                            <div className="space-y-2">
                                <Label>Nom de la campagne</Label>
                                <Input
                                    placeholder="Ex: Campagne Q1 2024"
                                    value={newCampaign.name}
                                    onChange={(e) => setNewCampaign({ ...newCampaign, name: e.target.value })}
                                />
                            </div>
                            <div className="space-y-2">
                                <Label>Description (optionnel)</Label>
                                <Input
                                    placeholder="Description de la campagne..."
                                    value={newCampaign.description}
                                    onChange={(e) => setNewCampaign({ ...newCampaign, description: e.target.value })}
                                />
                            </div>
                        </div>
                        <DialogFooter>
                            <Button variant="outline" onClick={() => setDialogOpen(false)}>Annuler</Button>
                            <Button onClick={createCampaign} disabled={creating}>
                                {creating && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                                Créer
                            </Button>
                        </DialogFooter>
                    </DialogContent>
                </Dialog>
            </div>

            {/* Stats */}
            <div className="grid gap-4 grid-cols-2 md:grid-cols-4">
                <Card>
                    <CardContent className="pt-6">
                        <div className="text-2xl font-bold">{campaigns.length}</div>
                        <p className="text-sm text-muted-foreground">Total</p>
                    </CardContent>
                </Card>
                <Card>
                    <CardContent className="pt-6">
                        <div className="text-2xl font-bold text-green-600">
                            {campaigns.filter(c => c.status === 'active').length}
                        </div>
                        <p className="text-sm text-muted-foreground">Actives</p>
                    </CardContent>
                </Card>
                <Card>
                    <CardContent className="pt-6">
                        <div className="text-2xl font-bold text-gray-600">
                            {campaigns.filter(c => c.status === 'draft').length}
                        </div>
                        <p className="text-sm text-muted-foreground">Brouillons</p>
                    </CardContent>
                </Card>
                <Card>
                    <CardContent className="pt-6">
                        <div className="text-2xl font-bold text-blue-600">
                            {campaigns.filter(c => c.status === 'completed').length}
                        </div>
                        <p className="text-sm text-muted-foreground">Terminées</p>
                    </CardContent>
                </Card>
            </div>

            {/* Campaigns List */}
            {campaigns.length === 0 ? (
                <Card>
                    <CardContent className="flex flex-col items-center justify-center py-12">
                        <Megaphone className="h-12 w-12 text-muted-foreground/50 mb-4" />
                        <h3 className="text-lg font-semibold mb-2">Aucune campagne</h3>
                        <p className="text-muted-foreground text-sm mb-4">Créez votre première campagne</p>
                        <Button onClick={() => setDialogOpen(true)}>
                            <Plus className="mr-2 h-4 w-4" />
                            Créer une campagne
                        </Button>
                    </CardContent>
                </Card>
            ) : (
                <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
                    {campaigns.map((campaign) => (
                        <Card key={campaign.id} className="hover:shadow-md transition-shadow">
                            <CardHeader>
                                <div className="flex items-start justify-between">
                                    <div>
                                        <CardTitle className="text-lg">{campaign.name}</CardTitle>
                                        <CardDescription>{campaign.description || 'Pas de description'}</CardDescription>
                                    </div>
                                    <DropdownMenu>
                                        <DropdownMenuTrigger asChild>
                                            <Button variant="ghost" size="icon">
                                                <MoreHorizontal className="h-4 w-4" />
                                            </Button>
                                        </DropdownMenuTrigger>
                                        <DropdownMenuContent align="end">
                                            {campaign.status === 'draft' && (
                                                <DropdownMenuItem onClick={() => changeStatus(campaign.id, 'active')}>
                                                    <Play className="mr-2 h-4 w-4" />
                                                    Démarrer
                                                </DropdownMenuItem>
                                            )}
                                            {campaign.status === 'active' && (
                                                <DropdownMenuItem onClick={() => changeStatus(campaign.id, 'paused')}>
                                                    <Pause className="mr-2 h-4 w-4" />
                                                    Mettre en pause
                                                </DropdownMenuItem>
                                            )}
                                            {campaign.status === 'paused' && (
                                                <DropdownMenuItem onClick={() => changeStatus(campaign.id, 'active')}>
                                                    <Play className="mr-2 h-4 w-4" />
                                                    Reprendre
                                                </DropdownMenuItem>
                                            )}
                                            {campaign.status !== 'completed' && (
                                                <DropdownMenuItem onClick={() => changeStatus(campaign.id, 'completed')}>
                                                    <CheckCircle className="mr-2 h-4 w-4" />
                                                    Terminer
                                                </DropdownMenuItem>
                                            )}
                                            <DropdownMenuItem
                                                className="text-destructive"
                                                onClick={() => deleteCampaign(campaign.id)}
                                            >
                                                <Trash2 className="mr-2 h-4 w-4" />
                                                Supprimer
                                            </DropdownMenuItem>
                                        </DropdownMenuContent>
                                    </DropdownMenu>
                                </div>
                            </CardHeader>
                            <CardContent>
                                <div className="flex items-center justify-between">
                                    <Badge className={statusColors[campaign.status]}>
                                        {statusLabels[campaign.status]}
                                    </Badge>
                                    <div className="flex items-center text-sm text-muted-foreground">
                                        <Users className="mr-1 h-4 w-4" />
                                        {campaign.prospectIds?.length || 0} prospects
                                    </div>
                                </div>
                            </CardContent>
                        </Card>
                    ))}
                </div>
            )}
        </div>
    );
}
