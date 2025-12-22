import { useEffect, useState, useMemo } from 'react';
import { Link } from 'react-router-dom';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { AreaChart } from '@/components/ui/area-chart';
import { TrendIndicator } from '@/components/ui/trend-indicator';
import { ActivityFeed, type ActivityItem } from '@/components/ui/activity-feed';
import { ProgressCard } from '@/components/ui/progress-card';
import {
    Users,
    Mail,
    Megaphone,
    TrendingUp,
    Upload,
    Sparkles,
    Download,
    BarChart3,
    ArrowRight,
    Zap,
    Target,
    Clock
} from 'lucide-react';
import { statsApi, activityApi, type StatsOverview, type TrendsData, type Activity, type GoalsData } from '@/api/client';

// Get greeting based on time of day
function getGreeting(): string {
    const hour = new Date().getHours();
    if (hour < 12) return 'Bonjour';
    if (hour < 18) return 'Bon après-midi';
    return 'Bonsoir';
}

// Format date for display
function formatDate(): string {
    return new Date().toLocaleDateString('fr-FR', {
        weekday: 'long',
        day: 'numeric',
        month: 'long'
    });
}

export function DashboardPage() {
    const [stats, setStats] = useState<StatsOverview | null>(null);
    const [trends, setTrends] = useState<TrendsData | null>(null);
    const [activities, setActivities] = useState<Activity[]>([]);
    const [goals, setGoals] = useState<GoalsData | null>(null);
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        async function loadData() {
            try {
                const [statsResult, trendsResult, activityResult, goalsResult] = await Promise.all([
                    statsApi.getOverview(),
                    statsApi.getTrends(),
                    activityApi.getRecent(5),
                    statsApi.getGoals()
                ]);
                setStats(statsResult.data);
                setTrends(trendsResult.data);
                setActivities(activityResult.data);
                setGoals(goalsResult.data);
            } catch (error) {
                console.error('Error loading dashboard data:', error);
            } finally {
                setLoading(false);
            }
        }
        loadData();
    }, []);

    // Transform activities to ActivityItem format
    const recentActivities: ActivityItem[] = useMemo(() =>
        activities.map(a => ({
            id: a.id,
            type: a.type,
            title: a.title,
            description: a.description,
            timestamp: new Date(a.timestamp),
        }))
        , [activities]);

    // Get trend values with fallbacks
    const trendValues = useMemo(() => ({
        prospects: trends?.prospects.change ?? 0,
        messages: trends?.messages.change ?? 0,
        campaigns: trends?.campaigns.change ?? 0,
        engagement: trends?.engagement.change ?? 0
    }), [trends]);

    // Chart data from stats
    const chartData = useMemo(() => {
        if (!stats?.weeklyData) {
            return [
                { label: 'Lun', value: 0, secondaryValue: 0 },
                { label: 'Mar', value: 0, secondaryValue: 0 },
                { label: 'Mer', value: 0, secondaryValue: 0 },
                { label: 'Jeu', value: 0, secondaryValue: 0 },
                { label: 'Ven', value: 0, secondaryValue: 0 },
                { label: 'Sam', value: 0, secondaryValue: 0 },
                { label: 'Dim', value: 0, secondaryValue: 0 },
            ];
        }
        return stats.weeklyData.map((d, i) => ({
            label: ['Lun', 'Mar', 'Mer', 'Jeu', 'Ven', 'Sam', 'Dim'][i] || d.week,
            value: d.prospects,
            secondaryValue: d.messages,
        }));
    }, [stats?.weeklyData]);

    const statCards = [
        {
            title: 'Prospects',
            value: stats?.prospects.total ?? 0,
            icon: Users,
            color: 'text-blue-500',
            bgColor: 'bg-linear-to-br from-blue-500/20 to-cyan-500/10',
            trend: trendValues.prospects,
        },
        {
            title: 'Messages',
            value: stats?.messages.total ?? 0,
            icon: Mail,
            color: 'text-emerald-500',
            bgColor: 'bg-linear-to-br from-emerald-500/20 to-teal-500/10',
            trend: trendValues.messages,
        },
        {
            title: 'Campagnes actives',
            value: stats?.campaigns.active ?? 0,
            icon: Megaphone,
            color: 'text-purple-500',
            bgColor: 'bg-linear-to-br from-purple-500/20 to-pink-500/10',
            trend: trendValues.campaigns,
        },
        {
            title: 'Taux d\'engagement',
            value: stats ? `${Math.round(((stats.messages.replied || 0) / Math.max(stats.messages.total, 1)) * 100)}%` : '0%',
            icon: TrendingUp,
            color: 'text-orange-500',
            bgColor: 'bg-linear-to-br from-orange-500/20 to-amber-500/10',
            trend: trendValues.engagement,
            isPercentage: true,
        },
    ];

    const quickActions = [
        { label: 'Importer des prospects', href: '/import', icon: Upload, description: 'Ajoutez des contacts via CSV' },
        { label: 'Générer des messages', href: '/generate', icon: Sparkles, description: 'Créez des messages avec l\'IA' },
        { label: 'Exporter les données', href: '/export', icon: Download, description: 'Téléchargez vos données' },
        { label: 'Analyser une entreprise', href: '/analyze', icon: BarChart3, description: 'Rapport IA détaillé' },
    ];

    return (
        <div className="space-y-8">
            {/* Personalized Header */}
            <div className="flex flex-col md:flex-row md:items-end justify-between gap-4 animate-fade-in">
                <div>
                    <div className="flex items-center gap-2 text-muted-foreground text-sm mb-1">
                        <Clock className="h-4 w-4" />
                        <span className="capitalize">{formatDate()}</span>
                    </div>
                    <h1 className="text-4xl font-bold tracking-tight">
                        {getGreeting()} <span className="gradient-text">👋</span>
                    </h1>
                    <p className="text-muted-foreground mt-1">
                        Voici un aperçu de votre activité de prospection
                    </p>
                </div>
                <div className="flex gap-2">
                    <Button variant="outline" asChild>
                        <Link to="/prospects">
                            <Users className="mr-2 h-4 w-4" />
                            Voir prospects
                        </Link>
                    </Button>
                    <Button asChild className="group">
                        <Link to="/import">
                            <Zap className="mr-2 h-4 w-4 group-hover:animate-pulse" />
                            Nouvelle import
                            <ArrowRight className="ml-2 h-4 w-4 transition-transform group-hover:translate-x-1" />
                        </Link>
                    </Button>
                </div>
            </div>

            {/* Stats Cards */}
            <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
                {statCards.map((stat, index) => (
                    <Card
                        key={stat.title}
                        className="card-hover animate-slide-in-up overflow-hidden relative"
                        style={{ animationDelay: `${index * 75}ms`, animationFillMode: 'both' }}
                    >
                        {/* Shimmer effect on hover */}
                        <div className="absolute inset-0 -translate-x-full hover:translate-x-full transition-transform duration-1000 bg-linear-to-r from-transparent via-white/5 to-transparent pointer-events-none" />

                        <CardHeader className="flex flex-row items-center justify-between pb-2">
                            <CardTitle className="text-sm font-medium text-muted-foreground">
                                {stat.title}
                            </CardTitle>
                            <div className={`p-2.5 rounded-xl ${stat.bgColor}`}>
                                <stat.icon className={`h-5 w-5 ${stat.color}`} />
                            </div>
                        </CardHeader>
                        <CardContent>
                            <div className="flex items-end justify-between">
                                <div className="text-3xl font-bold tabular-nums">
                                    {loading ? (
                                        <div className="h-9 w-20 animate-pulse rounded-lg bg-muted" />
                                    ) : (
                                        <span className="animate-count-up">{stat.value}</span>
                                    )}
                                </div>
                                {!loading && stat.trend !== 0 && (
                                    <TrendIndicator value={stat.trend} size="sm" />
                                )}
                            </div>
                            {!stat.isPercentage && (
                                <p className="text-xs text-muted-foreground mt-2">
                                    vs. semaine dernière
                                </p>
                            )}
                        </CardContent>
                    </Card>
                ))}
            </div>

            {/* Performance Chart & Quick Actions */}
            <div className="grid gap-6 lg:grid-cols-3">
                {/* Chart - takes 2 columns */}
                <Card className="lg:col-span-2 animate-slide-in-up" style={{ animationDelay: '200ms', animationFillMode: 'both' }}>
                    <CardHeader>
                        <div className="flex items-center justify-between">
                            <div>
                                <CardTitle className="flex items-center gap-2">
                                    <Target className="h-5 w-5 text-primary" />
                                    Performance hebdomadaire
                                </CardTitle>
                                <CardDescription>
                                    Évolution de vos prospects et messages cette semaine
                                </CardDescription>
                            </div>
                            <Badge variant="secondary" className="font-normal">
                                7 derniers jours
                            </Badge>
                        </div>
                    </CardHeader>
                    <CardContent>
                        <AreaChart
                            data={chartData}
                            height={220}
                            primaryLabel="Prospects"
                            secondaryLabel="Messages"
                            primaryColor="rgb(99, 102, 241)"
                            secondaryColor="rgb(16, 185, 129)"
                        />
                    </CardContent>
                </Card>

                {/* Quick Actions */}
                <Card className="animate-slide-in-up" style={{ animationDelay: '300ms', animationFillMode: 'both' }}>
                    <CardHeader className="pb-3">
                        <CardTitle className="flex items-center gap-2">
                            <Zap className="h-5 w-5 text-yellow-500" />
                            Actions rapides
                        </CardTitle>
                    </CardHeader>
                    <CardContent className="space-y-2">
                        {quickActions.map((action, index) => (
                            <Link
                                key={action.href}
                                to={action.href}
                                className="group flex items-center gap-3 p-3 rounded-lg transition-all duration-200 hover:bg-muted/80 animate-slide-in-left"
                                style={{ animationDelay: `${300 + index * 50}ms`, animationFillMode: 'both' }}
                            >
                                <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-lg bg-primary/10 text-primary transition-transform group-hover:scale-110">
                                    <action.icon className="h-5 w-5" />
                                </div>
                                <div className="flex-1 min-w-0">
                                    <p className="text-sm font-medium">{action.label}</p>
                                    <p className="text-xs text-muted-foreground truncate">{action.description}</p>
                                </div>
                                <ArrowRight className="h-4 w-4 text-muted-foreground opacity-0 -translate-x-2 transition-all group-hover:opacity-100 group-hover:translate-x-0" />
                            </Link>
                        ))}
                    </CardContent>
                </Card>
            </div>

            {/* Activity Feed & Goals */}
            <div className="grid gap-6 lg:grid-cols-2">
                {/* Recent Activity */}
                <Card className="animate-slide-in-up" style={{ animationDelay: '400ms', animationFillMode: 'both' }}>
                    <CardHeader className="pb-3">
                        <div className="flex items-center justify-between">
                            <CardTitle className="flex items-center gap-2">
                                <Clock className="h-5 w-5 text-blue-500" />
                                Activité récente
                            </CardTitle>
                            <Button variant="ghost" size="sm" className="text-xs">
                                Voir tout
                            </Button>
                        </div>
                    </CardHeader>
                    <CardContent>
                        <ActivityFeed activities={recentActivities} maxItems={4} />
                    </CardContent>
                </Card>

                {/* Goals & Progress */}
                <Card className="animate-slide-in-up" style={{ animationDelay: '450ms', animationFillMode: 'both' }}>
                    <CardHeader className="pb-3">
                        <div className="flex items-center justify-between">
                            <CardTitle className="flex items-center gap-2">
                                <Target className="h-5 w-5 text-emerald-500" />
                                Objectifs du mois
                            </CardTitle>
                            <Badge
                                variant="outline"
                                className={`font-normal ${goals?.status === 'excellent' ? 'text-emerald-600' :
                                    goals?.status === 'good' ? 'text-blue-600' : 'text-yellow-600'
                                    }`}
                            >
                                {goals?.status === 'excellent' ? 'Excellent' :
                                    goals?.status === 'good' ? 'En bonne voie' : 'À améliorer'}
                            </Badge>
                        </div>
                    </CardHeader>
                    <CardContent className="space-y-4">
                        {goals?.goals.map((goal) => (
                            <ProgressCard
                                key={goal.id}
                                title={goal.title}
                                current={goal.current}
                                target={goal.target}
                                type={goal.type}
                            />
                        )) || (
                                <>
                                    <ProgressCard
                                        title="Nouveaux prospects"
                                        current={stats?.prospects.total ?? 0}
                                        target={100}
                                        type="prospects"
                                    />
                                    <ProgressCard
                                        title="Messages envoyés"
                                        current={stats?.messages.sent ?? 0}
                                        target={50}
                                        type="messages"
                                    />
                                    <ProgressCard
                                        title="Taux de réponse"
                                        current={stats?.messages.replied ?? 0}
                                        target={20}
                                        type="engagement"
                                        suffix=" réponses"
                                    />
                                </>
                            )}
                    </CardContent>
                </Card>
            </div>

            {/* Bottom Stats Row */}
            <div className="grid gap-4 md:grid-cols-3 animate-slide-in-up" style={{ animationDelay: '500ms', animationFillMode: 'both' }}>
                {/* Messages Status */}
                <Card>
                    <CardHeader className="pb-2">
                        <CardTitle className="text-base">État des messages</CardTitle>
                    </CardHeader>
                    <CardContent>
                        <div className="space-y-3">
                            {[
                                { label: 'En attente', value: stats?.messages.pending ?? 0, color: 'bg-yellow-500' },
                                { label: 'Envoyés', value: stats?.messages.sent ?? 0, color: 'bg-blue-500' },
                                { label: 'Réponses', value: stats?.messages.replied ?? 0, color: 'bg-emerald-500' },
                            ].map((item) => (
                                <div key={item.label} className="flex items-center justify-between">
                                    <div className="flex items-center gap-2">
                                        <div className={`h-2 w-2 rounded-full ${item.color}`} />
                                        <span className="text-sm">{item.label}</span>
                                    </div>
                                    <Badge variant="secondary">{item.value}</Badge>
                                </div>
                            ))}
                        </div>
                    </CardContent>
                </Card>

                {/* Campaigns Overview */}
                <Card>
                    <CardHeader className="pb-2">
                        <CardTitle className="text-base">Campagnes</CardTitle>
                    </CardHeader>
                    <CardContent>
                        <div className="grid grid-cols-3 gap-2 text-center">
                            {[
                                { label: 'Actives', value: stats?.campaigns.active ?? 0, color: 'text-emerald-600' },
                                { label: 'Terminées', value: stats?.campaigns.completed ?? 0, color: 'text-blue-600' },
                                { label: 'Brouillons', value: stats?.campaigns.draft ?? 0, color: 'text-gray-600' },
                            ].map((item) => (
                                <div key={item.label} className="p-3 rounded-lg bg-muted/50">
                                    <div className={`text-2xl font-bold ${item.color}`}>{item.value}</div>
                                    <div className="text-xs text-muted-foreground">{item.label}</div>
                                </div>
                            ))}
                        </div>
                        <Button asChild className="w-full mt-3" variant="outline" size="sm">
                            <Link to="/campaigns">Gérer les campagnes</Link>
                        </Button>
                    </CardContent>
                </Card>

                {/* Pro Tips */}
                <Card className="bg-linear-to-br from-primary/5 via-primary/10 to-purple-500/5 border-primary/20">
                    <CardHeader className="pb-2">
                        <CardTitle className="text-base flex items-center gap-2">
                            <Sparkles className="h-4 w-4 text-primary" />
                            Conseil du jour
                        </CardTitle>
                    </CardHeader>
                    <CardContent>
                        <p className="text-sm text-muted-foreground mb-3">
                            Personnalisez vos messages avec des variables dynamiques pour augmenter votre taux de réponse de 40%.
                        </p>
                        <Button asChild size="sm" className="w-full">
                            <Link to="/templates">
                                Créer un template
                                <ArrowRight className="ml-2 h-4 w-4" />
                            </Link>
                        </Button>
                    </CardContent>
                </Card>
            </div>
        </div>
    );
}
