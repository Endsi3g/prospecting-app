import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';

import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Checkbox } from '@/components/ui/checkbox';

import { Sparkles, Users, Loader2, CheckCircle } from 'lucide-react';
import { prospectsApi, messagesApi, templatesApi, type Prospect, type Template } from '@/api/client';
import { toast } from 'sonner';

export function GeneratePage() {
    const [prospects, setProspects] = useState<Prospect[]>([]);
    const [templates, setTemplates] = useState<Template[]>([]);
    const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set());
    const [loading, setLoading] = useState(true);
    const [generating, setGenerating] = useState(false);
    const [generatedCount, setGeneratedCount] = useState(0);

    const [config, setConfig] = useState({
        tone: 'professionnel',
        length: 'moyen',
        templateId: '',
    });

    useEffect(() => {
        async function loadData() {
            try {
                const [prospectsRes, templatesRes] = await Promise.all([
                    prospectsApi.getAll(),
                    templatesApi.getAll(),
                ]);
                setProspects(prospectsRes.data || []);
                setTemplates(templatesRes.data || []);
            } catch {
            toast.error('Erreur lors du chargement des données');
            } finally {
                setLoading(false);
            }
        }
        loadData();
    }, []);

    const toggleSelect = (id: string) => {
        const newSet = new Set(selectedIds);
        if (newSet.has(id)) {
            newSet.delete(id);
        } else {
            newSet.add(id);
        }
        setSelectedIds(newSet);
    };

    const selectAll = () => {
        if (selectedIds.size === prospects.length) {
            setSelectedIds(new Set());
        } else {
            setSelectedIds(new Set(prospects.map(p => p.id)));
        }
    };

    async function handleGenerate() {
        if (selectedIds.size === 0) {
            toast.error('Sélectionnez au moins un prospect');
            return;
        }

        setGenerating(true);
        setGeneratedCount(0);

        try {
            const result = await messagesApi.generate({
                prospectIds: Array.from(selectedIds),
                tone: config.tone,
                length: config.length,
                templateId: config.templateId && config.templateId !== 'none' ? config.templateId : undefined,
            });

            setGeneratedCount(result.data?.length || 0);
            toast.success(`${result.data?.length || 0} messages générés`);
        } catch {
            toast.error('Erreur lors de la génération');
        } finally {
            setGenerating(false);
        }
    }

    function getDisplayName(p: Prospect) {
        return `${p.prenom || ''} ${p.nom || ''}`.trim() || p.entreprise || 'Sans nom';
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
                    <h1 className="text-3xl font-bold tracking-tight">Générer des messages</h1>
                    <p className="text-muted-foreground">Créez des messages personnalisés avec l'IA</p>
                </div>
            </div>

            <div className="grid gap-6 lg:grid-cols-3">
                {/* Prospect Selection */}
                <Card className="lg:col-span-2">
                    <CardHeader>
                        <div className="flex items-center justify-between">
                            <div>
                                <CardTitle>Sélectionner les prospects</CardTitle>
                                <CardDescription>{selectedIds.size} sélectionné(s) sur {prospects.length}</CardDescription>
                            </div>
                            <Button variant="outline" size="sm" onClick={selectAll}>
                                {selectedIds.size === prospects.length ? 'Désélectionner tout' : 'Tout sélectionner'}
                            </Button>
                        </div>
                    </CardHeader>
                    <CardContent>
                        {prospects.length === 0 ? (
                            <div className="text-center py-8">
                                <Users className="h-12 w-12 text-muted-foreground/50 mx-auto mb-4" />
                                <p className="text-muted-foreground mb-4">Aucun prospect disponible</p>
                                <Button asChild>
                                    <Link to="/import">Importer des prospects</Link>
                                </Button>
                            </div>
                        ) : (
                            <div className="max-h-96 overflow-y-auto space-y-2">
                                {prospects.map((prospect) => (
                                    <div
                                        key={prospect.id}
                                        onClick={() => toggleSelect(prospect.id)}
                                        className={`flex items-center gap-3 p-3 rounded-lg border cursor-pointer transition-colors ${selectedIds.has(prospect.id)
                                            ? 'bg-primary/5 border-primary'
                                            : 'hover:bg-muted/50'
                                            }`}
                                    >
                                        <Checkbox checked={selectedIds.has(prospect.id)} />
                                        <div className="flex-1 min-w-0">
                                            <p className="font-medium truncate">{getDisplayName(prospect)}</p>
                                            <p className="text-sm text-muted-foreground truncate">
                                                {prospect.email || prospect.entreprise || '-'}
                                            </p>
                                        </div>
                                    </div>
                                ))}
                            </div>
                        )}
                    </CardContent>
                </Card>

                {/* Configuration */}
                <div className="space-y-6">
                    <Card>
                        <CardHeader>
                            <CardTitle>Configuration</CardTitle>
                        </CardHeader>
                        <CardContent className="space-y-4">
                            <div className="space-y-2">
                                <Label>Ton du message</Label>
                                <Select value={config.tone} onValueChange={(v) => setConfig({ ...config, tone: v })}>
                                    <SelectTrigger>
                                        <SelectValue />
                                    </SelectTrigger>
                                    <SelectContent>
                                        <SelectItem value="professionnel">Professionnel</SelectItem>
                                        <SelectItem value="amical">Amical</SelectItem>
                                        <SelectItem value="direct">Direct</SelectItem>
                                        <SelectItem value="formel">Formel</SelectItem>
                                    </SelectContent>
                                </Select>
                            </div>

                            <div className="space-y-2">
                                <Label>Longueur</Label>
                                <Select value={config.length} onValueChange={(v) => setConfig({ ...config, length: v })}>
                                    <SelectTrigger>
                                        <SelectValue />
                                    </SelectTrigger>
                                    <SelectContent>
                                        <SelectItem value="court">Court</SelectItem>
                                        <SelectItem value="moyen">Moyen</SelectItem>
                                        <SelectItem value="long">Long</SelectItem>
                                    </SelectContent>
                                </Select>
                            </div>

                            {templates.length > 0 && (
                                <div className="space-y-2">
                                    <Label>Template (optionnel)</Label>
                                    <Select value={config.templateId} onValueChange={(v) => setConfig({ ...config, templateId: v })}>
                                        <SelectTrigger>
                                            <SelectValue placeholder="Aucun template" />
                                        </SelectTrigger>
                                        <SelectContent>
                                            <SelectItem value="none">Aucun template</SelectItem>
                                            {templates.map((t) => (
                                                <SelectItem key={t.id} value={t.id}>{t.name}</SelectItem>
                                            ))}
                                        </SelectContent>
                                    </Select>
                                </div>
                            )}
                        </CardContent>
                    </Card>

                    {/* Generate Button */}
                    <Button
                        onClick={handleGenerate}
                        disabled={generating || selectedIds.size === 0}
                        className="w-full"
                        size="lg"
                    >
                        {generating ? (
                            <>
                                <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                                Génération en cours...
                            </>
                        ) : (
                            <>
                                <Sparkles className="mr-2 h-4 w-4" />
                                Générer {selectedIds.size} message(s)
                            </>
                        )}
                    </Button>

                    {generatedCount > 0 && (
                        <div className="flex items-center gap-2 p-3 rounded-lg bg-green-50 text-green-700">
                            <CheckCircle className="h-5 w-5" />
                            <span>{generatedCount} messages générés</span>
                            <Button asChild variant="link" className="ml-auto p-0 h-auto text-green-700">
                                <Link to="/messages">Voir les messages</Link>
                            </Button>
                        </div>
                    )}
                </div>
            </div>
        </div>
    );
}
