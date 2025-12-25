import { useState, useEffect } from 'react';
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Badge } from '@/components/ui/badge';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Checkbox } from '@/components/ui/checkbox';
import { toast } from 'sonner';
import {
    Loader2, Play, MapPin, Globe, Video, MessageSquare,
    ShoppingCart, Briefcase, Database, Save, Search,
    ExternalLink, Phone, Mail, Star, CheckSquare, Square
} from 'lucide-react';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';

interface Actor {
    id: string;
    name: string;
    description: string;
}

interface RunResult {
    success: boolean;
    data?: any[];
    error?: string;
    source?: string;
    actorId?: string;
    runId?: string;
}

export function ApifyActorsPage() {
    const [actors, setActors] = useState<Actor[]>([]);
    const [loading, setLoading] = useState(true);
    const [selectedActor, setSelectedActor] = useState<Actor | null>(null);
    const [runDialogOpen, setRunDialogOpen] = useState(false);
    const [running, setRunning] = useState(false);
    const [runResult, setRunResult] = useState<RunResult | null>(null);
    const [saving, setSaving] = useState(false);
    const [lists, setLists] = useState<any[]>([]);
    const [selectedListId, setSelectedListId] = useState<string>('');
    const [selectedItems, setSelectedItems] = useState<Set<number>>(new Set());

    // Input states
    const [query, setQuery] = useState('');
    const [location, setLocation] = useState('');
    const [url, setUrl] = useState('');
    const [maxResults, setMaxResults] = useState(20);

    useEffect(() => {
        fetchActors();
        fetchLists();
    }, []);

    async function fetchActors() {
        try {
            const response = await fetch('/api/apify/actors');
            const data = await response.json();
            if (data.success) {
                setActors(data.data);
            } else {
                toast.error('Erreur lors du chargement des acteurs');
            }
        } catch {
            toast.error('Erreur de connexion au serveur');
        } finally {
            setLoading(false);
        }
    }

    async function fetchLists() {
        try {
            const response = await fetch('/api/lists');
            const data = await response.json();
            if (data.success) {
                setLists(data.data);
            }
        } catch (error) {
            console.error('Error fetching lists:', error);
        }
    }

    function getIconForActor(actorId: string) {
        if (actorId.includes('google-maps')) return <MapPin className="h-6 w-6 text-blue-500" />;
        if (actorId.includes('youtube')) return <Video className="h-6 w-6 text-red-500" />;
        if (actorId.includes('tiktok')) return <Video className="h-6 w-6 text-black" />;
        if (actorId.includes('instagram')) return <Video className="h-6 w-6 text-pink-600" />;
        if (actorId.includes('facebook')) return <MessageSquare className="h-6 w-6 text-blue-600" />;
        if (actorId.includes('twitter')) return <MessageSquare className="h-6 w-6 text-sky-500" />;
        if (actorId.includes('amazon')) return <ShoppingCart className="h-6 w-6 text-orange-500" />;
        if (actorId.includes('indeed')) return <Briefcase className="h-6 w-6 text-blue-800" />;
        if (actorId.includes('website')) return <Globe className="h-6 w-6 text-green-600" />;
        if (actorId.includes('linkedin')) return <Briefcase className="h-6 w-6 text-blue-700" />;
        return <Database className="h-6 w-6 text-gray-500" />;
    }

    function getCategoryForActor(actorId: string): string {
        if (actorId.includes('google') || actorId.includes('maps')) return 'Business';
        if (actorId.includes('linkedin') || actorId.includes('indeed')) return 'Professional';
        if (['youtube', 'tiktok', 'instagram', 'facebook', 'twitter'].some(s => actorId.includes(s))) return 'Social';
        return 'Other';
    }

    function openRunDialog(actor: Actor) {
        setSelectedActor(actor);
        setRunResult(null);
        setQuery('');
        setLocation('');
        setUrl('');
        setSelectedItems(new Set());
        setRunDialogOpen(true);
    }

    async function handleRunActor() {
        if (!selectedActor) return;

        setRunning(true);
        setRunResult(null);
        setSelectedItems(new Set());

        let input: any = {};
        if (selectedActor.id === 'google-maps-scraper' || selectedActor.id === 'indeed-scraper') {
            input = { searchQuery: query, query, location, maxResults };
        } else if (selectedActor.id.includes('website') || selectedActor.id.includes('facebook')) {
            input = { url, maxResults };
        } else {
            input = { query, maxResults };
        }

        try {
            const response = await fetch('/api/apify/run', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    actorId: selectedActor.id,
                    input
                })
            });

            const data = await response.json();
            setRunResult(data);

            if (data.success) {
                toast.success(`Extraction terminée : ${data.data?.length || 0} résultats`);
                // Select all by default
                if (data.data) {
                    setSelectedItems(new Set(data.data.map((_: any, i: number) => i)));
                }
            } else {
                toast.error(`Erreur: ${data.error}`);
            }

        } catch {
            toast.error('Erreur lors de l\'exécution');
        } finally {
            setRunning(false);
        }
    }

    function toggleItemSelection(index: number) {
        setSelectedItems(prev => {
            const newSet = new Set(prev);
            if (newSet.has(index)) {
                newSet.delete(index);
            } else {
                newSet.add(index);
            }
            return newSet;
        });
    }

    function toggleSelectAll() {
        if (!runResult?.data) return;
        if (selectedItems.size === runResult.data.length) {
            setSelectedItems(new Set());
        } else {
            setSelectedItems(new Set(runResult.data.map((_, i) => i)));
        }
    }

    async function handleSaveToProspects() {
        if (!runResult?.data || !Array.isArray(runResult.data) || selectedItems.size === 0) {
            toast.error('Sélectionnez au moins un résultat');
            return;
        }

        setSaving(true);
        try {
            const itemsToSave = runResult.data.filter((_, i) => selectedItems.has(i));

            const prospectsToSave = itemsToSave.map((item: any) => {
                if (selectedActor?.id === 'google-maps-scraper') {
                    return {
                        entreprise: item.name || item.title,
                        telephone: item.phone,
                        adresse: item.address,
                        siteWeb: item.website,
                        email: item.email,
                        notes: `Rating: ${item.rating || 'N/A'} | Reviews: ${item.reviewCount || 0}\nCategory: ${item.category || 'N/A'}`,
                        source: 'google_maps',
                        interestScore: item.rating ? Math.round(item.rating * 20) : 50
                    };
                } else if (selectedActor?.id === 'indeed-scraper') {
                    return {
                        entreprise: item.company || item.companyName,
                        poste: item.positionName || item.title,
                        adresse: item.location,
                        siteWeb: item.url,
                        source: 'indeed',
                        notes: `Job: ${item.title}\nSalary: ${item.salary || 'N/A'}`
                    };
                } else if (selectedActor?.id === 'linkedin-profile-scraper') {
                    return {
                        prenom: item.firstName,
                        nom: item.lastName,
                        poste: item.headline || item.jobTitle,
                        adresse: item.location,
                        linkedin: item.publicIdentifier ? `https://linkedin.com/in/${item.publicIdentifier}` : item.url,
                        source: 'linkedin',
                        notes: item.summary?.substring(0, 500)
                    };
                } else {
                    return {
                        entreprise: item.title || item.name || item.companyName || 'Inconnu',
                        siteWeb: item.url || item.website,
                        notes: `Source: ${selectedActor?.name}\n${JSON.stringify(item).substring(0, 300)}`,
                        source: `apify_${selectedActor?.id}`
                    };
                }
            });

            const response = await fetch('/api/prospects/batch', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ prospects: prospectsToSave })
            });

            const data = await response.json();

            if (data.success) {
                const newProspectIds = data.data.map((p: any) => p.id);

                if (selectedListId && newProspectIds.length > 0) {
                    await fetch(`/api/lists/${selectedListId}/prospects`, {
                        method: 'POST',
                        headers: { 'Content-Type': 'application/json' },
                        body: JSON.stringify({ prospectIds: newProspectIds })
                    });
                    const listName = lists.find(l => l.id === selectedListId)?.name || 'la liste';
                    toast.success(`${data.imported} prospects ajoutés à "${listName}"`);
                } else {
                    toast.success(`${data.imported} prospects sauvegardés`);
                }

                setRunDialogOpen(false);
            } else {
                toast.error(`Erreur: ${data.error}`);
            }

        } catch {
            toast.error('Erreur lors de la sauvegarde');
        } finally {
            setSaving(false);
        }
    }

    // Specialized result renderers
    function renderGoogleMapsResults(data: any[]) {
        return (
            <div className="space-y-3">
                {data.map((item, i) => (
                    <div
                        key={i}
                        className={`p-4 border rounded-lg transition-all cursor-pointer ${selectedItems.has(i)
                                ? 'border-primary bg-primary/5 shadow-sm'
                                : 'border-border hover:border-muted-foreground/50'
                            }`}
                        onClick={() => toggleItemSelection(i)}
                    >
                        <div className="flex items-start gap-3">
                            <div className="pt-1">
                                {selectedItems.has(i) ? (
                                    <CheckSquare className="h-5 w-5 text-primary" />
                                ) : (
                                    <Square className="h-5 w-5 text-muted-foreground" />
                                )}
                            </div>
                            <div className="flex-1 min-w-0">
                                <div className="flex items-start justify-between gap-2">
                                    <h4 className="font-semibold text-base truncate">{item.name || item.title}</h4>
                                    {item.rating && (
                                        <div className="flex items-center gap-1 shrink-0">
                                            <Star className="h-4 w-4 fill-yellow-400 text-yellow-400" />
                                            <span className="text-sm font-medium">{item.rating}</span>
                                            <span className="text-xs text-muted-foreground">({item.reviewCount || 0})</span>
                                        </div>
                                    )}
                                </div>
                                <p className="text-sm text-muted-foreground mt-1 truncate">{item.address}</p>
                                <div className="flex items-center gap-4 mt-2 text-sm">
                                    {item.phone && (
                                        <span className="flex items-center gap-1 text-muted-foreground">
                                            <Phone className="h-3 w-3" /> {item.phone}
                                        </span>
                                    )}
                                    {item.website && (
                                        <a
                                            href={item.website}
                                            target="_blank"
                                            rel="noreferrer"
                                            className="flex items-center gap-1 text-blue-600 hover:underline"
                                            onClick={(e) => e.stopPropagation()}
                                        >
                                            <ExternalLink className="h-3 w-3" /> Site web
                                        </a>
                                    )}
                                </div>
                            </div>
                        </div>
                    </div>
                ))}
            </div>
        );
    }

    function renderSocialMediaResults(data: any[]) {
        return (
            <div className="grid grid-cols-1 gap-3">
                {data.map((item, i) => (
                    <div
                        key={i}
                        className={`p-4 border rounded-lg transition-all cursor-pointer ${selectedItems.has(i)
                                ? 'border-primary bg-primary/5'
                                : 'border-border hover:border-muted-foreground/50'
                            }`}
                        onClick={() => toggleItemSelection(i)}
                    >
                        <div className="flex items-start gap-3">
                            <div className="pt-1">
                                {selectedItems.has(i) ? (
                                    <CheckSquare className="h-5 w-5 text-primary" />
                                ) : (
                                    <Square className="h-5 w-5 text-muted-foreground" />
                                )}
                            </div>
                            {item.thumbnailUrl && (
                                <img
                                    src={item.thumbnailUrl}
                                    alt=""
                                    className="w-20 h-20 object-cover rounded-md shrink-0"
                                />
                            )}
                            <div className="flex-1 min-w-0">
                                <h4 className="font-medium line-clamp-2">
                                    {item.text || item.caption || item.title || 'Post'}
                                </h4>
                                <p className="text-xs text-muted-foreground mt-1">
                                    {item.timestamp ? new Date(item.timestamp).toLocaleDateString('fr-FR') : ''}
                                </p>
                                {item.url && (
                                    <a
                                        href={item.url}
                                        target="_blank"
                                        rel="noreferrer"
                                        className="text-blue-600 text-sm hover:underline mt-2 inline-block"
                                        onClick={(e) => e.stopPropagation()}
                                    >
                                        Voir le post →
                                    </a>
                                )}
                            </div>
                        </div>
                    </div>
                ))}
            </div>
        );
    }

    function renderGenericResults(data: any[]) {
        if (!data || data.length === 0) return <p className="text-muted-foreground">Aucun résultat</p>;
        const keys = Object.keys(data[0]).filter(k => !k.startsWith('_')).slice(0, 5);

        return (
            <Table>
                <TableHeader>
                    <TableRow>
                        <TableHead className="w-10">
                            <Checkbox
                                checked={selectedItems.size === data.length}
                                onCheckedChange={toggleSelectAll}
                            />
                        </TableHead>
                        {keys.map(k => <TableHead key={k} className="capitalize">{k}</TableHead>)}
                    </TableRow>
                </TableHeader>
                <TableBody>
                    {data.slice(0, 50).map((item, i) => (
                        <TableRow
                            key={i}
                            className={`cursor-pointer ${selectedItems.has(i) ? 'bg-primary/5' : ''}`}
                            onClick={() => toggleItemSelection(i)}
                        >
                            <TableCell>
                                <Checkbox checked={selectedItems.has(i)} />
                            </TableCell>
                            {keys.map(k => (
                                <TableCell key={k} className="max-w-[180px] truncate">
                                    {typeof item[k] === 'object' ? JSON.stringify(item[k]) : String(item[k] ?? '')}
                                </TableCell>
                            ))}
                        </TableRow>
                    ))}
                </TableBody>
            </Table>
        );
    }

    // Group actors by category
    const groupedActors = actors.reduce((acc, actor) => {
        const category = getCategoryForActor(actor.id);
        if (!acc[category]) acc[category] = [];
        acc[category].push(actor);
        return acc;
    }, {} as Record<string, Actor[]>);

    return (
        <div className="container mx-auto py-8 px-4 space-y-8">
            {/* Header */}
            <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
                <div>
                    <h1 className="text-3xl font-bold tracking-tight">Outils Apify</h1>
                    <p className="text-muted-foreground mt-1">
                        Extrayez des données de Google Maps, LinkedIn, réseaux sociaux et plus encore.
                    </p>
                </div>
                <Badge variant="outline" className="text-sm w-fit">
                    {actors.length} outils disponibles
                </Badge>
            </div>

            {loading ? (
                <div className="flex flex-col items-center justify-center py-16 gap-4">
                    <Loader2 className="h-10 w-10 animate-spin text-primary" />
                    <p className="text-muted-foreground">Chargement des outils...</p>
                </div>
            ) : (
                <div className="space-y-8">
                    {Object.entries(groupedActors).map(([category, categoryActors]) => (
                        <div key={category}>
                            <h2 className="text-lg font-semibold mb-4 flex items-center gap-2">
                                {category === 'Business' && <MapPin className="h-5 w-5 text-blue-500" />}
                                {category === 'Professional' && <Briefcase className="h-5 w-5 text-blue-700" />}
                                {category === 'Social' && <Video className="h-5 w-5 text-pink-500" />}
                                {category === 'Other' && <Database className="h-5 w-5 text-gray-500" />}
                                {category}
                            </h2>
                            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
                                {categoryActors.map((actor) => (
                                    <Card
                                        key={actor.id}
                                        className="group hover:shadow-lg transition-all duration-200 hover:border-primary/50"
                                    >
                                        <CardHeader className="pb-3">
                                            <div className="flex items-center gap-3">
                                                <div className="p-2.5 bg-muted rounded-lg group-hover:bg-primary/10 transition-colors">
                                                    {getIconForActor(actor.id)}
                                                </div>
                                                <div className="min-w-0">
                                                    <CardTitle className="text-base truncate">{actor.name}</CardTitle>
                                                </div>
                                            </div>
                                        </CardHeader>
                                        <CardContent className="pb-3">
                                            <p className="text-sm text-muted-foreground line-clamp-2 min-h-[40px]">
                                                {actor.description}
                                            </p>
                                        </CardContent>
                                        <CardFooter className="pt-0">
                                            <Button
                                                className="w-full group-hover:bg-primary group-hover:text-primary-foreground transition-colors"
                                                variant="outline"
                                                onClick={() => openRunDialog(actor)}
                                            >
                                                <Play className="mr-2 h-4 w-4" />
                                                Lancer
                                            </Button>
                                        </CardFooter>
                                    </Card>
                                ))}
                            </div>
                        </div>
                    ))}
                </div>
            )}

            {/* Run Dialog */}
            <Dialog open={runDialogOpen} onOpenChange={setRunDialogOpen}>
                <DialogContent className="sm:max-w-[1000px] max-h-[90vh] overflow-hidden flex flex-col">
                    <DialogHeader className="shrink-0">
                        <DialogTitle className="flex items-center gap-3">
                            {selectedActor && getIconForActor(selectedActor.id)}
                            {selectedActor?.name}
                        </DialogTitle>
                    </DialogHeader>

                    {!runResult ? (
                        <div className="space-y-5 py-4">
                            {/* Input fields based on actor type */}
                            {selectedActor?.id === 'google-maps-scraper' || selectedActor?.id === 'indeed-scraper' ? (
                                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                                    <div className="space-y-2">
                                        <Label>Recherche</Label>
                                        <div className="relative">
                                            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                                            <Input
                                                className="pl-9"
                                                placeholder="Ex: Restaurants, Agences marketing..."
                                                value={query}
                                                onChange={(e) => setQuery(e.target.value)}
                                            />
                                        </div>
                                    </div>
                                    <div className="space-y-2">
                                        <Label>Lieu</Label>
                                        <div className="relative">
                                            <MapPin className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                                            <Input
                                                className="pl-9"
                                                placeholder="Ex: Paris, France"
                                                value={location}
                                                onChange={(e) => setLocation(e.target.value)}
                                            />
                                        </div>
                                    </div>
                                </div>
                            ) : selectedActor?.id.includes('website') || selectedActor?.id === 'facebook-posts-scraper' ? (
                                <div className="space-y-2">
                                    <Label>URL Cible</Label>
                                    <div className="relative">
                                        <Globe className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                                        <Input
                                            className="pl-9"
                                            placeholder="https://example.com"
                                            value={url}
                                            onChange={(e) => setUrl(e.target.value)}
                                        />
                                    </div>
                                </div>
                            ) : (
                                <div className="space-y-2">
                                    <Label>Recherche / Hashtag / Profil</Label>
                                    <div className="relative">
                                        <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                                        <Input
                                            className="pl-9"
                                            placeholder="Terme de recherche, #hashtag, @profil..."
                                            value={query}
                                            onChange={(e) => setQuery(e.target.value)}
                                        />
                                    </div>
                                </div>
                            )}

                            {/* Max results */}
                            <div className="space-y-2">
                                <Label>Nombre maximum de résultats</Label>
                                <Input
                                    type="number"
                                    min={1}
                                    max={100}
                                    value={maxResults}
                                    onChange={(e) => setMaxResults(parseInt(e.target.value) || 20)}
                                    className="w-32"
                                />
                            </div>

                            <div className="flex justify-end gap-3 pt-4 border-t">
                                <Button variant="outline" onClick={() => setRunDialogOpen(false)}>
                                    Annuler
                                </Button>
                                <Button onClick={handleRunActor} disabled={running} size="lg">
                                    {running ? (
                                        <>
                                            <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                                            Extraction en cours...
                                        </>
                                    ) : (
                                        <>
                                            <Play className="mr-2 h-4 w-4" />
                                            Lancer l'extraction
                                        </>
                                    )}
                                </Button>
                            </div>
                        </div>
                    ) : (
                        <div className="flex flex-col flex-1 min-h-0 gap-4">
                            {/* Results header */}
                            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 shrink-0">
                                <div className="flex items-center gap-3">
                                    {runResult.success ? (
                                        <Badge className="bg-green-100 text-green-800 hover:bg-green-100">
                                            Succès
                                        </Badge>
                                    ) : (
                                        <Badge variant="destructive">Erreur</Badge>
                                    )}
                                    <span className="font-medium">
                                        {runResult.data?.length || 0} résultats
                                    </span>
                                    {runResult.data && runResult.data.length > 0 && (
                                        <Button
                                            variant="ghost"
                                            size="sm"
                                            onClick={toggleSelectAll}
                                            className="text-xs"
                                        >
                                            {selectedItems.size === runResult.data.length ? 'Tout désélectionner' : 'Tout sélectionner'}
                                        </Button>
                                    )}
                                </div>

                                {runResult.success && runResult.data && runResult.data.length > 0 && (
                                    <div className="flex items-center gap-2">
                                        <select
                                            className="h-9 rounded-md border border-input bg-background px-3 py-1 text-sm"
                                            value={selectedListId}
                                            onChange={(e) => setSelectedListId(e.target.value)}
                                        >
                                            <option value="">Tous les prospects</option>
                                            {lists.map(list => (
                                                <option key={list.id} value={list.id}>
                                                    📁 {list.name}
                                                </option>
                                            ))}
                                        </select>
                                        <Button
                                            onClick={handleSaveToProspects}
                                            disabled={saving || selectedItems.size === 0}
                                        >
                                            {saving ? (
                                                <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                                            ) : (
                                                <Save className="mr-2 h-4 w-4" />
                                            )}
                                            Sauvegarder ({selectedItems.size})
                                        </Button>
                                    </div>
                                )}
                            </div>

                            {runResult.error && (
                                <div className="p-4 bg-destructive/10 border border-destructive/20 rounded-lg">
                                    <p className="text-destructive text-sm">{runResult.error}</p>
                                </div>
                            )}

                            {/* Results list */}
                            {runResult.data && (
                                <ScrollArea className="flex-1 border rounded-lg p-4">
                                    {selectedActor?.id === 'google-maps-scraper' ? (
                                        renderGoogleMapsResults(runResult.data)
                                    ) : ['tiktok-scraper', 'instagram-scraper', 'facebook-posts-scraper', 'youtube-scraper'].includes(selectedActor?.id || '') ? (
                                        renderSocialMediaResults(runResult.data)
                                    ) : (
                                        renderGenericResults(runResult.data)
                                    )}
                                </ScrollArea>
                            )}

                            <div className="flex justify-between pt-2 border-t shrink-0">
                                <Button variant="ghost" onClick={() => setRunResult(null)}>
                                    ← Nouvelle recherche
                                </Button>
                                <Button variant="outline" onClick={() => setRunDialogOpen(false)}>
                                    Fermer
                                </Button>
                            </div>
                        </div>
                    )}
                </DialogContent>
            </Dialog>
        </div>
    );
}
