import { useEffect, useState } from 'react';
import { useParams, useNavigate, Link } from 'react-router-dom';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Badge } from '@/components/ui/badge';
import { Progress } from '@/components/ui/progress';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Separator } from '@/components/ui/separator';
import {
    ArrowLeft,
    Mail,
    Phone,
    Building,
    Globe,
    Linkedin,
    MapPin,
    Star,
    Save,
    Trash2,
    Loader2,
    Sparkles,
    Search,
    Bot,
    ExternalLink,
    CheckCircle,
    AlertCircle,
    Zap,
    TrendingUp,
    Lightbulb,
    Target
} from 'lucide-react';
import { prospectsApi, researchApi, enrichmentApi, type Prospect, type ICPScoreData, type AIInsights } from '@/api/client';
import { toast } from 'sonner';

export function ProspectDetailPage() {
    const { id } = useParams<{ id: string }>();
    const navigate = useNavigate();
    const [prospect, setProspect] = useState<Prospect | null>(null);
    const [loading, setLoading] = useState(true);
    const [saving, setSaving] = useState(false);
    const [edited, setEdited] = useState<Partial<Prospect>>({});
    const [researching, setResearching] = useState<'idle' | 'playwright' | 'apify'>('idle');
    const [researchData, setResearchData] = useState<unknown>(null);
    const [icpData, setIcpData] = useState<ICPScoreData | null>(null);
    const [enriching, setEnriching] = useState(false);
    const [aiInsights, setAiInsights] = useState<AIInsights | null>(null);

    useEffect(() => {
        if (id) {
            loadProspect();
            loadICPScore();
        }
    }, [id]);

    async function loadProspect() {
        try {
            const result = await prospectsApi.getById(id!);
            setProspect(result.data);
            setEdited(result.data);
            // Load AI insights if already enriched
            if (result.data.aiInsights) {
                setAiInsights(result.data.aiInsights);
            }
        } catch {
            toast.error('Prospect non trouvé');
            navigate('/prospects');
        } finally {
            setLoading(false);
        }
    }

    async function loadICPScore() {
        try {
            const result = await enrichmentApi.getICPScore(id!);
            setIcpData(result.data);
        } catch {
            console.log('Could not load ICP score');
        }
    }

    async function handleSave() {
        if (!id) return;
        setSaving(true);
        try {
            const result = await prospectsApi.update(id, edited);
            setProspect(result.data);
            setEdited(result.data);
            toast.success('Prospect mis à jour');
            // Reload ICP score after update
            loadICPScore();
        } catch {
            toast.error('Erreur lors de la sauvegarde');
        } finally {
            setSaving(false);
        }
    }

    async function handleDelete() {
        if (!id || !confirm('Supprimer ce prospect ?')) return;
        try {
            await prospectsApi.delete(id);
            toast.success('Prospect supprimé');
            navigate('/prospects');
        } catch {
            toast.error('Erreur lors de la suppression');
        }
    }

    async function handleEnrich() {
        if (!id) return;
        setEnriching(true);
        try {
            const result = await enrichmentApi.enrich(id);
            if (result.success) {
                setProspect(result.data);
                setEdited(result.data);
                setAiInsights(result.enrichment.aiInsights);
                loadICPScore();

                const sources = result.enrichment.sources.join(', ');
                const fields = result.enrichment.fieldsUpdated.length;
                toast.success(`Enrichissement terminé! Sources: ${sources}. ${fields} champs mis à jour.`);
            } else {
                toast.error('Erreur lors de l\'enrichissement');
            }
        } catch (error: unknown) {
            const message = error instanceof Error ? error.message : 'Erreur lors de l\'enrichissement';
            toast.error(message);
        } finally {
            setEnriching(false);
        }
    }

    async function handlePlaywrightResearch() {
        if (!id) return;
        setResearching('playwright');
        try {
            const result = await researchApi.runPlaywright(id);
            setResearchData(result.data);
            toast.success('Recherche Playwright terminée');
        } catch (error: unknown) {
            const message = error instanceof Error ? error.message : 'Erreur lors de la recherche';
            toast.error(message);
        } finally {
            setResearching('idle');
        }
    }

    async function handleApifyResearch() {
        if (!id) return;
        setResearching('apify');
        try {
            const result = await researchApi.runApify(id);
            setResearchData(result.data);
            toast.success('Recherche Apify terminée');
        } catch (error: unknown) {
            const message = error instanceof Error ? error.message : 'Erreur lors de la recherche';
            toast.error(message);
        } finally {
            setResearching('idle');
        }
    }

    function getDisplayName() {
        if (!prospect) return '';
        return `${prospect.prenom || ''} ${prospect.nom || ''}`.trim() || prospect.entreprise || 'Sans nom';
    }

    function getInitials() {
        const name = getDisplayName();
        return name.split(' ').slice(0, 2).map(w => w[0] || '').join('').toUpperCase();
    }

    function getScoreColor(level: 'hot' | 'warm' | 'cold') {
        switch (level) {
            case 'hot': return 'text-red-600 bg-red-100';
            case 'warm': return 'text-amber-600 bg-amber-100';
            case 'cold': return 'text-blue-600 bg-blue-100';
        }
    }

    function getScoreLabel(level: 'hot' | 'warm' | 'cold') {
        switch (level) {
            case 'hot': return '🔥 Chaud';
            case 'warm': return '☀️ Tiède';
            case 'cold': return '❄️ Froid';
        }
    }

    if (loading) {
        return (
            <div className="flex items-center justify-center py-12">
                <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
            </div>
        );
    }

    if (!prospect) {
        return null;
    }

    return (
        <div className="max-w-5xl mx-auto space-y-6">
            {/* Back Button */}
            <Button variant="ghost" onClick={() => navigate('/prospects')} className="-ml-2">
                <ArrowLeft className="mr-2 h-4 w-4" />
                Retour aux prospects
            </Button>

            {/* Header */}
            <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
                <div className="flex items-center gap-4">
                    <div className="h-16 w-16 rounded-full bg-linear-to-br from-primary to-blue-400 flex items-center justify-center text-white text-xl font-bold">
                        {getInitials()}
                    </div>
                    <div>
                        <div className="flex items-center gap-2">
                            <h1 className="text-2xl font-bold">{getDisplayName()}</h1>
                            {icpData && (
                                <Badge className={getScoreColor(icpData.level)}>
                                    {getScoreLabel(icpData.level)}
                                </Badge>
                            )}
                        </div>
                        <p className="text-muted-foreground">{prospect.poste || prospect.entreprise || '-'}</p>
                    </div>
                </div>
                <div className="flex gap-2">
                    <Button variant="outline" onClick={handleEnrich} disabled={enriching}>
                        {enriching ? (
                            <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                        ) : (
                            <Zap className="mr-2 h-4 w-4" />
                        )}
                        Enrichir
                    </Button>
                    <Button variant="outline" asChild>
                        <Link to={`/generate?prospect=${id}`}>
                            <Sparkles className="mr-2 h-4 w-4" />
                            Générer un message
                        </Link>
                    </Button>
                    <Button variant="destructive" onClick={handleDelete}>
                        <Trash2 className="mr-2 h-4 w-4" />
                        Supprimer
                    </Button>
                </div>
            </div>

            <div className="grid gap-6 md:grid-cols-3">
                {/* Main Info */}
                <Card className="md:col-span-2">
                    <CardHeader>
                        <CardTitle>Informations</CardTitle>
                    </CardHeader>
                    <CardContent className="space-y-4">
                        <div className="grid gap-4 md:grid-cols-2">
                            <div className="space-y-2">
                                <Label>Prénom</Label>
                                <Input
                                    value={edited.prenom || ''}
                                    onChange={(e) => setEdited({ ...edited, prenom: e.target.value })}
                                />
                            </div>
                            <div className="space-y-2">
                                <Label>Nom</Label>
                                <Input
                                    value={edited.nom || ''}
                                    onChange={(e) => setEdited({ ...edited, nom: e.target.value })}
                                />
                            </div>
                            <div className="space-y-2">
                                <Label>Email</Label>
                                <div className="relative">
                                    <Mail className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
                                    <Input
                                        type="email"
                                        value={edited.email || ''}
                                        onChange={(e) => setEdited({ ...edited, email: e.target.value })}
                                        className="pl-9"
                                    />
                                </div>
                            </div>
                            <div className="space-y-2">
                                <Label>Téléphone</Label>
                                <div className="relative">
                                    <Phone className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
                                    <Input
                                        value={edited.telephone || ''}
                                        onChange={(e) => setEdited({ ...edited, telephone: e.target.value })}
                                        className="pl-9"
                                    />
                                </div>
                            </div>
                            <div className="space-y-2">
                                <Label>Entreprise</Label>
                                <div className="relative">
                                    <Building className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
                                    <Input
                                        value={edited.entreprise || ''}
                                        onChange={(e) => setEdited({ ...edited, entreprise: e.target.value })}
                                        className="pl-9"
                                    />
                                </div>
                            </div>
                            <div className="space-y-2">
                                <Label>Poste</Label>
                                <Input
                                    value={edited.poste || ''}
                                    onChange={(e) => setEdited({ ...edited, poste: e.target.value })}
                                />
                            </div>
                            <div className="space-y-2 md:col-span-2">
                                <Label>Adresse</Label>
                                <div className="relative">
                                    <MapPin className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
                                    <Input
                                        value={edited.adresse || ''}
                                        onChange={(e) => setEdited({ ...edited, adresse: e.target.value })}
                                        className="pl-9"
                                    />
                                </div>
                            </div>
                        </div>

                        <Separator />

                        {/* Links */}
                        <div className="grid gap-4 md:grid-cols-2">
                            <div className="space-y-2">
                                <Label>Site web</Label>
                                <div className="relative">
                                    <Globe className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
                                    <Input
                                        value={edited.siteWeb || ''}
                                        onChange={(e) => setEdited({ ...edited, siteWeb: e.target.value })}
                                        className="pl-9"
                                        placeholder="https://"
                                    />
                                </div>
                            </div>
                            <div className="space-y-2">
                                <Label>LinkedIn</Label>
                                <div className="relative">
                                    <Linkedin className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
                                    <Input
                                        value={edited.linkedin || ''}
                                        onChange={(e) => setEdited({ ...edited, linkedin: e.target.value })}
                                        className="pl-9"
                                        placeholder="linkedin.com/in/..."
                                    />
                                </div>
                            </div>
                        </div>

                        <div className="flex justify-end pt-4">
                            <Button onClick={handleSave} disabled={saving}>
                                {saving && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                                <Save className="mr-2 h-4 w-4" />
                                Enregistrer
                            </Button>
                        </div>
                    </CardContent>
                </Card>

                {/* Status & Score */}
                <div className="space-y-6">
                    {/* ICP Score Card */}
                    {icpData && (
                        <Card className="border-2 border-primary/20">
                            <CardHeader className="pb-2">
                                <CardTitle className="flex items-center gap-2">
                                    <Target className="h-5 w-5 text-primary" />
                                    Score ICP
                                </CardTitle>
                            </CardHeader>
                            <CardContent>
                                <div className="text-center mb-4">
                                    <div className="text-4xl font-bold">{icpData.score}%</div>
                                    <Badge className={`mt-1 ${getScoreColor(icpData.level)}`}>
                                        {getScoreLabel(icpData.level)}
                                    </Badge>
                                </div>
                                <div className="space-y-2">
                                    {Object.entries(icpData.breakdown).map(([key, item]) => (
                                        <div key={key} className="flex items-center gap-2">
                                            <div className="flex-1">
                                                <div className="flex justify-between text-xs mb-1">
                                                    <span>{item.label}</span>
                                                    <span>{item.points}/{item.maxPoints}</span>
                                                </div>
                                                <Progress value={(item.points / item.maxPoints) * 100} className="h-1.5" />
                                            </div>
                                            {item.value ? (
                                                <CheckCircle className="h-4 w-4 text-green-500 shrink-0" />
                                            ) : (
                                                <AlertCircle className="h-4 w-4 text-muted-foreground/50 shrink-0" />
                                            )}
                                        </div>
                                    ))}
                                </div>
                            </CardContent>
                        </Card>
                    )}

                    {/* Triage Status */}
                    <Card>
                        <CardHeader>
                            <CardTitle>Statut de triage</CardTitle>
                        </CardHeader>
                        <CardContent>
                            <Select
                                value={edited.triageStatus || 'new'}
                                onValueChange={(v) => setEdited({ ...edited, triageStatus: v })}
                            >
                                <SelectTrigger>
                                    <SelectValue />
                                </SelectTrigger>
                                <SelectContent>
                                    <SelectItem value="new">🆕 Nouveau</SelectItem>
                                    <SelectItem value="to_contact">📞 À contacter</SelectItem>
                                    <SelectItem value="interested">🔥 Intéressé</SelectItem>
                                    <SelectItem value="not_interested">❌ Pas intéressé</SelectItem>
                                    <SelectItem value="archived">📦 Archivé</SelectItem>
                                </SelectContent>
                            </Select>
                        </CardContent>
                    </Card>

                    {/* Quick Actions */}
                    <Card>
                        <CardHeader>
                            <CardTitle>Actions rapides</CardTitle>
                        </CardHeader>
                        <CardContent className="space-y-2">
                            {prospect.email && (
                                <Button variant="outline" className="w-full justify-start" asChild>
                                    <a href={`mailto:${prospect.email}`}>
                                        <Mail className="mr-2 h-4 w-4" />
                                        Envoyer un email
                                    </a>
                                </Button>
                            )}
                            {prospect.telephone && (
                                <Button variant="outline" className="w-full justify-start" asChild>
                                    <a href={`tel:${prospect.telephone}`}>
                                        <Phone className="mr-2 h-4 w-4" />
                                        Appeler
                                    </a>
                                </Button>
                            )}
                            {prospect.linkedin && (
                                <Button variant="outline" className="w-full justify-start" asChild>
                                    <a href={prospect.linkedin} target="_blank" rel="noopener noreferrer">
                                        <Linkedin className="mr-2 h-4 w-4" />
                                        Voir LinkedIn
                                    </a>
                                </Button>
                            )}
                            {prospect.siteWeb && (
                                <Button variant="outline" className="w-full justify-start" asChild>
                                    <a href={prospect.siteWeb} target="_blank" rel="noopener noreferrer">
                                        <ExternalLink className="mr-2 h-4 w-4" />
                                        Voir site web
                                    </a>
                                </Button>
                            )}
                        </CardContent>
                    </Card>
                </div>
            </div>

            {/* AI Insights Section */}
            {aiInsights && (
                <Card className="border-2 border-violet-200 bg-violet-50/50 dark:border-violet-900 dark:bg-violet-950/20">
                    <CardHeader>
                        <CardTitle className="flex items-center gap-2">
                            <Lightbulb className="h-5 w-5 text-violet-600" />
                            Insights IA
                        </CardTitle>
                        <CardDescription>Analyse automatique générée par l'IA</CardDescription>
                    </CardHeader>
                    <CardContent>
                        <div className="grid md:grid-cols-3 gap-6">
                            {/* Pain Points */}
                            <div>
                                <h4 className="font-semibold mb-2 flex items-center gap-2">
                                    <AlertCircle className="h-4 w-4 text-red-500" />
                                    Points de douleur
                                </h4>
                                <ul className="space-y-1">
                                    {aiInsights.painPoints.map((point, i) => (
                                        <li key={i} className="text-sm text-muted-foreground flex items-start gap-2">
                                            <span className="text-red-500">•</span>
                                            {point}
                                        </li>
                                    ))}
                                </ul>
                            </div>

                            {/* Approaches */}
                            <div>
                                <h4 className="font-semibold mb-2 flex items-center gap-2">
                                    <TrendingUp className="h-4 w-4 text-green-500" />
                                    Approches recommandées
                                </h4>
                                <ul className="space-y-1">
                                    {aiInsights.approaches.map((approach, i) => (
                                        <li key={i} className="text-sm text-muted-foreground flex items-start gap-2">
                                            <span className="text-green-500">•</span>
                                            {approach}
                                        </li>
                                    ))}
                                </ul>
                            </div>

                            {/* Value Proposition */}
                            <div>
                                <h4 className="font-semibold mb-2 flex items-center gap-2">
                                    <Star className="h-4 w-4 text-amber-500" />
                                    Proposition de valeur
                                </h4>
                                <p className="text-sm text-muted-foreground">{aiInsights.valueProposition}</p>
                            </div>
                        </div>
                    </CardContent>
                </Card>
            )}

            {/* Research Section */}
            <Card>
                <CardHeader>
                    <CardTitle className="flex items-center gap-2">
                        <Search className="h-5 w-5" />
                        Recherche en ligne
                    </CardTitle>
                    <CardDescription>
                        Collectez des données supplémentaires sur ce prospect
                    </CardDescription>
                </CardHeader>
                <CardContent className="space-y-3">
                    <div className="flex gap-3">
                        <Button
                            variant="outline"
                            onClick={handlePlaywrightResearch}
                            disabled={researching !== 'idle'}
                        >
                            {researching === 'playwright' ? (
                                <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                            ) : (
                                <Globe className="mr-2 h-4 w-4" />
                            )}
                            Playwright (gratuit)
                        </Button>
                        <Button
                            variant="outline"
                            onClick={handleApifyResearch}
                            disabled={researching !== 'idle'}
                        >
                            {researching === 'apify' ? (
                                <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                            ) : (
                                <Bot className="mr-2 h-4 w-4" />
                            )}
                            Apify (avancé)
                        </Button>
                    </div>

                    {researchData && (
                        <div className="mt-4 p-3 rounded-lg bg-muted/50 text-sm">
                            <div className="flex items-center gap-2 text-green-600 mb-2">
                                <CheckCircle className="h-4 w-4" />
                                Données collectées
                            </div>
                            <Badge variant="outline" className="mr-1 mb-1">Recherche ✓</Badge>
                        </div>
                    )}
                </CardContent>
            </Card>
        </div>
    );
}
