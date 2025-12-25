import { useEffect, useState, useCallback } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Avatar, AvatarFallback } from '@/components/ui/avatar';
import { Progress } from '@/components/ui/progress';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import {
    Dialog,
    DialogContent,
    DialogDescription,
    DialogFooter,
    DialogHeader,
    DialogTitle,
} from '@/components/ui/dialog';
import {
    Select,
    SelectContent,
    SelectItem,
    SelectTrigger,
    SelectValue,
} from '@/components/ui/select';
import { Checkbox } from '@/components/ui/checkbox';
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
    AlertCircle,
    Plus,
    Clock,
    Trash2,
    ToggleLeft,
    Loader2
} from 'lucide-react';
import {
    prospectsApi,
    messagesApi,
    tasksApi,
    sessionsApi,
    type Prospect,
    type Message,
    type Task as ApiTask,
    type Session,
    type TaskType,
    type TaskPriority,
    type DayOfWeek
} from '@/api/client';
import { toast } from 'sonner';


// Types for tasks (internal display)
interface DisplayTask {
    id: string;
    type: 'call' | 'email' | 'followup' | 'linkedin' | 'meeting' | 'custom';
    prospect?: Prospect;
    title: string;
    priority: 'high' | 'medium' | 'low';
    dueTime?: string;
    isCustom?: boolean;
}

// Get greeting based on time
function getGreeting(): string {
    const hour = new Date().getHours();
    if (hour < 12) return 'Bonjour';
    if (hour < 18) return 'Bon après-midi';
    return 'Bonsoir';
}

const DAY_LABELS: Record<DayOfWeek, string> = {
    sunday: 'Dim',
    monday: 'Lun',
    tuesday: 'Mar',
    wednesday: 'Mer',
    thursday: 'Jeu',
    friday: 'Ven',
    saturday: 'Sam'
};

export function TodayDashboard() {
    const navigate = useNavigate();
    const [loading, setLoading] = useState(true);
    const [prospects, setProspects] = useState<Prospect[]>([]);
    const [pendingMessages, setPendingMessages] = useState<Message[]>([]);
    const [todayTasks, setTodayTasks] = useState<DisplayTask[]>([]);
    const [customTasks, setCustomTasks] = useState<ApiTask[]>([]);
    const [sessions, setSessions] = useState<Session[]>([]);
    const [sessionActive, setSessionActive] = useState(false);
    const [currentTaskIndex, setCurrentTaskIndex] = useState(0);

    // Task dialog state
    const [taskDialogOpen, setTaskDialogOpen] = useState(false);
    const [newTask, setNewTask] = useState({
        title: '',
        type: 'custom' as TaskType,
        priority: 'medium' as TaskPriority,
        dueDate: '',
        dueTime: ''
    });
    const [creatingTask, setCreatingTask] = useState(false);

    // Session dialog state
    const [sessionDialogOpen, setSessionDialogOpen] = useState(false);
    const [newSession, setNewSession] = useState({
        name: '',
        time: '09:00',
        duration: 30,
        days: ['monday', 'tuesday', 'wednesday', 'thursday', 'friday'] as DayOfWeek[],
        maxTasks: 10
    });
    const [creatingSession, setCreatingSession] = useState(false);


    // Load data
    useEffect(() => {
        async function loadData() {
            try {
                const [prospectsRes, messagesRes, tasksRes, sessionsRes] = await Promise.all([
                    prospectsApi.getAll(),
                    messagesApi.getAll(),
                    tasksApi.getToday(),
                    sessionsApi.getAll()
                ]);

                const allProspects = prospectsRes.data || [];
                const allMessages = messagesRes.data || [];
                const userTasks = tasksRes.data || [];
                const allSessions = sessionsRes.data || [];

                setProspects(allProspects);
                setPendingMessages(allMessages.filter(m => m.status === 'pending'));
                setCustomTasks(userTasks);
                setSessions(allSessions);

                // Generate today's tasks based on prospects and pending messages
                const tasks: DisplayTask[] = [];

                // Add user-created custom tasks
                userTasks.forEach(t => {
                    tasks.push({
                        id: t.id,
                        type: t.type as DisplayTask['type'],
                        title: t.title,
                        priority: t.priority,
                        dueTime: t.dueTime || undefined,
                        isCustom: true
                    });
                });

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

    // Create a new task
    const handleCreateTask = async () => {
        if (!newTask.title.trim()) {
            toast.error('Titre requis');
            return;
        }

        setCreatingTask(true);
        try {
            const result = await tasksApi.create({
                title: newTask.title,
                type: newTask.type,
                priority: newTask.priority,
                dueDate: newTask.dueDate || undefined,
                dueTime: newTask.dueTime || undefined
            });

            // Add to custom tasks and today's tasks
            setCustomTasks(prev => [...prev, result.data]);
            setTodayTasks(prev => [{
                id: result.data.id,
                type: result.data.type as DisplayTask['type'],
                title: result.data.title,
                priority: result.data.priority,
                isCustom: true
            }, ...prev]);

            setTaskDialogOpen(false);
            setNewTask({ title: '', type: 'custom', priority: 'medium', dueDate: '', dueTime: '' });
            toast.success('Tâche créée!');
        } catch {
            toast.error('Erreur lors de la création');
        } finally {
            setCreatingTask(false);
        }
    };

    // Create a new session
    const handleCreateSession = async () => {
        if (!newSession.name.trim()) {
            toast.error('Nom requis');
            return;
        }

        setCreatingSession(true);
        try {
            const result = await sessionsApi.create({
                name: newSession.name,
                time: newSession.time,
                duration: newSession.duration,
                days: newSession.days,
                maxTasks: newSession.maxTasks
            });

            setSessions(prev => [...prev, result.data]);
            setSessionDialogOpen(false);
            setNewSession({ name: '', time: '09:00', duration: 30, days: ['monday', 'tuesday', 'wednesday', 'thursday', 'friday'], maxTasks: 10 });
            toast.success('Session planifiée!');
        } catch {
            toast.error('Erreur lors de la création');
        } finally {
            setCreatingSession(false);
        }
    };

    // Delete a custom task
    const handleDeleteTask = async (taskId: string) => {
        try {
            await tasksApi.delete(taskId);
            setCustomTasks(prev => prev.filter(t => t.id !== taskId));
            setTodayTasks(prev => prev.filter(t => t.id !== taskId));
            toast.success('Tâche supprimée');
        } catch {
            toast.error('Erreur lors de la suppression');
        }
    };

    // Toggle session enabled/disabled
    const handleToggleSession = async (sessionId: string) => {
        try {
            const result = await sessionsApi.toggle(sessionId);
            setSessions(prev => prev.map(s => s.id === sessionId ? result.data : s));
        } catch {
            toast.error('Erreur lors de la modification');
        }
    };

    // Delete a session
    const handleDeleteSession = async (sessionId: string) => {
        try {
            await sessionsApi.delete(sessionId);
            setSessions(prev => prev.filter(s => s.id !== sessionId));
            toast.success('Session supprimée');
        } catch {
            toast.error('Erreur lors de la suppression');
        }
    };

    // Get icon for task type
    const getTaskIcon = (type: DisplayTask['type']) => {
        switch (type) {

            case 'call': return <Phone className="h-4 w-4" />;
            case 'email': return <Mail className="h-4 w-4" />;
            case 'followup': return <MessageSquare className="h-4 w-4" />;
            case 'linkedin': return <Users className="h-4 w-4" />;
            case 'meeting': return <Calendar className="h-4 w-4" />;
            case 'custom': return <CheckCircle2 className="h-4 w-4" />;
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
        <>
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

                    <div className="flex items-center gap-2">
                        {/* New Task Button */}
                        <Button
                            variant="outline"
                            onClick={() => setTaskDialogOpen(true)}
                        >
                            <Plus className="h-4 w-4 mr-1" />
                            Tâche
                        </Button>

                        {/* New Session Button */}
                        <Button
                            variant="outline"
                            onClick={() => setSessionDialogOpen(true)}
                        >
                            <Clock className="h-4 w-4 mr-1" />
                            Session
                        </Button>

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

                {/* Sessions Section */}
                {sessions.length > 0 && (
                    <Card>
                        <CardHeader className="flex flex-row items-center justify-between">
                            <CardTitle className="flex items-center gap-2">
                                <Clock className="h-5 w-5 text-indigo-500" />
                                Sessions planifiées
                            </CardTitle>
                            <Button variant="outline" size="sm" onClick={() => setSessionDialogOpen(true)}>
                                <Plus className="h-4 w-4 mr-1" />
                                Ajouter
                            </Button>
                        </CardHeader>
                        <CardContent>
                            <div className="space-y-3">
                                {sessions.map((session) => (
                                    <div key={session.id} className="flex items-center justify-between p-3 rounded-lg border">
                                        <div className="flex items-center gap-3">
                                            <div className={`p-2 rounded-lg ${session.enabled ? 'bg-green-100 text-green-600' : 'bg-gray-100 text-gray-400'}`}>
                                                <Clock className="h-4 w-4" />
                                            </div>
                                            <div>
                                                <div className="font-medium">{session.name}</div>
                                                <div className="text-sm text-muted-foreground">
                                                    {session.time} • {session.duration}min • {session.days.map(d => DAY_LABELS[d]).join(', ')}
                                                </div>
                                            </div>
                                        </div>
                                        <div className="flex items-center gap-2">
                                            <Button
                                                variant="ghost"
                                                size="icon"
                                                onClick={() => handleToggleSession(session.id)}
                                            >
                                                <ToggleLeft className={`h-4 w-4 ${session.enabled ? 'text-green-600' : 'text-gray-400'}`} />
                                            </Button>
                                            <Button
                                                variant="ghost"
                                                size="icon"
                                                onClick={() => handleDeleteSession(session.id)}
                                            >
                                                <Trash2 className="h-4 w-4 text-muted-foreground" />
                                            </Button>
                                        </div>
                                    </div>
                                ))}
                            </div>
                        </CardContent>
                    </Card>
                )}
            </div>

            {/* Create Task Dialog */}
            <Dialog open={taskDialogOpen} onOpenChange={setTaskDialogOpen}>
                <DialogContent>
                    <DialogHeader>
                        <DialogTitle>Nouvelle tâche</DialogTitle>
                        <DialogDescription>
                            Créez une tâche personnalisée pour aujourd'hui
                        </DialogDescription>
                    </DialogHeader>
                    <div className="space-y-4 py-4">
                        <div className="space-y-2">
                            <Label>Titre</Label>
                            <Input
                                placeholder="Ex: Appeler le client X"
                                value={newTask.title}
                                onChange={(e) => setNewTask({ ...newTask, title: e.target.value })}
                            />
                        </div>
                        <div className="grid grid-cols-2 gap-4">
                            <div className="space-y-2">
                                <Label>Type</Label>
                                <Select value={newTask.type} onValueChange={(v) => setNewTask({ ...newTask, type: v as TaskType })}>
                                    <SelectTrigger>
                                        <SelectValue />
                                    </SelectTrigger>
                                    <SelectContent>
                                        <SelectItem value="call">Appel</SelectItem>
                                        <SelectItem value="email">Email</SelectItem>
                                        <SelectItem value="meeting">Réunion</SelectItem>
                                        <SelectItem value="followup">Relance</SelectItem>
                                        <SelectItem value="linkedin">LinkedIn</SelectItem>
                                        <SelectItem value="custom">Autre</SelectItem>
                                    </SelectContent>
                                </Select>
                            </div>
                            <div className="space-y-2">
                                <Label>Priorité</Label>
                                <Select value={newTask.priority} onValueChange={(v) => setNewTask({ ...newTask, priority: v as TaskPriority })}>
                                    <SelectTrigger>
                                        <SelectValue />
                                    </SelectTrigger>
                                    <SelectContent>
                                        <SelectItem value="high">Haute</SelectItem>
                                        <SelectItem value="medium">Moyenne</SelectItem>
                                        <SelectItem value="low">Basse</SelectItem>
                                    </SelectContent>
                                </Select>
                            </div>
                        </div>
                        <div className="grid grid-cols-2 gap-4">
                            <div className="space-y-2">
                                <Label>Date (optionnel)</Label>
                                <Input
                                    type="date"
                                    value={newTask.dueDate}
                                    onChange={(e) => setNewTask({ ...newTask, dueDate: e.target.value })}
                                />
                            </div>
                            <div className="space-y-2">
                                <Label>Heure (optionnel)</Label>
                                <Input
                                    type="time"
                                    value={newTask.dueTime}
                                    onChange={(e) => setNewTask({ ...newTask, dueTime: e.target.value })}
                                />
                            </div>
                        </div>
                    </div>
                    <DialogFooter>
                        <Button variant="outline" onClick={() => setTaskDialogOpen(false)}>Annuler</Button>
                        <Button onClick={handleCreateTask} disabled={creatingTask}>
                            {creatingTask && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                            Créer
                        </Button>
                    </DialogFooter>
                </DialogContent>
            </Dialog>

            {/* Create Session Dialog */}
            <Dialog open={sessionDialogOpen} onOpenChange={setSessionDialogOpen}>
                <DialogContent>
                    <DialogHeader>
                        <DialogTitle>Planifier une session</DialogTitle>
                        <DialogDescription>
                            Créez une session de travail récurrente
                        </DialogDescription>
                    </DialogHeader>
                    <div className="space-y-4 py-4">
                        <div className="space-y-2">
                            <Label>Nom de la session</Label>
                            <Input
                                placeholder="Ex: Session du matin"
                                value={newSession.name}
                                onChange={(e) => setNewSession({ ...newSession, name: e.target.value })}
                            />
                        </div>
                        <div className="grid grid-cols-2 gap-4">
                            <div className="space-y-2">
                                <Label>Heure</Label>
                                <Input
                                    type="time"
                                    value={newSession.time}
                                    onChange={(e) => setNewSession({ ...newSession, time: e.target.value })}
                                />
                            </div>
                            <div className="space-y-2">
                                <Label>Durée (minutes)</Label>
                                <Input
                                    type="number"
                                    min={5}
                                    max={180}
                                    value={newSession.duration}
                                    onChange={(e) => setNewSession({ ...newSession, duration: parseInt(e.target.value) || 30 })}
                                />
                            </div>
                        </div>
                        <div className="space-y-2">
                            <Label>Jours</Label>
                            <div className="flex flex-wrap gap-2">
                                {(['monday', 'tuesday', 'wednesday', 'thursday', 'friday', 'saturday', 'sunday'] as DayOfWeek[]).map((day) => (
                                    <label key={day} className="flex items-center gap-2 cursor-pointer">
                                        <Checkbox
                                            checked={newSession.days.includes(day)}
                                            onCheckedChange={(checked) => {
                                                if (checked) {
                                                    setNewSession({ ...newSession, days: [...newSession.days, day] });
                                                } else {
                                                    setNewSession({ ...newSession, days: newSession.days.filter(d => d !== day) });
                                                }
                                            }}
                                        />
                                        <span className="text-sm">{DAY_LABELS[day]}</span>
                                    </label>
                                ))}
                            </div>
                        </div>
                        <div className="space-y-2">
                            <Label>Nombre max de tâches</Label>
                            <Input
                                type="number"
                                min={1}
                                max={50}
                                value={newSession.maxTasks}
                                onChange={(e) => setNewSession({ ...newSession, maxTasks: parseInt(e.target.value) || 10 })}
                            />
                        </div>
                    </div>
                    <DialogFooter>
                        <Button variant="outline" onClick={() => setSessionDialogOpen(false)}>Annuler</Button>
                        <Button onClick={handleCreateSession} disabled={creatingSession}>
                            {creatingSession && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                            Planifier
                        </Button>
                    </DialogFooter>
                </DialogContent>
            </Dialog>
        </>
    );
}
