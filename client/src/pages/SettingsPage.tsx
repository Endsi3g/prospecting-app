import { useEffect, useState } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Switch } from '@/components/ui/switch';
import { Slider } from '@/components/ui/slider';
import {
    Bot,
    Palette,
    Bell,
    Download,
    Database,
    Save,
    Loader2,
    CheckCircle,
    XCircle
} from 'lucide-react';
import { settingsApi, llmApi, type Settings } from '@/api/client';
import { toast } from 'sonner';

export function SettingsPage() {
    const [settings, setSettings] = useState<Settings>({
        llm: { model: 'llama3.2', temperature: 0.7, maxTokens: 1000 },
        appearance: { darkMode: false },
        notifications: { enabled: true, importComplete: true, messageGenerated: true, campaignUpdates: true },
        export: { format: 'xlsx', includeMessages: true },
    });
    const [loading, setLoading] = useState(true);
    const [saving, setSaving] = useState(false);
    const [testingLLM, setTestingLLM] = useState(false);
    const [llmStatus, setLlmStatus] = useState<'idle' | 'success' | 'error'>('idle');

    useEffect(() => {
        async function loadSettings() {
            try {
                const result = await settingsApi.get();
                if (result.data) {
                    // Merge with defaults to ensure all properties exist
                    setSettings(prev => ({
                        llm: { ...prev.llm, ...result.data.llm },
                        appearance: { ...prev.appearance, ...result.data.appearance },
                        notifications: { ...prev.notifications, ...result.data.notifications },
                        export: { ...prev.export, ...result.data.export },
                    }));
                }
            } catch (error) {
                console.error('Error loading settings:', error);
            } finally {
                setLoading(false);
            }
        }
        loadSettings();
    }, []);

    async function handleSave() {
        setSaving(true);
        try {
            await settingsApi.update(settings);
            toast.success('Paramètres enregistrés');

            // Apply dark mode
            if (settings.appearance.darkMode) {
                document.documentElement.classList.add('dark');
            } else {
                document.documentElement.classList.remove('dark');
            }
        } catch {
            toast.error('Erreur lors de la sauvegarde');
        } finally {
            setSaving(false);
        }
    }

    async function handleTestLLM() {
        setTestingLLM(true);
        setLlmStatus('idle');
        try {
            await llmApi.test();
            setLlmStatus('success');
            toast.success('Connexion LLM réussie');
        } catch {
            setLlmStatus('error');
            toast.error('Échec de la connexion LLM');
        } finally {
            setTestingLLM(false);
        }
    }

    if (loading) {
        return (
            <div className="flex items-center justify-center py-12">
                <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
            </div>
        );
    }

    return (
        <div className="max-w-3xl mx-auto space-y-6">
            {/* Header */}
            <div>
                <h1 className="text-3xl font-bold tracking-tight">Paramètres</h1>
                <p className="text-muted-foreground">Configuration de l'application</p>
            </div>

            {/* LLM Configuration */}
            <Card>
                <CardHeader>
                    <CardTitle className="flex items-center gap-2">
                        <Bot className="h-5 w-5 text-primary" />
                        Configuration LLM
                    </CardTitle>
                    <CardDescription>
                        Configurez le modèle de langage pour la génération de messages
                    </CardDescription>
                </CardHeader>
                <CardContent className="space-y-6">
                    <div className="grid gap-4 md:grid-cols-2">
                        <div className="space-y-2">
                            <Label>Modèle Ollama</Label>
                            <Select
                                value={settings.llm.model}
                                onValueChange={(value) => setSettings({
                                    ...settings,
                                    llm: { ...settings.llm, model: value }
                                })}
                            >
                                <SelectTrigger>
                                    <SelectValue />
                                </SelectTrigger>
                                <SelectContent>
                                    <SelectItem value="llama3.2">Llama 3.2 (Recommandé)</SelectItem>
                                    <SelectItem value="llama3">Llama 3</SelectItem>
                                    <SelectItem value="mistral">Mistral</SelectItem>
                                    <SelectItem value="mixtral">Mixtral</SelectItem>
                                    <SelectItem value="codellama">CodeLlama</SelectItem>
                                </SelectContent>
                            </Select>
                        </div>
                    </div>

                    <div className="space-y-4">
                        <div className="flex items-center justify-between">
                            <Label>Température</Label>
                            <span className="text-sm font-medium text-primary">{settings.llm.temperature}</span>
                        </div>
                        <Slider
                            value={[settings.llm.temperature]}
                            min={0}
                            max={1}
                            step={0.1}
                            onValueChange={([value]) => setSettings({
                                ...settings,
                                llm: { ...settings.llm, temperature: value }
                            })}
                        />
                        <div className="flex justify-between text-xs text-muted-foreground">
                            <span>Précis</span>
                            <span>Créatif</span>
                        </div>
                    </div>

                    <div className="flex items-center gap-4">
                        <Button onClick={handleTestLLM} disabled={testingLLM}>
                            {testingLLM && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                            Tester la connexion
                        </Button>
                        {llmStatus === 'success' && (
                            <div className="flex items-center text-green-600 text-sm">
                                <CheckCircle className="mr-1 h-4 w-4" />
                                Connexion réussie
                            </div>
                        )}
                        {llmStatus === 'error' && (
                            <div className="flex items-center text-red-600 text-sm">
                                <XCircle className="mr-1 h-4 w-4" />
                                Échec de la connexion
                            </div>
                        )}
                    </div>
                </CardContent>
            </Card>

            {/* Appearance */}
            <Card>
                <CardHeader>
                    <CardTitle className="flex items-center gap-2">
                        <Palette className="h-5 w-5 text-purple-500" />
                        Apparence
                    </CardTitle>
                </CardHeader>
                <CardContent>
                    <div className="flex items-center justify-between">
                        <div>
                            <Label>Mode sombre</Label>
                            <p className="text-sm text-muted-foreground">
                                Interface adaptée pour une utilisation nocturne
                            </p>
                        </div>
                        <Switch
                            checked={settings.appearance.darkMode}
                            onCheckedChange={(checked) => setSettings({
                                ...settings,
                                appearance: { ...settings.appearance, darkMode: checked }
                            })}
                        />
                    </div>
                </CardContent>
            </Card>

            {/* Notifications */}
            <Card>
                <CardHeader>
                    <CardTitle className="flex items-center gap-2">
                        <Bell className="h-5 w-5 text-amber-500" />
                        Notifications
                    </CardTitle>
                </CardHeader>
                <CardContent className="space-y-4">
                    <div className="flex items-center justify-between">
                        <Label>Import de prospects terminé</Label>
                        <Switch
                            checked={settings.notifications.importComplete}
                            onCheckedChange={(checked) => setSettings({
                                ...settings,
                                notifications: { ...settings.notifications, importComplete: checked }
                            })}
                        />
                    </div>
                    <div className="flex items-center justify-between">
                        <Label>Génération de messages terminée</Label>
                        <Switch
                            checked={settings.notifications.messageGenerated}
                            onCheckedChange={(checked) => setSettings({
                                ...settings,
                                notifications: { ...settings.notifications, messageGenerated: checked }
                            })}
                        />
                    </div>
                    <div className="flex items-center justify-between">
                        <Label>Mises à jour de campagne</Label>
                        <Switch
                            checked={settings.notifications.campaignUpdates}
                            onCheckedChange={(checked) => setSettings({
                                ...settings,
                                notifications: { ...settings.notifications, campaignUpdates: checked }
                            })}
                        />
                    </div>
                </CardContent>
            </Card>

            {/* Export Preferences */}
            <Card>
                <CardHeader>
                    <CardTitle className="flex items-center gap-2">
                        <Download className="h-5 w-5 text-green-500" />
                        Préférences d'export
                    </CardTitle>
                </CardHeader>
                <CardContent className="space-y-4">
                    <div className="space-y-2">
                        <Label>Format par défaut</Label>
                        <Select
                            value={settings.export.format}
                            onValueChange={(value) => setSettings({
                                ...settings,
                                export: { ...settings.export, format: value }
                            })}
                        >
                            <SelectTrigger className="w-48">
                                <SelectValue />
                            </SelectTrigger>
                            <SelectContent>
                                <SelectItem value="xlsx">Excel (.xlsx)</SelectItem>
                                <SelectItem value="csv">CSV (.csv)</SelectItem>
                            </SelectContent>
                        </Select>
                    </div>
                    <div className="flex items-center justify-between">
                        <Label>Inclure les messages générés par défaut</Label>
                        <Switch
                            checked={settings.export.includeMessages}
                            onCheckedChange={(checked) => setSettings({
                                ...settings,
                                export: { ...settings.export, includeMessages: checked }
                            })}
                        />
                    </div>
                </CardContent>
            </Card>

            {/* Apify Configuration */}
            <Card>
                <CardHeader>
                    <CardTitle className="flex items-center gap-2">
                        <Database className="h-5 w-5 text-cyan-500" />
                        Apify (Web Scraping)
                    </CardTitle>
                    <CardDescription>
                        Configurez l'intégration Apify pour la recherche de prospects
                    </CardDescription>
                </CardHeader>
                <CardContent className="space-y-4">
                    <div className="space-y-2">
                        <Label htmlFor="apify-key">Clé API Apify</Label>
                        <Input
                            id="apify-key"
                            type="password"
                            placeholder="apify_api_xxxxxxxx"
                            value={'apifyApiKey' in settings ? (settings as Settings & { apifyApiKey?: string }).apifyApiKey || '' : ''}
                            onChange={(e) => setSettings({
                                ...settings,
                                apifyApiKey: e.target.value
                            } as Settings & { apifyApiKey?: string })}
                        />
                        <p className="text-xs text-muted-foreground">
                            Obtenez votre clé sur <a href="https://console.apify.com/account/integrations" target="_blank" rel="noopener noreferrer" className="text-primary hover:underline">console.apify.com</a>
                        </p>
                    </div>
                    <div className="p-3 rounded-lg bg-muted/50 text-sm">
                        <p className="font-medium mb-1">Fonctionnalités Apify :</p>
                        <ul className="list-disc list-inside text-muted-foreground space-y-1">
                            <li>Scraping LinkedIn (profils publics)</li>
                            <li>Recherche Google automatisée</li>
                            <li>Extraction de contacts d'entreprise</li>
                            <li>Crawling de sites web</li>
                        </ul>
                    </div>
                </CardContent>
            </Card>

            {/* Data Management */}
            <Card>
                <CardHeader>
                    <CardTitle className="flex items-center gap-2">
                        <Database className="h-5 w-5 text-red-500" />
                        Gestion des données
                    </CardTitle>
                </CardHeader>
                <CardContent>
                    <div className="flex gap-4">
                        <Button variant="outline">
                            <Download className="mr-2 h-4 w-4" />
                            Exporter toutes les données
                        </Button>
                        <Button variant="destructive">
                            Supprimer toutes les données
                        </Button>
                    </div>
                    <p className="text-xs text-muted-foreground mt-2">
                        Attention: la suppression des données est irréversible.
                    </p>
                </CardContent>
            </Card>

            {/* Save Button */}
            <div className="flex justify-end pb-8">
                <Button onClick={handleSave} disabled={saving} size="lg">
                    {saving ? (
                        <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                    ) : (
                        <Save className="mr-2 h-4 w-4" />
                    )}
                    Enregistrer les paramètres
                </Button>
            </div>
        </div>
    );
}
