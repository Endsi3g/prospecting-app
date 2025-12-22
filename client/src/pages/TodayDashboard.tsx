import { useEffect, useState, useCallback } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Avatar, AvatarFallback } from '@/components/ui/avatar';
import { Progress } from '@/components/ui/progress';
import {
    Play,
    Phone,
    Mail,
    MessageSquare,
    CheckCircle2,
    ArrowRight,
    Star,
    Building2,
    Zap,
    Target,
    Calendar,
    TrendingUp,
    Users,
    Sparkles,
    ChevronRight,
    AlertCircle
} from 'lucide-react';
import { prospectsApi, messagesApi, type Prospect, type Message } from '@/api/client';
import { toast } from 'sonner';

// Types for tasks
interface Task {
    id: string;
    type: 'call' | 'email' | 'followup' | 'linkedin' | 'meeting';
    prospect: Prospect;
    title: string;
    priority: 'high' | 'medium' | 'low';
    dueTime?: string;
}

// Get greeting based on time
function getGreeting(): string {
    const hour = new Date().getHours();
    if (hour < 12) return 'Bonjour';
    if (hour < 18) return 'Bon après-midi';
    return 'Bonsoir';
}

export function TodayDashboard() {
    const navigate = useNavigate();
    const [loading, setLoading] = useState(true);
    const [prospects, setProspects] = useState<Prospect[]>([]);
    const [pendingMessages, setPendingMessages] = useState<Message[]>([]);
    const [todayTasks, setTodayTasks] = useState<Task[]>([]);
    const [sessionActive, setSessionActive] = useState(false);
    const [currentTaskIndex, setCurrentTaskIndex] = useState(0);

    // Load data
    useEffect(() => {
        async function loadData() {
            try {
                const [prospectsRes, messagesRes] = await Promise.all([
                    prospectsApi.getAll(),
                    messagesApi.getAll()
                ]);

                const allProspects = prospectsRes.data || [];
                const allMessages = messagesRes.data || [];

                setProspects(allProspects);
                setPendingMessages(allMessages.filter(m => m.status === 'pending'));

                // Generate today's tasks based on prospects and pending messages
                const tasks: Task[] = [];

                // High priority: New prospects to contact
                allProspects
                    .filter(p => p.triageStatus === 'to_contact' || p.triageStatus === 'new')
                    .slice(0, 5)
                    .forEach(p => {
                        tasks.push({
                            id: `call_${p.id}`,
                            type: 'call',
                            prospect: p,
                            title: `Appeler ${p.entreprise || p.nom || 'Prospect'}`,
                            priority: p.interestScore && p.interestScore > 70 ? 'high' : 'medium'
                        });
                    });

                // Pending emails to send
                allMessages
                    .filter(m => m.status === 'pending')
                    .slice(0, 3)
                    .forEach(m => {
                        const prospect = allProspects.find(p => p.id === m.prospectId);
                        if (prospect) {
                            tasks.push({
                                id: `email_${m.id}`,
                                type: 'email',
                                prospect,
                                title: `Envoyer email à ${prospect.entreprise || prospect.nom}`,
                                priority: 'medium'
                            });
                        }
                    });

                // Follow-ups (prospects contacted but not replied)
                allProspects
                    .filter(p => p.triageStatus === 'interested')
                    .slice(0, 3)
                    .forEach(p => {
                        tasks.push({
                            id: `followup_${p.id}`,
                            type: 'followup',
                            prospect: p,
                            title: `Relancer ${p.entreprise || p.nom}`,
                            priority: 'high'
                        });
                    });

                // Sort by priority
                tasks.sort((a, b) => {
                    const order = { high: 0, medium: 1, low: 2 };
                    return order[a.priority] - order[b.priority];
                });

                setTodayTasks(tasks);

            } catch (error) {
                console.error('Error loading data:', error);
            } finally {
                setLoading(false);
            }
        }
        loadData();
    }, []);

    // Start focus session
    const startSession = useCallback(() => {
        if (todayTasks.length === 0) {
            toast.info('Aucune tâche pour aujourd\'hui!');
            return;
        }
        setSessionActive(true);
        setCurrentTaskIndex(0);
        toast.success('Session de prospection démarrée!');
    }, [todayTasks]);

    // Complete current task and move to next
    const completeTask = useCallback(() => {
        if (currentTaskIndex < todayTasks.length - 1) {
            setCurrentTaskIndex(prev => prev + 1);
            toast.success('Tâche complétée! Suivante...');
        } else {
            setSessionActive(false);
            toast.success('🎉 Session terminée! Excellent travail!');
        }
    }, [currentTaskIndex, todayTasks.length]);

    // Skip current task
    const skipTask = useCallback(() => {
        if (currentTaskIndex < todayTasks.length - 1) {
            setCurrentTaskIndex(prev => prev + 1);
        } else {
            setSessionActive(false);
        }
    }, [currentTaskIndex, todayTasks.length]);

    // Get icon for task type
    const getTaskIcon = (type: Task['type']) => {
        switch (type) {
            case 'call': return <Phone className="h-4 w-4" />;
            case 'email': return <Mail className="h-4 w-4" />;
            case 'followup': return <MessageSquare className="h-4 w-4" />;
            case 'linkedin': return <Users className="h-4 w-4" />;
            case 'meeting': return <Calendar className="h-4 w-4" />;
        }
    };

    // Priority prospects (high score)
    const priorityProspects = prospects
        .filter(p => p.interestScore && p.interestScore > 60)
        .sort((a, b) => (b.interestScore || 0) - (a.interestScore || 0))
        .slice(0, 5);

    if (loading) {
        return (
            <div className="flex items-center justify-center h-96">
                <div className="animate-pulse text-muted-foreground">Chargement...</div>
            </div>
        );
    }

    // Focus Session Mode
    if (sessionActive && todayTasks[currentTaskIndex]) {
        const currentTask = todayTasks[currentTaskIndex];
        return (
            <div className="min-h-[80vh] flex flex-col items-center justify-center space-y-8 p-8">
                {/* Progress */}
                <div className="w-full max-w-md">
                    <div className="flex justify-between text-sm text-muted-foreground mb-2">
                        <span>Progression</span>
                        <span>{currentTaskIndex + 1} / {todayTasks.length}</span>
                    </div>
                    <Progress value={(currentTaskIndex / todayTasks.length) * 100} className="h-2" />
                </div>

                {/* Current Task Card */}
                <Card className="w-full max-w-lg border-2 border-primary/20 shadow-xl">
                    <CardHeader className="text-center pb-2">
                        <div className="mx-auto mb-4 p-4 rounded-full bg-primary/10">
                            {getTaskIcon(currentTask.type)}
                        </div>
                        <Badge variant={currentTask.priority === 'high' ? 'destructive' : 'secondary'} className="mb-2">
                            {currentTask.priority === 'high' ? 'Priorité haute' : 'Normal'}
                        </Badge>
                        <CardTitle className="text-2xl">{currentTask.title}</CardTitle>
                    </CardHeader>
                    <CardContent className="space-y-6">
                        {/* Prospect Info */}
                        <div className="flex items-center gap-4 p-4 rounded-lg bg-muted/50">
                            <Avatar className="h-12 w-12">
                                <AvatarFallback>
                                    {(currentTask.prospect.entreprise || currentTask.prospect.nom || 'P')[0]}
                                </AvatarFallback>
                            </Avatar>
                            <div>
                                <div className="font-medium">{currentTask.prospect.entreprise || currentTask.prospect.nom}</div>
                                <div className="text-sm text-muted-foreground">{currentTask.prospect.poste}</div>
                                {currentTask.prospect.telephone && (
                                    <div className="text-sm text-primary">{currentTask.prospect.telephone}</div>
                                )}
                            </div>
                            {currentTask.prospect.interestScore && (
                                <Badge variant="outline" className="ml-auto">
                                    <Star className="h-3 w-3 mr-1 fill-yellow-400 text-yellow-400" />
                                    {currentTask.prospect.interestScore}%
                                </Badge>
                            )}
                        </div>

                        {/* Actions */}
                        <div className="flex gap-3">
                            <Button
                                variant="outline"
                                className="flex-1"
                                onClick={skipTask}
                            >
                                Passer
                            </Button>
                            <Button
                                className="flex-1 gap-2"
                                onClick={completeTask}
                            >
                                <CheckCircle2 className="h-4 w-4" />
                                Fait
                            </Button>
                        </div>

                        {/* Quick Actions */}
                        <div className="flex justify-center gap-2">
                            <Button
                                size="sm"
                                variant="ghost"
                                onClick={() => navigate(`/prospects/${currentTask.prospect.id}`)}
                            >
                                Voir fiche
                            </Button>
                            {currentTask.type === 'email' && (
                                <Button size="sm" variant="ghost" onClick={() => navigate('/messages')}>
                                    Ouvrir messages
                                </Button>
                            )}
                        </div>
                    </CardContent>
                </Card>

                {/* Exit Session */}
                <Button variant="ghost" onClick={() => setSessionActive(false)}>
                    Quitter la session
                </Button>
            </div>
        );
    }

    // Main Dashboard View
    return (
        <div className="space-y-8">
            {/* Header */}
            <div className="flex items-center justify-between">
                <div>
                    <h1 className="text-3xl font-bold tracking-tight">
                        {getGreeting()} 👋
                    </h1>
                    <p className="text-muted-foreground mt-1">
                        Que dois-tu faire aujourd'hui?
                    </p>
                </div>

                {/* Start Session Button */}
                <Button
                    size="lg"
                    className="gap-2 bg-linear-to-r from-violet-600 to-indigo-600 hover:from-violet-700 hover:to-indigo-700 shadow-lg"
                    onClick={startSession}
                    disabled={todayTasks.length === 0}
                >
                    <Play className="h-5 w-5" />
                    Lancer ma session
                    {todayTasks.length > 0 && (
                        <Badge variant="secondary" className="ml-1 bg-white/20">
                            {todayTasks.length}
                        </Badge>
                    )}
                </Button>
            </div>

            {/* Quick Stats */}
            <div className="grid grid-cols-4 gap-4">
                <Card className="bg-linear-to-br from-blue-500/10 to-blue-600/5 border-blue-200/50">
                    <CardContent className="pt-6">
                        <div className="flex items-center gap-3">
                            <div className="p-2 rounded-lg bg-blue-500/10">
                                <Target className="h-5 w-5 text-blue-600" />
                            </div>
                            <div>
                                <div className="text-2xl font-bold">{todayTasks.length}</div>
                                <div className="text-sm text-muted-foreground">Tâches du jour</div>
                            </div>
                        </div>
                    </CardContent>
                </Card>

                <Card className="bg-linear-to-br from-green-500/10 to-green-600/5 border-green-200/50">
                    <CardContent className="pt-6">
                        <div className="flex items-center gap-3">
                            <div className="p-2 rounded-lg bg-green-500/10">
                                <Users className="h-5 w-5 text-green-600" />
                            </div>
                            <div>
                                <div className="text-2xl font-bold">{priorityProspects.length}</div>
                                <div className="text-sm text-muted-foreground">Prospects chauds</div>
                            </div>
                        </div>
                    </CardContent>
                </Card>

                <Card className="bg-linear-to-br from-amber-500/10 to-amber-600/5 border-amber-200/50">
                    <CardContent className="pt-6">
                        <div className="flex items-center gap-3">
                            <div className="p-2 rounded-lg bg-amber-500/10">
                                <Mail className="h-5 w-5 text-amber-600" />
                            </div>
                            <div>
                                <div className="text-2xl font-bold">{pendingMessages.length}</div>
                                <div className="text-sm text-muted-foreground">Emails à envoyer</div>
                            </div>
                        </div>
                    </CardContent>
                </Card>

                <Card className="bg-linear-to-br from-purple-500/10 to-purple-600/5 border-purple-200/50">
                    <CardContent className="pt-6">
                        <div className="flex items-center gap-3">
                            <div className="p-2 rounded-lg bg-purple-500/10">
                                <TrendingUp className="h-5 w-5 text-purple-600" />
                            </div>
                            <div>
                                <div className="text-2xl font-bold">{prospects.length}</div>
                                <div className="text-sm text-muted-foreground">Total prospects</div>
                            </div>
                        </div>
                    </CardContent>
                </Card>
            </div>

            <div className="grid lg:grid-cols-3 gap-6">
                {/* Today's Tasks */}
                <Card className="lg:col-span-2">
                    <CardHeader className="flex flex-row items-center justify-between">
                        <div>
                            <CardTitle className="flex items-center gap-2">
                                <Zap className="h-5 w-5 text-yellow-500" />
                                Tâches du jour
                            </CardTitle>
                        </div>
                        <Badge variant="outline">{todayTasks.length} tâches</Badge>
                    </CardHeader>
                    <CardContent>
                        {todayTasks.length === 0 ? (
                            <div className="text-center py-12">
                                <CheckCircle2 className="h-12 w-12 text-green-500 mx-auto mb-4" />
                                <h3 className="font-semibold text-lg">Tout est fait!</h3>
                                <p className="text-muted-foreground mt-1">
                                    Aucune tâche en attente pour le moment
                                </p>
                                <Link to="/search">
                                    <Button className="mt-4 gap-2">
                                        <Sparkles className="h-4 w-4" />
                                        Trouver de nouveaux prospects
                                    </Button>
                                </Link>
                            </div>
                        ) : (
                            <div className="space-y-3">
                                {todayTasks.slice(0, 6).map((task) => (
                                    <div
                                        key={task.id}
                                        className="flex items-center gap-4 p-3 rounded-lg hover:bg-muted/50 transition-colors cursor-pointer group"
                                        onClick={() => navigate(`/prospects/${task.prospect.id}`)}
                                    >
                                        <div className={`p-2 rounded-lg ${task.type === 'call' ? 'bg-blue-100 text-blue-600' :
                                            task.type === 'email' ? 'bg-green-100 text-green-600' :
                                                'bg-amber-100 text-amber-600'
                                            }`}>
                                            {getTaskIcon(task.type)}
                                        </div>
                                        <div className="flex-1 min-w-0">
                                            <div className="font-medium truncate">{task.title}</div>
                                            <div className="text-sm text-muted-foreground">
                                                {task.prospect.poste}
                                            </div>
                                        </div>
                                        {task.priority === 'high' && (
                                            <Badge variant="destructive" className="shrink-0">
                                                <AlertCircle className="h-3 w-3 mr-1" />
                                                Urgent
                                            </Badge>
                                        )}
                                        <ChevronRight className="h-4 w-4 text-muted-foreground opacity-0 group-hover:opacity-100 transition-opacity" />
                                    </div>
                                ))}
                                {todayTasks.length > 6 && (
                                    <Button variant="ghost" className="w-full" onClick={startSession}>
                                        Voir les {todayTasks.length - 6} autres tâches
                                        <ArrowRight className="h-4 w-4 ml-2" />
                                    </Button>
                                )}
                            </div>
                        )}
                    </CardContent>
                </Card>

                {/* Priority Prospects */}
                <Card>
                    <CardHeader>
                        <CardTitle className="flex items-center gap-2">
                            <Star className="h-5 w-5 text-yellow-500" />
                            Prospects prioritaires
                        </CardTitle>
                    </CardHeader>
                    <CardContent>
                        {priorityProspects.length === 0 ? (
                            <div className="text-center py-8 text-muted-foreground">
                                <Building2 className="h-10 w-10 mx-auto mb-3 opacity-50" />
                                <p>Aucun prospect prioritaire</p>
                            </div>
                        ) : (
                            <div className="space-y-3">
                                {priorityProspects.map(prospect => (
                                    <Link
                                        key={prospect.id}
                                        to={`/prospects/${prospect.id}`}
                                        className="flex items-center gap-3 p-2 rounded-lg hover:bg-muted/50 transition-colors"
                                    >
                                        <Avatar className="h-9 w-9">
                                            <AvatarFallback className="text-xs">
                                                {(prospect.entreprise || prospect.nom || 'P')[0]}
                                            </AvatarFallback>
                                        </Avatar>
                                        <div className="flex-1 min-w-0">
                                            <div className="font-medium text-sm truncate">
                                                {prospect.entreprise || prospect.nom}
                                            </div>
                                            <div className="text-xs text-muted-foreground truncate">
                                                {prospect.poste}
                                            </div>
                                        </div>
                                        <Badge variant="outline" className="shrink-0">
                                            <Star className="h-3 w-3 mr-1 fill-yellow-400 text-yellow-400" />
                                            {prospect.interestScore}%
                                        </Badge>
                                    </Link>
                                ))}
                            </div>
                        )}
                    </CardContent>
                </Card>
            </div>

            {/* Quick Actions */}
            <Card className="bg-linear-to-r from-slate-50 to-slate-100 dark:from-slate-900 dark:to-slate-800 border-dashed">
                <CardContent className="py-6">
                    <div className="flex items-center justify-between">
                        <div>
                            <h3 className="font-semibold">Actions rapides</h3>
                            <p className="text-sm text-muted-foreground">Raccourcis: K=Appel, E=Email, S=Recherche</p>
                        </div>
                        <div className="flex gap-2">
                            <Link to="/search">
                                <Button variant="outline" className="gap-2">
                                    <Sparkles className="h-4 w-4" />
                                    Rechercher
                                </Button>
                            </Link>
                            <Link to="/import">
                                <Button variant="outline" className="gap-2">
                                    <Users className="h-4 w-4" />
                                    Importer
                                </Button>
                            </Link>
                            <Link to="/generate">
                                <Button variant="outline" className="gap-2">
                                    <Mail className="h-4 w-4" />
                                    Générer emails
                                </Button>
                            </Link>
                        </div>
                    </div>
                </CardContent>
            </Card>
        </div>
    );
}
