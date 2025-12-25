import { useState, useEffect } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { Checkbox } from '@/components/ui/checkbox';
import {
    Table,
    TableBody,
    TableCell,
    TableHead,
    TableHeader,
    TableRow,
} from '@/components/ui/table';
import {
    Search,
    MapPin,
    Globe,
    Phone,
    Star,
    ExternalLink,
    Download,
    Loader2,
    AlertCircle,
    CheckCircle2,
    Settings
} from 'lucide-react';
import { searchApi, type GoogleMapsResult } from '@/api/client';
import { toast } from 'sonner';
import { Link } from 'react-router-dom';

export function SearchPage() {
    const [query, setQuery] = useState('');
    const [location, setLocation] = useState('');
    const [maxResults, setMaxResults] = useState(20);
    const [results, setResults] = useState<GoogleMapsResult[]>([]);
    const [selected, setSelected] = useState<Set<string>>(new Set());
    const [searching, setSearching] = useState(false);
    const [importing, setImporting] = useState(false);
    const [isConfigured, setIsConfigured] = useState<boolean | null>(null);
    const [hasWebsite, setHasWebsite] = useState(false);
    const [maxReviews, setMaxReviews] = useState<number | ''>('');

    useEffect(() => {
        checkStatus();
    }, []);

    async function checkStatus() {
        try {
            const response = await searchApi.getStatus();
            setIsConfigured(response.configured);
        } catch {
            setIsConfigured(false);
        }
    }

    async function handleSearch() {
        if (!query.trim() || !location.trim()) {
            toast.error('Veuillez remplir tous les champs');
            return;
        }

        setSearching(true);
        setResults([]);
        setSelected(new Set());



        try {
            const response = await searchApi.googleMaps(query.trim(), location.trim(), maxResults, hasWebsite, maxReviews === '' ? undefined : Number(maxReviews));

            if (response.success && response.data) {
                setResults(response.data);
                toast.success(`${response.data.length} résultats trouvés`);
            } else {
                toast.error(response.error || 'Erreur lors de la recherche');
            }
        } catch {
            toast.error('Erreur de connexion');
        } finally {
            setSearching(false);
        }
    }

    function toggleSelect(id: string) {
        const newSelected = new Set(selected);
        if (newSelected.has(id)) {
            newSelected.delete(id);
        } else {
            newSelected.add(id);
        }
        setSelected(newSelected);
    }

    function toggleSelectAll() {
        if (selected.size === results.length) {
            setSelected(new Set());
        } else {
            setSelected(new Set(results.map(r => r.id)));
        }
    }

    async function handleImport() {
        const selectedResults = results.filter(r => selected.has(r.id));
        if (selectedResults.length === 0) {
            toast.error('Sélectionnez au moins un résultat');
            return;
        }

        setImporting(true);
        try {
            const response = await searchApi.importResults(selectedResults);
            if (response.success) {
                toast.success(`${response.imported} prospects importés`);
                setSelected(new Set());
            } else {
                toast.error('Erreur lors de l\'import');
            }
        } catch {
            toast.error('Erreur de connexion');
        } finally {
            setImporting(false);
        }
    }

    if (isConfigured === false) {
        return (
            <div className="space-y-6">
                <div>
                    <h1 className="text-3xl font-bold tracking-tight">Recherche Google Maps</h1>
                    <p className="text-muted-foreground">Trouvez des prospects sur Google Maps</p>
                </div>

                <Card className="border-amber-200 bg-amber-50 dark:border-amber-900 dark:bg-amber-950/20">
                    <CardContent className="pt-6">
                        <div className="flex items-start gap-4">
                            <AlertCircle className="h-6 w-6 text-amber-600 shrink-0 mt-0.5" />
                            <div className="space-y-3">
                                <div>
                                    <h3 className="font-semibold text-amber-900 dark:text-amber-100">Configuration requise</h3>
                                    <p className="text-sm text-amber-700 dark:text-amber-300">
                                        Vous devez configurer votre clé API Apify pour utiliser cette fonctionnalité.
                                    </p>
                                </div>
                                <Link to="/settings">
                                    <Button variant="outline" className="gap-2">
                                        <Settings className="h-4 w-4" />
                                        Configurer Apify
                                    </Button>
                                </Link>
                            </div>
                        </div>
                    </CardContent>
                </Card>
            </div>
        );
    }

    return (
        <div className="space-y-6">
            <div>
                <h1 className="text-3xl font-bold tracking-tight">Recherche Google Maps</h1>
                <p className="text-muted-foreground">Trouvez des prospects sur Google Maps avec Apify</p>
            </div>

            {/* Search Form */}
            <Card>
                <CardHeader>
                    <CardTitle className="flex items-center gap-2">
                        <MapPin className="h-5 w-5 text-red-500" />
                        Rechercher des entreprises
                    </CardTitle>
                    <CardDescription>
                        Entrez le type d'entreprise et la localisation pour lancer la recherche
                    </CardDescription>
                </CardHeader>
                <CardContent>
                    <div className="flex flex-col md:flex-row gap-4">
                        <div className="flex-1">
                            <Input
                                placeholder="Type d'entreprise (ex: restaurants, plombiers, avocats)"
                                value={query}
                                onChange={(e) => setQuery(e.target.value)}
                                onKeyDown={(e) => e.key === 'Enter' && handleSearch()}
                            />
                        </div>
                        <div className="flex-1">
                            <Input
                                placeholder="Localisation (ex: Paris, France)"
                                value={location}
                                onChange={(e) => setLocation(e.target.value)}
                                onKeyDown={(e) => e.key === 'Enter' && handleSearch()}
                            />
                        </div>
                        <div className="w-32">
                            <Input
                                type="number"
                                placeholder="Max"
                                value={maxResults}
                                onChange={(e) => setMaxResults(parseInt(e.target.value) || 20)}
                                min={1}
                                max={100}
                            />
                        </div>
                        <div className="flex items-center space-x-2">
                            <Checkbox
                                id="has-website"
                                checked={hasWebsite}
                                onCheckedChange={(checked) => setHasWebsite(checked as boolean)}
                            />
                            <label
                                htmlFor="has-website"
                                className="text-sm font-medium leading-none peer-disabled:cursor-not-allowed peer-disabled:opacity-70"
                            >
                                Site Web
                            </label>
                        </div>
                        <div className="w-32">
                            <Input
                                type="number"
                                placeholder="Max Avis"
                                value={maxReviews}
                                onChange={(e) => setMaxReviews(e.target.value === '' ? '' : parseInt(e.target.value))}
                                min={0}
                            />
                        </div>
                        <Button
                            onClick={handleSearch}
                            disabled={searching}
                            className="gap-2"
                        >
                            {searching ? (
                                <Loader2 className="h-4 w-4 animate-spin" />
                            ) : (
                                <Search className="h-4 w-4" />
                            )}
                            {searching ? 'Recherche...' : 'Rechercher'}
                        </Button>
                    </div>
                    {searching && (
                        <div className="mt-4 p-4 rounded-lg bg-blue-50 dark:bg-blue-950/20 border border-blue-200 dark:border-blue-900">
                            <div className="flex items-center gap-3">
                                <Loader2 className="h-5 w-5 animate-spin text-blue-600" />
                                <div>
                                    <p className="font-medium text-blue-900 dark:text-blue-100">
                                        Recherche en cours...
                                    </p>
                                    <p className="text-sm text-blue-700 dark:text-blue-300">
                                        Cette opération peut prendre 1-2 minutes selon le nombre de résultats
                                    </p>
                                </div>
                            </div>
                        </div>
                    )}
                </CardContent>
            </Card>

            {/* Results */}
            {results.length > 0 && (
                <Card>
                    <CardHeader>
                        <div className="flex items-center justify-between">
                            <div>
                                <CardTitle className="flex items-center gap-2">
                                    <CheckCircle2 className="h-5 w-5 text-green-500" />
                                    {results.length} résultats trouvés
                                </CardTitle>
                                <CardDescription>
                                    Sélectionnez les entreprises à importer comme prospects
                                </CardDescription>
                            </div>
                            <div className="flex items-center gap-2">
                                <Badge variant="outline" className="font-normal">
                                    {selected.size} sélectionnés
                                </Badge>
                                <Button
                                    variant="default"
                                    onClick={handleImport}
                                    disabled={selected.size === 0 || importing}
                                    className="gap-2"
                                >
                                    {importing ? (
                                        <Loader2 className="h-4 w-4 animate-spin" />
                                    ) : (
                                        <Download className="h-4 w-4" />
                                    )}
                                    Importer ({selected.size})
                                </Button>
                            </div>
                        </div>
                    </CardHeader>
                    <CardContent>
                        <div className="rounded-md border">
                            <Table>
                                <TableHeader>
                                    <TableRow>
                                        <TableHead className="w-12">
                                            <Checkbox
                                                checked={selected.size === results.length && results.length > 0}
                                                onCheckedChange={toggleSelectAll}
                                            />
                                        </TableHead>
                                        <TableHead>Entreprise</TableHead>
                                        <TableHead>Catégorie</TableHead>
                                        <TableHead>Adresse</TableHead>
                                        <TableHead>Contact</TableHead>
                                        <TableHead>Note</TableHead>
                                        <TableHead className="w-12"></TableHead>
                                    </TableRow>
                                </TableHeader>
                                <TableBody>
                                    {results.map((result) => (
                                        <TableRow key={result.id}>
                                            <TableCell>
                                                <Checkbox
                                                    checked={selected.has(result.id)}
                                                    onCheckedChange={() => toggleSelect(result.id)}
                                                />
                                            </TableCell>
                                            <TableCell>
                                                <div className="font-medium">{result.name}</div>
                                                {result.website && (
                                                    <a
                                                        href={result.website}
                                                        target="_blank"
                                                        rel="noopener noreferrer"
                                                        className="text-xs text-blue-500 hover:underline flex items-center gap-1"
                                                    >
                                                        <Globe className="h-3 w-3" />
                                                        Site web
                                                    </a>
                                                )}
                                            </TableCell>
                                            <TableCell>
                                                <Badge variant="secondary" className="font-normal">
                                                    {result.category || 'Non catégorisé'}
                                                </Badge>
                                            </TableCell>
                                            <TableCell>
                                                <div className="text-sm text-muted-foreground max-w-[200px] truncate">
                                                    {result.address || '-'}
                                                </div>
                                            </TableCell>
                                            <TableCell>
                                                {result.phone ? (
                                                    <div className="flex items-center gap-1 text-sm">
                                                        <Phone className="h-3 w-3" />
                                                        {result.phone}
                                                    </div>
                                                ) : (
                                                    <span className="text-muted-foreground text-sm">-</span>
                                                )}
                                            </TableCell>
                                            <TableCell>
                                                {result.rating ? (
                                                    <div className="flex items-center gap-1">
                                                        <Star className="h-4 w-4 fill-yellow-400 text-yellow-400" />
                                                        <span className="font-medium">{result.rating}</span>
                                                        <span className="text-xs text-muted-foreground">
                                                            ({result.reviewCount})
                                                        </span>
                                                    </div>
                                                ) : (
                                                    <span className="text-muted-foreground text-sm">-</span>
                                                )}
                                            </TableCell>
                                            <TableCell>
                                                {result.googleMapsUrl && (
                                                    <a
                                                        href={result.googleMapsUrl}
                                                        target="_blank"
                                                        rel="noopener noreferrer"
                                                        className="text-muted-foreground hover:text-foreground"
                                                        title="Ouvrir sur Google Maps"
                                                    >
                                                        <ExternalLink className="h-4 w-4" />
                                                    </a>
                                                )}
                                            </TableCell>
                                        </TableRow>
                                    ))}
                                </TableBody>
                            </Table>
                        </div>
                    </CardContent>
                </Card>
            )}
        </div>
    );
}
