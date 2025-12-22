import { useEffect, useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Switch } from '@/components/ui/switch';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from '@/components/ui/dialog';
import {
    Loader2,
    Plus,
    Zap,
    Play,
    Trash2,
    Settings2,
    ArrowRight,
    Users,
    Workflow,
    Target,
    CheckCircle2,
    Clock,
    AlertCircle
} from 'lucide-react';
import { toast } from 'sonner';

interface AutomationAction {
    id: string;
    type: string;
    config: Record<string, unknown>;
}

interface Automation {
    id: string;
    name: string;
    description: string;
    active: boolean;
    trigger: {
        type: string;
        conditions: Record<string, unknown>;
    };
    actions: AutomationAction[];
    stats: {
        triggered: number;
        lastRun: string | null;
    };
    createdAt: string;
    updatedAt: string;
}

const TRIGGER_TYPES = [
    { value: 'prospect_created', label: 'Nouveau prospect créé', icon: Users, color: 'bg-emerald-500' },
    { value: 'pipeline_changed', label: 'Changement de stage pipeline', icon: Target, color: 'bg-violet-500' },
    { value: 'enrichment_completed', label: 'Enrichissement terminé', icon: CheckCircle2, color: 'bg-blue-500' },
    { value: 'sequence_step_completed', label: 'Étape de séquence complétée', icon: Workflow, color: 'bg-amber-500' }
];

const ACTION_TYPES = [
    { value: 'add_to_sequence', label: 'Ajouter à une séquence', icon: Workflow },
    { value: 'change_triage', label: 'Changer le statut triage', icon: AlertCircle },
    { value: 'move_pipeline', label: 'Déplacer dans le pipeline', icon: Target }
];

const TRIAGE_STATUSES = ['hot', 'warm', 'cold', 'new', 'qualified'];
const PIPELINE_STAGES = [
    { id: 'new', name: 'Nouveau' },
    { id: 'contacted', name: 'Contacté' },
    { id: 'meeting', name: 'RDV programmé' },
    { id: 'proposal', name: 'Proposition' },
    { id: 'negotiation', name: 'Négociation' },
    { id: 'won', name: 'Gagné' },
    { id: 'lost', name: 'Perdu' }
];

// API functions
const automationsApi = {
    getAll: async () => {
        const res = await fetch('/api/automations');
        return res.json();
    },
    create: async (data: Partial<Automation>) => {
        const res = await fetch('/api/automations', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(data)
        });
        return res.json();
    },
    toggle: async (id: string) => {
        const res = await fetch(`/api/automations/${id}/toggle`, { method: 'PATCH' });
        return res.json();
    },
    delete: async (id: string) => {
        const res = await fetch(`/api/automations/${id}`, { method: 'DELETE' });
        return res.json();
    }
};

export function AutomationsPage() {
    const [automations, setAutomations] = useState<Automation[]>([]);
    const [loading, setLoading] = useState(true);
    const [showCreateDialog, setShowCreateDialog] = useState(false);
    const [creating, setCreating] = useState(false);

    // Form state
    const [newName, setNewName] = useState('');
    const [newDescription, setNewDescription] = useState('');
    const [triggerType, setTriggerType] = useState('');
    const [actionType, setActionType] = useState('');
    const [actionConfig, setActionConfig] = useState<Record<string, string>>({});

    useEffect(() => {
        loadAutomations();
    }, []);

    async function loadAutomations() {
        try {
            const result = await automationsApi.getAll();
            if (result.success) {
                setAutomations(result.data || []);
            }
        } catch (error) {
            console.error('Error loading automations:', error);
            toast.error('Erreur lors du chargement');
        } finally {
            setLoading(false);
        }
    }

    async function handleCreate() {
        if (!newName || !triggerType || !actionType) {
            toast.error('Veuillez remplir tous les champs');
            return;
        }

        setCreating(true);
        try {
            const result = await automationsApi.create({
                name: newName,
                description: newDescription,
                trigger: { type: triggerType, conditions: {} },
                actions: [{ type: actionType, config: actionConfig } as AutomationAction]
            });

            if (result.success) {
                setAutomations(prev => [...prev, result.data]);
                toast.success('Automation créée!');
                resetForm();
                setShowCreateDialog(false);
            } else {
                toast.error(result.error || 'Erreur');
            }
        } catch {
            toast.error('Erreur lors de la création');
        } finally {
            setCreating(false);
        }
    }

    async function handleToggle(id: string) {
        try {
            const result = await automationsApi.toggle(id);
            if (result.success) {
                setAutomations(prev => prev.map(a =>
                    a.id === id ? { ...a, active: result.data.active } : a
                ));
                toast.success(result.data.active ? 'Automation activée' : 'Automation désactivée');
            } else {
                toast.error(result.error || 'Erreur lors du toggle');
            }
        } catch {
            toast.error('Erreur lors du toggle');
        }
    }

    async function handleDelete(id: string) {
        if (!confirm('Supprimer cette automation?')) return;

        try {
            const result = await automationsApi.delete(id);
            if (result.success) {
                setAutomations(prev => prev.filter(a => a.id !== id));
                toast.success('Automation supprimée');
            } else {
                toast.error(result.error || 'Erreur lors de la suppression');
            }
        } catch {
            toast.error('Erreur lors de la suppression');
        }
    }

    function resetForm() {
        setNewName('');
        setNewDescription('');
        setTriggerType('');
        setActionType('');
        setActionConfig({});
    }

    function getTriggerInfo(type: string) {
        return TRIGGER_TYPES.find(t => t.value === type) || TRIGGER_TYPES[0];
    }

    function getActionInfo(type: string) {
        return ACTION_TYPES.find(a => a.value === type) || ACTION_TYPES[0];
    }

    if (loading) {
        return (
            <div className="flex items-center justify-center h-96">
                <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
            </div>
        );
    }

    return (
        <div className="space-y-6">
            {/* Header */}
            <div className="flex items-center justify-between">
                <div>
                    <h1 className="text-3xl font-bold tracking-tight bg-linear-to-r from-amber-500 via-orange-500 to-red-500 bg-clip-text text-transparent">
                        Automatisations
                    </h1>
                    <p className="text-muted-foreground mt-1">
                        Créez des règles IF-THEN pour automatiser vos workflows
                    </p>
                </div>
                <Button
                    onClick={() => setShowCreateDialog(true)}
                    className="bg-linear-to-r from-amber-500 to-orange-500 hover:from-amber-600 hover:to-orange-600"
                >
                    <Plus className="h-4 w-4 mr-2" />
                    Nouvelle Automation
                </Button>
            </div>

            {/* Stats */}
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                <Card className="border-0 shadow-sm bg-linear-to-br from-amber-50 to-orange-50 dark:from-amber-950/20 dark:to-orange-950/20">
                    <CardContent className="pt-6">
                        <div className="flex items-center gap-3">
                            <div className="p-2 rounded-lg bg-amber-500/10">
                                <Zap className="h-5 w-5 text-amber-500" />
                            </div>
                            <div>
                                <div className="text-2xl font-bold">{automations.length}</div>
                                <div className="text-sm text-muted-foreground">Automations</div>
                            </div>
                        </div>
                    </CardContent>
                </Card>
                <Card className="border-0 shadow-sm bg-linear-to-br from-emerald-50 to-green-50 dark:from-emerald-950/20 dark:to-green-950/20">
                    <CardContent className="pt-6">
                        <div className="flex items-center gap-3">
                            <div className="p-2 rounded-lg bg-emerald-500/10">
                                <Play className="h-5 w-5 text-emerald-500" />
                            </div>
                            <div>
                                <div className="text-2xl font-bold">{automations.filter(a => a.active).length}</div>
                                <div className="text-sm text-muted-foreground">Actives</div>
                            </div>
                        </div>
                    </CardContent>
                </Card>
                <Card className="border-0 shadow-sm bg-linear-to-br from-violet-50 to-purple-50 dark:from-violet-950/20 dark:to-purple-950/20">
                    <CardContent className="pt-6">
                        <div className="flex items-center gap-3">
                            <div className="p-2 rounded-lg bg-violet-500/10">
                                <CheckCircle2 className="h-5 w-5 text-violet-500" />
                            </div>
                            <div>
                                <div className="text-2xl font-bold">
                                    {automations.reduce((sum, a) => sum + a.stats.triggered, 0)}
                                </div>
                                <div className="text-sm text-muted-foreground">Exécutions</div>
                            </div>
                        </div>
                    </CardContent>
                </Card>
            </div>

            {/* Automations List */}
            {automations.length === 0 ? (
                <Card className="border-2 border-dashed">
                    <CardContent className="py-16 text-center">
                        <div className="w-16 h-16 mx-auto mb-4 rounded-full bg-linear-to-br from-amber-100 to-orange-100 dark:from-amber-950 dark:to-orange-950 flex items-center justify-center">
                            <Zap className="h-8 w-8 text-amber-500" />
                        </div>
                        <h3 className="text-lg font-semibold mb-2">Aucune automation</h3>
                        <p className="text-muted-foreground mb-4">
                            Créez votre première règle pour automatiser vos actions
                        </p>
                        <Button
                            onClick={() => setShowCreateDialog(true)}
                            className="bg-linear-to-r from-amber-500 to-orange-500"
                        >
                            <Plus className="h-4 w-4 mr-2" />
                            Créer une automation
                        </Button>
                    </CardContent>
                </Card>
            ) : (
                <div className="space-y-4">
                    {automations.map(automation => {
                        const triggerInfo = getTriggerInfo(automation.trigger.type);
                        const TriggerIcon = triggerInfo.icon;

                        return (
                            <Card
                                key={automation.id}
                                className={`transition-all hover:shadow-md ${!automation.active ? 'opacity-60' : ''}`}
                            >
                                <CardContent className="p-4">
                                    <div className="flex items-center gap-4">
                                        {/* Toggle */}
                                        <Switch
                                            checked={automation.active}
                                            onCheckedChange={() => handleToggle(automation.id)}
                                        />

                                        {/* Trigger Icon */}
                                        <div className={`p-2 rounded-lg ${triggerInfo.color}`}>
                                            <TriggerIcon className="h-5 w-5 text-white" />
                                        </div>

                                        {/* Content */}
                                        <div className="flex-1">
                                            <div className="flex items-center gap-2">
                                                <span className="font-semibold">{automation.name}</span>
                                                <Badge variant={automation.active ? 'default' : 'secondary'}>
                                                    {automation.active ? 'Active' : 'Inactive'}
                                                </Badge>
                                            </div>

                                            {/* IF-THEN Display */}
                                            <div className="flex items-center gap-2 mt-2 text-sm text-muted-foreground">
                                                <span className="font-medium text-amber-600">SI</span>
                                                <span>{triggerInfo.label}</span>
                                                <ArrowRight className="h-4 w-4" />
                                                <span className="font-medium text-orange-600">ALORS</span>
                                                {automation.actions.map((action, i) => (
                                                    <span key={i}>{getActionInfo(action.type).label}</span>
                                                ))}
                                            </div>
                                        </div>

                                        {/* Stats */}
                                        <div className="text-right text-sm">
                                            <div className="flex items-center gap-1 text-muted-foreground">
                                                <Play className="h-3 w-3" />
                                                <span>{automation.stats.triggered} exécutions</span>
                                            </div>
                                            {automation.stats.lastRun && (
                                                <div className="flex items-center gap-1 text-xs text-muted-foreground mt-1">
                                                    <Clock className="h-3 w-3" />
                                                    <span>
                                                        {new Date(automation.stats.lastRun).toLocaleDateString('fr-FR')}
                                                    </span>
                                                </div>
                                            )}
                                        </div>

                                        {/* Actions */}
                                        <Button
                                            size="icon"
                                            variant="ghost"
                                            onClick={() => handleDelete(automation.id)}
                                            className="text-red-500 hover:text-red-600 hover:bg-red-50"
                                        >
                                            <Trash2 className="h-4 w-4" />
                                        </Button>
                                    </div>
                                </CardContent>
                            </Card>
                        );
                    })}
                </div>
            )}

            {/* Create Dialog */}
            <Dialog open={showCreateDialog} onOpenChange={setShowCreateDialog}>
                <DialogContent className="max-w-lg">
                    <DialogHeader>
                        <DialogTitle className="flex items-center gap-2">
                            <Zap className="h-5 w-5 text-amber-500" />
                            Nouvelle Automation
                        </DialogTitle>
                    </DialogHeader>

                    <div className="space-y-4 py-4">
                        {/* Name */}
                        <div className="space-y-2">
                            <Label>Nom</Label>
                            <Input
                                value={newName}
                                onChange={e => setNewName(e.target.value)}
                                placeholder="Ex: Nouveau prospect → Séquence Onboarding"
                            />
                        </div>

                        {/* Description */}
                        <div className="space-y-2">
                            <Label>Description (optionnel)</Label>
                            <Input
                                value={newDescription}
                                onChange={e => setNewDescription(e.target.value)}
                                placeholder="Description de l'automation"
                            />
                        </div>

                        {/* IF Section */}
                        <Card className="border-amber-200 bg-amber-50/50 dark:bg-amber-950/20 dark:border-amber-800">
                            <CardHeader className="pb-2">
                                <CardTitle className="text-sm font-medium flex items-center gap-2 text-amber-700 dark:text-amber-400">
                                    <Settings2 className="h-4 w-4" />
                                    SI (Déclencheur)
                                </CardTitle>
                            </CardHeader>
                            <CardContent>
                                <Select value={triggerType} onValueChange={setTriggerType}>
                                    <SelectTrigger>
                                        <SelectValue placeholder="Choisir un déclencheur..." />
                                    </SelectTrigger>
                                    <SelectContent>
                                        {TRIGGER_TYPES.map(trigger => (
                                            <SelectItem key={trigger.value} value={trigger.value}>
                                                <div className="flex items-center gap-2">
                                                    <trigger.icon className="h-4 w-4" />
                                                    {trigger.label}
                                                </div>
                                            </SelectItem>
                                        ))}
                                    </SelectContent>
                                </Select>
                            </CardContent>
                        </Card>

                        {/* THEN Section */}
                        <Card className="border-orange-200 bg-orange-50/50 dark:bg-orange-950/20 dark:border-orange-800">
                            <CardHeader className="pb-2">
                                <CardTitle className="text-sm font-medium flex items-center gap-2 text-orange-700 dark:text-orange-400">
                                    <ArrowRight className="h-4 w-4" />
                                    ALORS (Action)
                                </CardTitle>
                            </CardHeader>
                            <CardContent className="space-y-3">
                                <Select value={actionType} onValueChange={setActionType}>
                                    <SelectTrigger>
                                        <SelectValue placeholder="Choisir une action..." />
                                    </SelectTrigger>
                                    <SelectContent>
                                        {ACTION_TYPES.map(action => (
                                            <SelectItem key={action.value} value={action.value}>
                                                <div className="flex items-center gap-2">
                                                    <action.icon className="h-4 w-4" />
                                                    {action.label}
                                                </div>
                                            </SelectItem>
                                        ))}
                                    </SelectContent>
                                </Select>

                                {/* Action Config */}
                                {actionType === 'change_triage' && (
                                    <Select
                                        value={actionConfig.status || ''}
                                        onValueChange={v => setActionConfig({ status: v })}
                                    >
                                        <SelectTrigger>
                                            <SelectValue placeholder="Choisir un statut..." />
                                        </SelectTrigger>
                                        <SelectContent>
                                            {TRIAGE_STATUSES.map(status => (
                                                <SelectItem key={status} value={status}>
                                                    {status.charAt(0).toUpperCase() + status.slice(1)}
                                                </SelectItem>
                                            ))}
                                        </SelectContent>
                                    </Select>
                                )}

                                {actionType === 'move_pipeline' && (
                                    <Select
                                        value={actionConfig.stageId || ''}
                                        onValueChange={v => setActionConfig({ stageId: v })}
                                    >
                                        <SelectTrigger>
                                            <SelectValue placeholder="Choisir une étape..." />
                                        </SelectTrigger>
                                        <SelectContent>
                                            {PIPELINE_STAGES.map(stage => (
                                                <SelectItem key={stage.id} value={stage.id}>
                                                    {stage.name}
                                                </SelectItem>
                                            ))}
                                        </SelectContent>
                                    </Select>
                                )}
                            </CardContent>
                        </Card>
                    </div>

                    <DialogFooter>
                        <Button variant="outline" onClick={() => setShowCreateDialog(false)}>
                            Annuler
                        </Button>
                        <Button
                            onClick={handleCreate}
                            disabled={creating || !newName || !triggerType || !actionType}
                            className="bg-linear-to-r from-amber-500 to-orange-500"
                        >
                            {creating ? (
                                <Loader2 className="h-4 w-4 animate-spin mr-2" />
                            ) : (
                                <Zap className="h-4 w-4 mr-2" />
                            )}
                            Créer
                        </Button>
                    </DialogFooter>
                </DialogContent>
            </Dialog>
        </div>
    );
}
