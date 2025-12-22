import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Avatar, AvatarFallback } from '@/components/ui/avatar';
import {
    Loader2,
    Building2,
    Mail,
    Phone,
    TrendingUp,
    Trophy,
    XCircle,
    Target,
    ChevronRight,
    GripVertical
} from 'lucide-react';
import { toast } from 'sonner';
import { type Prospect } from '@/api/client';

interface PipelineStage {
    id: string;
    name: string;
    color: string;
    order: number;
    prospects: Prospect[];
}

// API functions
const pipelineApi = {
    getAll: async () => {
        const res = await fetch('/api/pipeline');
        return res.json();
    },
    moveProspect: async (prospectId: string, stage: string) => {
        const res = await fetch(`/api/pipeline/prospects/${prospectId}/stage`, {
            method: 'PATCH',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ stage })
        });
        return res.json();
    },
    getStats: async () => {
        const res = await fetch('/api/pipeline/stats');
        return res.json();
    }
};

export function PipelinePage() {
    const navigate = useNavigate();
    const [stages, setStages] = useState<PipelineStage[]>([]);
    const [loading, setLoading] = useState(true);
    const [draggingProspect, setDraggingProspect] = useState<string | null>(null);
    const [stats, setStats] = useState<{ total: number; won: number; lost: number; winRate: number } | null>(null);

    useEffect(() => {
        loadPipeline();
        loadStats();
    }, []);

    async function loadPipeline() {
        try {
            const result = await pipelineApi.getAll();
            if (result.success) {
                setStages(result.data.stages);
            }
        } catch (error) {
            console.error('Error loading pipeline:', error);
            toast.error('Erreur lors du chargement du pipeline');
        } finally {
            setLoading(false);
        }
    }

    async function loadStats() {
        try {
            const result = await pipelineApi.getStats();
            if (result.success) {
                setStats(result.data);
            }
        } catch (error) {
            console.error('Error loading stats:', error);
        }
    }

    async function handleDrop(prospectId: string, newStageId: string) {
        // Optimistic update
        setStages(prevStages => {
            const newStages = prevStages.map(stage => ({
                ...stage,
                prospects: stage.prospects.filter(p => p.id !== prospectId)
            }));

            const prospect = prevStages.flatMap(s => s.prospects).find(p => p.id === prospectId);
            if (prospect) {
                const targetIndex = newStages.findIndex(s => s.id === newStageId);
                if (targetIndex !== -1) {
                    newStages[targetIndex].prospects.push({ ...prospect, pipelineStage: newStageId });
                }
            }
            return newStages;
        });

        try {
            await pipelineApi.moveProspect(prospectId, newStageId);
            toast.success('Prospect déplacé');
            loadStats();
        } catch {
            toast.error('Erreur lors du déplacement');
            loadPipeline();
        }
        setDraggingProspect(null);
    }

    function getInitials(name: string) {
        return name
            .split(' ')
            .map(n => n[0])
            .slice(0, 2)
            .join('')
            .toUpperCase();
    }

    if (loading) {
        return (
            <div className="flex items-center justify-center h-96">
                <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
            </div>
        );
    }

    return (
        <div className="h-[calc(100vh-120px)] flex flex-col">
            {/* Header */}
            <div className="mb-6 flex items-center justify-between">
                <div>
                    <h1 className="text-3xl font-bold tracking-tight bg-linear-to-r from-indigo-600 via-violet-600 to-purple-600 bg-clip-text text-transparent">
                        Pipeline Commercial
                    </h1>
                    <p className="text-muted-foreground mt-1">
                        Gérez vos opportunités par glisser-déposer
                    </p>
                </div>

                {/* Stats */}
                {stats && (
                    <div className="flex items-center gap-6">
                        <div className="flex items-center gap-2 px-4 py-2 rounded-xl bg-slate-100 dark:bg-slate-800">
                            <Target className="h-5 w-5 text-indigo-600" />
                            <div>
                                <div className="text-xl font-bold">{stats.total}</div>
                                <div className="text-xs text-muted-foreground">Total</div>
                            </div>
                        </div>
                        <div className="flex items-center gap-2 px-4 py-2 rounded-xl bg-emerald-50 dark:bg-emerald-950/30">
                            <Trophy className="h-5 w-5 text-emerald-600" />
                            <div>
                                <div className="text-xl font-bold text-emerald-600">{stats.won}</div>
                                <div className="text-xs text-muted-foreground">Gagnés</div>
                            </div>
                        </div>
                        <div className="flex items-center gap-2 px-4 py-2 rounded-xl bg-red-50 dark:bg-red-950/30">
                            <XCircle className="h-5 w-5 text-red-600" />
                            <div>
                                <div className="text-xl font-bold text-red-600">{stats.lost}</div>
                                <div className="text-xs text-muted-foreground">Perdus</div>
                            </div>
                        </div>
                        <div className="flex items-center gap-2 px-4 py-2 rounded-xl bg-amber-50 dark:bg-amber-950/30">
                            <TrendingUp className="h-5 w-5 text-amber-600" />
                            <div>
                                <div className="text-xl font-bold text-amber-600">{stats.winRate}%</div>
                                <div className="text-xs text-muted-foreground">Win Rate</div>
                            </div>
                        </div>
                    </div>
                )}
            </div>

            {/* Kanban Board */}
            <div className="flex-1 overflow-x-auto">
                <div className="flex gap-4 h-full min-w-max pb-4">
                    {stages.map((stage) => (
                        <div
                            key={stage.id}
                            className="w-80 shrink-0 flex flex-col"
                            onDragOver={(e) => {
                                e.preventDefault();
                                e.currentTarget.classList.add('ring-2', 'ring-violet-500', 'ring-offset-2');
                            }}
                            onDragLeave={(e) => {
                                e.currentTarget.classList.remove('ring-2', 'ring-violet-500', 'ring-offset-2');
                            }}
                            onDrop={(e) => {
                                e.preventDefault();
                                e.currentTarget.classList.remove('ring-2', 'ring-violet-500', 'ring-offset-2');
                                if (draggingProspect) {
                                    handleDrop(draggingProspect, stage.id);
                                }
                            }}
                        >
                            {/* Stage Header */}
                            <div
                                className="flex items-center justify-between p-3 rounded-t-xl"
                                style={{ backgroundColor: `${stage.color}15` }}
                            >
                                <div className="flex items-center gap-2">
                                    <div
                                        className="w-3 h-3 rounded-full"
                                        style={{ backgroundColor: stage.color }}
                                    />
                                    <span className="font-semibold text-sm">{stage.name}</span>
                                </div>
                                <Badge variant="secondary" className="text-xs">
                                    {stage.prospects.length}
                                </Badge>
                            </div>

                            {/* Stage Body */}
                            <div className="flex-1 bg-slate-50/50 dark:bg-slate-900/30 rounded-b-xl p-2 space-y-2 overflow-y-auto min-h-[400px]">
                                {stage.prospects.length === 0 ? (
                                    <div className="h-32 flex items-center justify-center text-sm text-muted-foreground border-2 border-dashed rounded-lg">
                                        Déposez un prospect ici
                                    </div>
                                ) : (
                                    stage.prospects.map(prospect => (
                                        <Card
                                            key={prospect.id}
                                            draggable
                                            onDragStart={() => setDraggingProspect(prospect.id)}
                                            onDragEnd={() => setDraggingProspect(null)}
                                            className={`cursor-grab active:cursor-grabbing hover:shadow-md transition-all ${draggingProspect === prospect.id ? 'opacity-50 scale-95' : ''
                                                }`}
                                        >
                                            <CardContent className="p-3">
                                                <div className="flex items-start gap-3">
                                                    <GripVertical className="h-4 w-4 text-muted-foreground/50 mt-1 shrink-0" />

                                                    <Avatar className="h-9 w-9 shrink-0">
                                                        <AvatarFallback
                                                            className="text-xs font-semibold"
                                                            style={{ backgroundColor: `${stage.color}20`, color: stage.color }}
                                                        >
                                                            {getInitials(prospect.fullName || prospect.company || 'P')}
                                                        </AvatarFallback>
                                                    </Avatar>

                                                    <div className="flex-1 min-w-0">
                                                        <div
                                                            className="font-medium text-sm truncate hover:text-violet-600 cursor-pointer"
                                                            onClick={() => navigate(`/prospects/${prospect.id}`)}
                                                        >
                                                            {prospect.fullName || 'Sans nom'}
                                                        </div>
                                                        {prospect.company && (
                                                            <div className="flex items-center gap-1 text-xs text-muted-foreground truncate">
                                                                <Building2 className="h-3 w-3 shrink-0" />
                                                                {prospect.company}
                                                            </div>
                                                        )}
                                                        <div className="flex items-center gap-2 mt-1.5">
                                                            {prospect.email && (
                                                                <Mail className="h-3 w-3 text-muted-foreground/60" />
                                                            )}
                                                            {prospect.phone && (
                                                                <Phone className="h-3 w-3 text-muted-foreground/60" />
                                                            )}
                                                            {prospect.triageStatus && (
                                                                <Badge variant="outline" className="text-[10px] h-4">
                                                                    {prospect.triageStatus}
                                                                </Badge>
                                                            )}
                                                        </div>
                                                    </div>

                                                    <Button
                                                        size="icon"
                                                        variant="ghost"
                                                        className="h-6 w-6 opacity-0 group-hover:opacity-100"
                                                        onClick={() => navigate(`/prospects/${prospect.id}`)}
                                                    >
                                                        <ChevronRight className="h-4 w-4" />
                                                    </Button>
                                                </div>
                                            </CardContent>
                                        </Card>
                                    ))
                                )}
                            </div>
                        </div>
                    ))}
                </div>
            </div>
        </div>
    );
}
