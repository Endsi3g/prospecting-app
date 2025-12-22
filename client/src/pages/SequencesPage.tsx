import { useEffect, useState } from 'react';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Badge } from '@/components/ui/badge';
import { Textarea } from '@/components/ui/textarea';
import { Separator } from '@/components/ui/separator';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import {
    Dialog,
    DialogContent,
    DialogDescription,
    DialogFooter,
    DialogHeader,
    DialogTitle,
} from '@/components/ui/dialog';
import {
    Plus,
    Play,
    Pause,
    Trash2,
    Mail,
    Phone,
    MessageSquare,
    Clock,
    Users,
    Loader2,
    ArrowRight,
    Pencil,
    Linkedin,
    ClipboardList,
    Zap,
    TrendingUp,
    ChevronUp,
    ChevronDown,
    GripVertical,
    Sparkles
} from 'lucide-react';
import { sequencesApi, type Sequence, type SequenceStep, type StepType, type SequenceStatus } from '@/api/client';
import { toast } from 'sonner';

// Step type configuration with enhanced styling
const STEP_TYPES: { type: StepType; label: string; icon: React.ReactNode; color: string; bgColor: string; description: string }[] = [
    { type: 'email', label: 'Email', icon: <Mail className="h-4 w-4" />, color: 'text-blue-600', bgColor: 'bg-blue-500', description: 'Envoyer un email' },
    { type: 'call', label: 'Appel', icon: <Phone className="h-4 w-4" />, color: 'text-green-600', bgColor: 'bg-green-500', description: 'Programmer un appel' },
    { type: 'linkedin', label: 'LinkedIn', icon: <Linkedin className="h-4 w-4" />, color: 'text-sky-600', bgColor: 'bg-sky-500', description: 'Message LinkedIn' },
    { type: 'sms', label: 'SMS', icon: <MessageSquare className="h-4 w-4" />, color: 'text-purple-600', bgColor: 'bg-purple-500', description: 'Envoyer un SMS' },
    { type: 'wait', label: 'Attendre', icon: <Clock className="h-4 w-4" />, color: 'text-amber-600', bgColor: 'bg-amber-500', description: 'Délai entre étapes' },
    { type: 'task', label: 'Tâche', icon: <ClipboardList className="h-4 w-4" />, color: 'text-slate-600', bgColor: 'bg-slate-500', description: 'Tâche manuelle' },
];

function getStepConfig(type: StepType) {
    return STEP_TYPES.find(s => s.type === type) || STEP_TYPES[0];
}

function getStatusConfig(status: SequenceStatus) {
    switch (status) {
        case 'active':
            return { label: 'Active', className: 'bg-emerald-500/10 text-emerald-600 border-emerald-500/20', icon: '▶️' };
        case 'paused':
            return { label: 'En pause', className: 'bg-amber-500/10 text-amber-600 border-amber-500/20', icon: '⏸️' };
        case 'draft':
            return { label: 'Brouillon', className: 'bg-slate-500/10 text-slate-600 border-slate-500/20', icon: '📝' };
        case 'completed':
            return { label: 'Terminée', className: 'bg-blue-500/10 text-blue-600 border-blue-500/20', icon: '✅' };
    }
}

export function SequencesPage() {
    const [sequences, setSequences] = useState<Sequence[]>([]);
    const [loading, setLoading] = useState(true);
    const [showCreateDialog, setShowCreateDialog] = useState(false);
    const [editingSequence, setEditingSequence] = useState<Sequence | null>(null);
    const [newSequence, setNewSequence] = useState({ name: '', description: '' });
    const [creating, setCreating] = useState(false);

    useEffect(() => {
        loadSequences();
    }, []);

    async function loadSequences() {
        try {
            const result = await sequencesApi.getAll();
            setSequences(result.data || []);
        } catch (error) {
            console.error('Error loading sequences:', error);
            toast.error('Erreur lors du chargement des séquences');
        } finally {
            setLoading(false);
        }
    }

    async function handleCreate() {
        if (!newSequence.name.trim()) {
            toast.error('Nom requis');
            return;
        }

        setCreating(true);
        try {
            const result = await sequencesApi.create({
                name: newSequence.name,
                description: newSequence.description,
                steps: [
                    { type: 'email', name: 'Email initial', waitDays: 0 },
                    { type: 'wait', name: 'Attendre 3 jours', waitDays: 3 },
                    { type: 'email', name: 'Relance', waitDays: 0 },
                ]
            });
            setSequences(prev => [...prev, result.data]);
            setShowCreateDialog(false);
            setNewSequence({ name: '', description: '' });
            toast.success('Séquence créée!');
            setEditingSequence(result.data);
        } catch {
            toast.error('Erreur lors de la création');
        } finally {
            setCreating(false);
        }
    }

    async function handleDelete(id: string) {
        if (!confirm('Supprimer cette séquence?')) return;
        try {
            await sequencesApi.delete(id);
            setSequences(prev => prev.filter(s => s.id !== id));
            toast.success('Séquence supprimée');
        } catch {
            toast.error('Erreur lors de la suppression');
        }
    }

    async function handleStatusChange(id: string, status: SequenceStatus) {
        try {
            const result = await sequencesApi.changeStatus(id, status);
            setSequences(prev => prev.map(s => s.id === id ? result.data : s));
            toast.success(`Séquence ${status === 'active' ? 'activée' : 'mise en pause'}`);
        } catch {
            toast.error('Erreur lors du changement de statut');
        }
    }

    if (loading) {
        return (
            <div className="flex items-center justify-center h-96">
                <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
            </div>
        );
    }

    return (
        <div className="space-y-8">
            {/* Header */}
            <div className="flex items-center justify-between">
                <div>
                    <h1 className="text-3xl font-bold tracking-tight bg-linear-to-r from-violet-600 via-purple-600 to-indigo-600 bg-clip-text text-transparent">
                        Séquences
                    </h1>
                    <p className="text-muted-foreground mt-1">
                        Automatisez vos workflows de prospection multicanaux
                    </p>
                </div>
                <Button onClick={() => setShowCreateDialog(true)} className="gap-2 bg-linear-to-r from-violet-600 to-indigo-600 hover:from-violet-700 hover:to-indigo-700">
                    <Sparkles className="h-4 w-4" />
                    Nouvelle séquence
                </Button>
            </div>

            {/* Stats Row */}
            {sequences.length > 0 && (
                <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                    <Card className="border-0 shadow-sm bg-linear-to-br from-violet-50 to-violet-100/50 dark:from-violet-950/20 dark:to-violet-900/10">
                        <CardContent className="pt-6">
                            <div className="flex items-center gap-4">
                                <div className="p-3 rounded-xl bg-violet-500/10 ring-1 ring-violet-500/20">
                                    <Zap className="h-6 w-6 text-violet-600" />
                                </div>
                                <div>
                                    <div className="text-3xl font-bold text-violet-700 dark:text-violet-400">{sequences.length}</div>
                                    <div className="text-sm text-violet-600/70">Séquences</div>
                                </div>
                            </div>
                        </CardContent>
                    </Card>
                    <Card className="border-0 shadow-sm bg-linear-to-br from-emerald-50 to-emerald-100/50 dark:from-emerald-950/20 dark:to-emerald-900/10">
                        <CardContent className="pt-6">
                            <div className="flex items-center gap-4">
                                <div className="p-3 rounded-xl bg-emerald-500/10 ring-1 ring-emerald-500/20">
                                    <Play className="h-6 w-6 text-emerald-600" />
                                </div>
                                <div>
                                    <div className="text-3xl font-bold text-emerald-700 dark:text-emerald-400">
                                        {sequences.filter(s => s.status === 'active').length}
                                    </div>
                                    <div className="text-sm text-emerald-600/70">Actives</div>
                                </div>
                            </div>
                        </CardContent>
                    </Card>
                    <Card className="border-0 shadow-sm bg-linear-to-br from-blue-50 to-blue-100/50 dark:from-blue-950/20 dark:to-blue-900/10">
                        <CardContent className="pt-6">
                            <div className="flex items-center gap-4">
                                <div className="p-3 rounded-xl bg-blue-500/10 ring-1 ring-blue-500/20">
                                    <Users className="h-6 w-6 text-blue-600" />
                                </div>
                                <div>
                                    <div className="text-3xl font-bold text-blue-700 dark:text-blue-400">
                                        {sequences.reduce((sum, s) => sum + s.stats.enrolled, 0)}
                                    </div>
                                    <div className="text-sm text-blue-600/70">Prospects</div>
                                </div>
                            </div>
                        </CardContent>
                    </Card>
                    <Card className="border-0 shadow-sm bg-linear-to-br from-amber-50 to-amber-100/50 dark:from-amber-950/20 dark:to-amber-900/10">
                        <CardContent className="pt-6">
                            <div className="flex items-center gap-4">
                                <div className="p-3 rounded-xl bg-amber-500/10 ring-1 ring-amber-500/20">
                                    <TrendingUp className="h-6 w-6 text-amber-600" />
                                </div>
                                <div>
                                    <div className="text-3xl font-bold text-amber-700 dark:text-amber-400">
                                        {sequences.reduce((sum, s) => sum + s.stats.replied, 0)}
                                    </div>
                                    <div className="text-sm text-amber-600/70">Réponses</div>
                                </div>
                            </div>
                        </CardContent>
                    </Card>
                </div>
            )}

            {/* Sequences List */}
            {sequences.length === 0 ? (
                <Card className="border-dashed border-2 bg-linear-to-br from-slate-50 to-slate-100/50 dark:from-slate-900 dark:to-slate-800/50">
                    <CardContent className="py-20 text-center">
                        <div className="w-20 h-20 mx-auto mb-6 rounded-2xl bg-linear-to-br from-violet-500 to-indigo-600 flex items-center justify-center shadow-lg shadow-violet-500/25">
                            <Zap className="h-10 w-10 text-white" />
                        </div>
                        <h3 className="text-xl font-semibold mb-2">Aucune séquence</h3>
                        <p className="text-muted-foreground mb-6 max-w-md mx-auto">
                            Créez votre première séquence multicanale pour automatiser votre prospection
                        </p>
                        <Button onClick={() => setShowCreateDialog(true)} size="lg" className="bg-linear-to-r from-violet-600 to-indigo-600">
                            <Plus className="h-5 w-5 mr-2" />
                            Créer une séquence
                        </Button>
                    </CardContent>
                </Card>
            ) : (
                <div className="space-y-4">
                    {sequences.map(sequence => {
                        const statusConfig = getStatusConfig(sequence.status);
                        return (
                            <Card key={sequence.id} className="group hover:shadow-lg transition-all duration-300 border-0 shadow-sm overflow-hidden">
                                <CardContent className="p-0">
                                    <div className="flex">
                                        {/* Left accent bar */}
                                        <div className={`w-1.5 ${sequence.status === 'active' ? 'bg-emerald-500' : sequence.status === 'paused' ? 'bg-amber-500' : 'bg-slate-300'}`} />

                                        <div className="flex-1 p-6">
                                            <div className="flex items-start justify-between">
                                                <div className="flex-1">
                                                    {/* Header */}
                                                    <div className="flex items-center gap-3 mb-2">
                                                        <h3 className="font-semibold text-lg group-hover:text-violet-600 transition-colors">{sequence.name}</h3>
                                                        <Badge variant="outline" className={statusConfig.className}>
                                                            {statusConfig.icon} {statusConfig.label}
                                                        </Badge>
                                                    </div>
                                                    <p className="text-sm text-muted-foreground mb-4">
                                                        {sequence.description || 'Pas de description'}
                                                    </p>

                                                    {/* Steps flow */}
                                                    <div className="flex items-center gap-1 flex-wrap">
                                                        {sequence.steps.map((step, index) => {
                                                            const config = getStepConfig(step.type);
                                                            return (
                                                                <div key={step.id} className="flex items-center">
                                                                    <div className={`flex items-center gap-1.5 px-2.5 py-1 rounded-full ${config.bgColor}/10 border border-${config.color.replace('text-', '')}/20`}>
                                                                        <span className={config.color}>{config.icon}</span>
                                                                        <span className={`text-xs font-medium ${config.color}`}>
                                                                            {step.type === 'wait' ? `${step.waitDays}j` : config.label}
                                                                        </span>
                                                                    </div>
                                                                    {index < sequence.steps.length - 1 && (
                                                                        <ArrowRight className="h-3 w-3 text-muted-foreground/40 mx-1" />
                                                                    )}
                                                                </div>
                                                            );
                                                        })}
                                                    </div>
                                                </div>

                                                {/* Stats */}
                                                <div className="flex items-center gap-8 mx-8 text-center">
                                                    <div>
                                                        <div className="text-2xl font-bold">{sequence.stats.enrolled}</div>
                                                        <div className="text-xs text-muted-foreground">Inscrits</div>
                                                    </div>
                                                    <div>
                                                        <div className="text-2xl font-bold text-emerald-600">{sequence.stats.completed}</div>
                                                        <div className="text-xs text-muted-foreground">Terminés</div>
                                                    </div>
                                                    <div>
                                                        <div className="text-2xl font-bold text-blue-600">{sequence.stats.replied}</div>
                                                        <div className="text-xs text-muted-foreground">Réponses</div>
                                                    </div>
                                                </div>

                                                {/* Actions */}
                                                <div className="flex items-center gap-2 opacity-0 group-hover:opacity-100 transition-opacity">
                                                    {sequence.status === 'active' ? (
                                                        <Button size="icon" variant="outline" onClick={() => handleStatusChange(sequence.id, 'paused')} className="h-9 w-9">
                                                            <Pause className="h-4 w-4" />
                                                        </Button>
                                                    ) : (
                                                        <Button size="icon" variant="outline" onClick={() => handleStatusChange(sequence.id, 'active')} className="h-9 w-9 hover:bg-emerald-50 hover:border-emerald-500 hover:text-emerald-600">
                                                            <Play className="h-4 w-4" />
                                                        </Button>
                                                    )}
                                                    <Button size="icon" variant="outline" onClick={() => setEditingSequence(sequence)} className="h-9 w-9 hover:bg-violet-50 hover:border-violet-500 hover:text-violet-600">
                                                        <Pencil className="h-4 w-4" />
                                                    </Button>
                                                    <Button size="icon" variant="outline" onClick={() => handleDelete(sequence.id)} className="h-9 w-9 hover:bg-red-50 hover:border-red-500 hover:text-red-600">
                                                        <Trash2 className="h-4 w-4" />
                                                    </Button>
                                                </div>
                                            </div>
                                        </div>
                                    </div>
                                </CardContent>
                            </Card>
                        );
                    })}
                </div>
            )}

            {/* Create Dialog */}
            <Dialog open={showCreateDialog} onOpenChange={setShowCreateDialog}>
                <DialogContent className="sm:max-w-md">
                    <DialogHeader>
                        <DialogTitle className="flex items-center gap-2">
                            <div className="p-2 rounded-lg bg-linear-to-br from-violet-500 to-indigo-600 text-white">
                                <Sparkles className="h-5 w-5" />
                            </div>
                            Nouvelle séquence
                        </DialogTitle>
                        <DialogDescription>
                            Créez une séquence de prospection automatisée
                        </DialogDescription>
                    </DialogHeader>
                    <div className="space-y-4 py-4">
                        <div className="space-y-2">
                            <Label>Nom de la séquence</Label>
                            <Input
                                value={newSequence.name}
                                onChange={(e) => setNewSequence({ ...newSequence, name: e.target.value })}
                                placeholder="Ex: Séquence B2B Tech"
                                className="h-11"
                            />
                        </div>
                        <div className="space-y-2">
                            <Label>Description (optionnel)</Label>
                            <Textarea
                                value={newSequence.description}
                                onChange={(e) => setNewSequence({ ...newSequence, description: e.target.value })}
                                placeholder="Décrivez l'objectif de cette séquence..."
                                rows={3}
                            />
                        </div>
                    </div>
                    <DialogFooter>
                        <Button variant="outline" onClick={() => setShowCreateDialog(false)}>
                            Annuler
                        </Button>
                        <Button onClick={handleCreate} disabled={creating} className="bg-linear-to-r from-violet-600 to-indigo-600">
                            {creating && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                            Créer la séquence
                        </Button>
                    </DialogFooter>
                </DialogContent>
            </Dialog>

            {/* Sequence Editor */}
            {editingSequence && (
                <SequenceEditorDialog
                    sequence={editingSequence}
                    onClose={() => setEditingSequence(null)}
                    onSave={(updated) => {
                        setSequences(prev => prev.map(s => s.id === updated.id ? updated : s));
                        setEditingSequence(null);
                    }}
                />
            )}
        </div>
    );
}

// Enhanced Sequence Editor
function SequenceEditorDialog({
    sequence,
    onClose,
    onSave
}: {
    sequence: Sequence;
    onClose: () => void;
    onSave: (updated: Sequence) => void;
}) {
    const [steps, setSteps] = useState<SequenceStep[]>(sequence.steps);
    const [name, setName] = useState(sequence.name);
    const [description, setDescription] = useState(sequence.description);
    const [saving, setSaving] = useState(false);

    async function handleSave() {
        setSaving(true);
        try {
            const result = await sequencesApi.update(sequence.id, { name, description, steps });
            onSave(result.data);
            toast.success('Séquence mise à jour!');
        } catch {
            toast.error('Erreur lors de la sauvegarde');
        } finally {
            setSaving(false);
        }
    }

    function addStep(type: StepType) {
        const config = getStepConfig(type);
        const newStep: SequenceStep = {
            id: `step_${Date.now()}`,
            order: steps.length,
            type,
            name: config.label,
            config: {},
            waitDays: type === 'wait' ? 3 : 0
        };
        setSteps([...steps, newStep]);
    }

    function removeStep(index: number) {
        setSteps(steps.filter((_, i) => i !== index));
    }

    function updateStep(index: number, updates: Partial<SequenceStep>) {
        setSteps(steps.map((step, i) => i === index ? { ...step, ...updates } : step));
    }

    function moveStep(index: number, direction: 'up' | 'down') {
        if (direction === 'up' && index > 0) {
            const newSteps = [...steps];
            [newSteps[index - 1], newSteps[index]] = [newSteps[index], newSteps[index - 1]];
            setSteps(newSteps);
        } else if (direction === 'down' && index < steps.length - 1) {
            const newSteps = [...steps];
            [newSteps[index], newSteps[index + 1]] = [newSteps[index + 1], newSteps[index]];
            setSteps(newSteps);
        }
    }

    return (
        <Dialog open onOpenChange={onClose}>
            <DialogContent className="max-w-4xl max-h-[90vh] overflow-hidden flex flex-col">
                <DialogHeader>
                    <DialogTitle className="flex items-center gap-3">
                        <div className="p-2 rounded-lg bg-linear-to-br from-violet-500 to-indigo-600 text-white">
                            <Zap className="h-5 w-5" />
                        </div>
                        Éditeur de séquence
                    </DialogTitle>
                    <DialogDescription>
                        Construisez votre workflow de prospection étape par étape
                    </DialogDescription>
                </DialogHeader>

                <div className="flex-1 overflow-y-auto space-y-6 py-4 pr-2">
                    {/* Sequence Info */}
                    <div className="grid gap-4 md:grid-cols-2">
                        <div className="space-y-2">
                            <Label className="text-sm font-medium">Nom de la séquence</Label>
                            <Input value={name} onChange={(e) => setName(e.target.value)} className="h-11" />
                        </div>
                        <div className="space-y-2">
                            <Label className="text-sm font-medium">Description</Label>
                            <Input value={description} onChange={(e) => setDescription(e.target.value)} className="h-11" placeholder="Décrivez cette séquence..." />
                        </div>
                    </div>

                    <Separator />

                    {/* Steps Section */}
                    <div>
                        <Label className="text-sm font-medium flex items-center gap-2 mb-4">
                            <span className="px-2 py-0.5 bg-violet-100 text-violet-700 dark:bg-violet-900 dark:text-violet-300 rounded text-xs font-bold">
                                {steps.length}
                            </span>
                            Étapes de la séquence
                        </Label>

                        {/* Timeline */}
                        <div className="relative space-y-4">
                            {/* Connecting line */}
                            {steps.length > 1 && (
                                <div className="absolute left-6 top-12 bottom-12 w-0.5 bg-linear-to-b from-violet-500 via-indigo-500 to-blue-500 opacity-20" />
                            )}

                            {steps.map((step, index) => {
                                const config = getStepConfig(step.type);
                                return (
                                    <div key={step.id} className="relative flex gap-4 group">
                                        {/* Step number circle */}
                                        <div className="relative z-10 shrink-0">
                                            <div className={`w-12 h-12 rounded-xl ${config.bgColor} text-white flex items-center justify-center shadow-lg shadow-${config.bgColor}/25 transition-transform group-hover:scale-110`}>
                                                {config.icon}
                                            </div>
                                            <div className="absolute -bottom-1 -right-1 w-5 h-5 bg-white dark:bg-slate-900 rounded-full flex items-center justify-center text-xs font-bold ring-2 ring-white dark:ring-slate-900">
                                                {index + 1}
                                            </div>
                                        </div>

                                        {/* Step content */}
                                        <Card className="flex-1 border-2 border-transparent group-hover:border-violet-500/20 transition-colors">
                                            <CardContent className="p-4">
                                                <div className="flex items-center gap-4">
                                                    {/* Grip handle */}
                                                    <div className="opacity-0 group-hover:opacity-100 transition-opacity cursor-grab">
                                                        <GripVertical className="h-5 w-5 text-muted-foreground/50" />
                                                    </div>

                                                    {/* Step config fields */}
                                                    <div className="flex-1 grid gap-4 md:grid-cols-3">
                                                        <div className="space-y-1.5">
                                                            <Label className="text-xs text-muted-foreground">Type d'action</Label>
                                                            <Select value={step.type} onValueChange={(v) => updateStep(index, { type: v as StepType, name: getStepConfig(v as StepType).label })}>
                                                                <SelectTrigger className="h-10">
                                                                    <SelectValue />
                                                                </SelectTrigger>
                                                                <SelectContent>
                                                                    {STEP_TYPES.map(t => (
                                                                        <SelectItem key={t.type} value={t.type}>
                                                                            <div className="flex items-center gap-2">
                                                                                <span className={t.color}>{t.icon}</span>
                                                                                {t.label}
                                                                            </div>
                                                                        </SelectItem>
                                                                    ))}
                                                                </SelectContent>
                                                            </Select>
                                                        </div>
                                                        <div className="space-y-1.5">
                                                            <Label className="text-xs text-muted-foreground">Nom de l'étape</Label>
                                                            <Input
                                                                value={step.name}
                                                                onChange={(e) => updateStep(index, { name: e.target.value })}
                                                                className="h-10"
                                                            />
                                                        </div>
                                                        {step.type === 'wait' && (
                                                            <div className="space-y-1.5">
                                                                <Label className="text-xs text-muted-foreground">Jours d'attente</Label>
                                                                <Input
                                                                    type="number"
                                                                    min={1}
                                                                    value={step.waitDays}
                                                                    onChange={(e) => updateStep(index, { waitDays: parseInt(e.target.value) || 1 })}
                                                                    className="h-10"
                                                                />
                                                            </div>
                                                        )}
                                                    </div>

                                                    {/* Step actions */}
                                                    <div className="flex items-center gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                                                        <Button
                                                            size="icon"
                                                            variant="ghost"
                                                            onClick={() => moveStep(index, 'up')}
                                                            disabled={index === 0}
                                                            className="h-8 w-8"
                                                        >
                                                            <ChevronUp className="h-4 w-4" />
                                                        </Button>
                                                        <Button
                                                            size="icon"
                                                            variant="ghost"
                                                            onClick={() => moveStep(index, 'down')}
                                                            disabled={index === steps.length - 1}
                                                            className="h-8 w-8"
                                                        >
                                                            <ChevronDown className="h-4 w-4" />
                                                        </Button>
                                                        <Button
                                                            size="icon"
                                                            variant="ghost"
                                                            onClick={() => removeStep(index)}
                                                            className="h-8 w-8 hover:bg-red-50 hover:text-red-600"
                                                        >
                                                            <Trash2 className="h-4 w-4" />
                                                        </Button>
                                                    </div>
                                                </div>
                                            </CardContent>
                                        </Card>
                                    </div>
                                );
                            })}
                        </div>

                        {/* Add Step Section */}
                        <div className="mt-6 p-4 rounded-xl bg-linear-to-r from-slate-50 to-slate-100/50 dark:from-slate-900 dark:to-slate-800/50 border-2 border-dashed border-slate-200 dark:border-slate-700">
                            <Label className="text-sm font-medium mb-3 block">Ajouter une étape</Label>
                            <div className="grid grid-cols-3 md:grid-cols-6 gap-2">
                                {STEP_TYPES.map(stepType => (
                                    <Button
                                        key={stepType.type}
                                        variant="outline"
                                        onClick={() => addStep(stepType.type)}
                                        className="h-auto py-3 flex-col gap-2 hover:border-violet-500 hover:bg-violet-50 dark:hover:bg-violet-950/50 transition-colors"
                                    >
                                        <div className={`p-2 rounded-lg ${stepType.bgColor} text-white`}>
                                            {stepType.icon}
                                        </div>
                                        <span className="text-xs font-medium">{stepType.label}</span>
                                    </Button>
                                ))}
                            </div>
                        </div>
                    </div>
                </div>

                <Separator className="my-2" />

                <DialogFooter className="pt-2">
                    <Button variant="outline" onClick={onClose}>
                        Annuler
                    </Button>
                    <Button onClick={handleSave} disabled={saving} className="bg-linear-to-r from-violet-600 to-indigo-600 min-w-[140px]">
                        {saving && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                        Enregistrer
                    </Button>
                </DialogFooter>
            </DialogContent>
        </Dialog>
    );
}
