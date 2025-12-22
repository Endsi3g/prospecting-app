import { useState } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Badge } from '@/components/ui/badge';
import { Separator } from '@/components/ui/separator';
import {
    Building2,
    Globe,
    Search,
    Loader2,
    TrendingUp,
    AlertTriangle,
    Lightbulb,
    Target,
    CheckCircle
} from 'lucide-react';
import { toast } from 'sonner';

interface AnalysisResult {
    interestScore: number;
    summary: string;
    painPoints: string[];
    opportunities: string[];
    recommendedApproach: string;
}

export function AnalyzePage() {
    const [companyName, setCompanyName] = useState('');
    const [website, setWebsite] = useState('');
    const [context, setContext] = useState('');
    const [analyzing, setAnalyzing] = useState(false);
    const [result, setResult] = useState<AnalysisResult | null>(null);

    async function handleAnalyze() {
        if (!companyName.trim()) {
            toast.error('Veuillez entrer un nom d\'entreprise');
            return;
        }

        setAnalyzing(true);
        setResult(null);

        try {
            const response = await fetch('/api/company/analyze', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ companyName, website, context })
            });

            const data = await response.json();

            if (data.success) {
                setResult(data.data);
                toast.success('Analyse terminée');
            } else {
                throw new Error(data.error || 'Erreur d\'analyse');
            }
        } catch (error) {`r`n            console.error('API error:', error);`r`n            toast.error('Erreur lors de l\'analyse. Vérifiez que Ollama est actif.');
        } finally {
            setAnalyzing(false);
        }
    }

    function getScoreColor(score: number) {
        if (score >= 70) return 'text-green-600 bg-green-100';
        if (score >= 40) return 'text-yellow-600 bg-yellow-100';
        return 'text-red-600 bg-red-100';
    }

    return (
        <div className="max-w-4xl mx-auto space-y-6">
            {/* Header */}
            <div>
                <h1 className="text-3xl font-bold tracking-tight">Analyse d'entreprise</h1>
                <p className="text-muted-foreground">
                    Analysez une entreprise avec l'IA pour identifier les opportunités de prospection
                </p>
            </div>

            <div className="grid gap-6 lg:grid-cols-2">
                {/* Input Form */}
                <Card>
                    <CardHeader>
                        <CardTitle className="flex items-center gap-2">
                            <Building2 className="h-5 w-5" />
                            Informations sur l'entreprise
                        </CardTitle>
                        <CardDescription>
                            Entrez les informations disponibles pour une analyse personnalisée
                        </CardDescription>
                    </CardHeader>
                    <CardContent className="space-y-4">
                        <div className="space-y-2">
                            <Label htmlFor="company">Nom de l'entreprise *</Label>
                            <Input
                                id="company"
                                placeholder="Ex: Acme Corporation"
                                value={companyName}
                                onChange={(e) => setCompanyName(e.target.value)}
                            />
                        </div>

                        <div className="space-y-2">
                            <Label htmlFor="website">Site web (optionnel)</Label>
                            <div className="relative">
                                <Globe className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
                                <Input
                                    id="website"
                                    placeholder="https://www.example.com"
                                    value={website}
                                    onChange={(e) => setWebsite(e.target.value)}
                                    className="pl-9"
                                />
                            </div>
                        </div>

                        <div className="space-y-2">
                            <Label htmlFor="context">Contexte additionnel (optionnel)</Label>
                            <Textarea
                                id="context"
                                placeholder="Secteur d'activité, taille de l'entreprise, actualités récentes..."
                                value={context}
                                onChange={(e) => setContext(e.target.value)}
                                rows={3}
                            />
                        </div>

                        <Button
                            className="w-full"
                            onClick={handleAnalyze}
                            disabled={analyzing || !companyName.trim()}
                        >
                            {analyzing ? (
                                <>
                                    <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                                    Analyse en cours...
                                </>
                            ) : (
                                <>
                                    <Search className="mr-2 h-4 w-4" />
                                    Analyser
                                </>
                            )}
                        </Button>
                    </CardContent>
                </Card>

                {/* Score Card */}
                <Card>
                    <CardHeader>
                        <CardTitle className="flex items-center gap-2">
                            <TrendingUp className="h-5 w-5" />
                            Score d'intérêt
                        </CardTitle>
                    </CardHeader>
                    <CardContent>
                        {result ? (
                            <div className="text-center py-4">
                                <div className={`inline-flex items-center justify-center w-24 h-24 rounded-full text-3xl font-bold ${getScoreColor(result.interestScore)}`}>
                                    {result.interestScore}
                                </div>
                                <p className="text-sm text-muted-foreground mt-2">sur 100</p>
                                <div className="mt-4">
                                    {result.interestScore >= 70 && (
                                        <Badge className="bg-green-100 text-green-700">Fort potentiel</Badge>
                                    )}
                                    {result.interestScore >= 40 && result.interestScore < 70 && (
                                        <Badge className="bg-yellow-100 text-yellow-700">Potentiel moyen</Badge>
                                    )}
                                    {result.interestScore < 40 && (
                                        <Badge className="bg-red-100 text-red-700">Faible potentiel</Badge>
                                    )}
                                </div>
                            </div>
                        ) : (
                            <div className="flex flex-col items-center justify-center py-8 text-center text-muted-foreground">
                                <Target className="h-12 w-12 mb-4 opacity-50" />
                                <p>Lancez une analyse pour voir le score</p>
                            </div>
                        )}
                    </CardContent>
                </Card>
            </div>

            {/* Results */}
            {result && (
                <div className="space-y-6">
                    {/* Summary */}
                    <Card>
                        <CardHeader>
                            <CardTitle className="flex items-center gap-2">
                                <CheckCircle className="h-5 w-5 text-green-600" />
                                Résumé de l'analyse
                            </CardTitle>
                        </CardHeader>
                        <CardContent>
                            <p className="text-muted-foreground">{result.summary}</p>
                        </CardContent>
                    </Card>

                    <div className="grid gap-6 lg:grid-cols-2">
                        {/* Pain Points */}
                        <Card>
                            <CardHeader>
                                <CardTitle className="flex items-center gap-2">
                                    <AlertTriangle className="h-5 w-5 text-yellow-600" />
                                    Points de douleur identifiés
                                </CardTitle>
                            </CardHeader>
                            <CardContent>
                                <ul className="space-y-2">
                                    {result.painPoints.map((point, i) => (
                                        <li key={i} className="flex items-start gap-2">
                                            <span className="text-yellow-600 mt-1">•</span>
                                            <span className="text-muted-foreground">{point}</span>
                                        </li>
                                    ))}
                                </ul>
                            </CardContent>
                        </Card>

                        {/* Opportunities */}
                        <Card>
                            <CardHeader>
                                <CardTitle className="flex items-center gap-2">
                                    <Lightbulb className="h-5 w-5 text-blue-600" />
                                    Opportunités commerciales
                                </CardTitle>
                            </CardHeader>
                            <CardContent>
                                <ul className="space-y-2">
                                    {result.opportunities.map((opp, i) => (
                                        <li key={i} className="flex items-start gap-2">
                                            <span className="text-blue-600 mt-1">•</span>
                                            <span className="text-muted-foreground">{opp}</span>
                                        </li>
                                    ))}
                                </ul>
                            </CardContent>
                        </Card>
                    </div>

                    {/* Recommended Approach */}
                    <Card>
                        <CardHeader>
                            <CardTitle className="flex items-center gap-2">
                                <Target className="h-5 w-5 text-primary" />
                                Approche recommandée
                            </CardTitle>
                        </CardHeader>
                        <CardContent>
                            <p className="text-muted-foreground">{result.recommendedApproach}</p>

                            <Separator className="my-4" />

                            <div className="flex gap-2">
                                <Button variant="outline">
                                    Ajouter comme prospect
                                </Button>
                                <Button>
                                    Générer un message
                                </Button>
                            </div>
                        </CardContent>
                    </Card>
                </div>
            )}
        </div>
    );
}
