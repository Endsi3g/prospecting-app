import { useState } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Switch } from '@/components/ui/switch';
import { Download, FileSpreadsheet, FileText, Loader2, CheckCircle } from 'lucide-react';
import { toast } from 'sonner';

export function ExportPage() {
    const [format, setFormat] = useState('xlsx');
    const [includeMessages, setIncludeMessages] = useState(true);
    const [exporting, setExporting] = useState(false);
    const [exported, setExported] = useState(false);

    async function handleExport() {
        setExporting(true);
        setExported(false);

        try {
            const response = await fetch(`/api/export?format=${format}&includeMessages=${includeMessages}`);

            if (!response.ok) {
                throw new Error('Export failed');
            }

            const blob = await response.blob();
            const url = URL.createObjectURL(blob);
            const a = document.createElement('a');
            a.href = url;
            a.download = `prospects_export_${new Date().toISOString().split('T')[0]}.${format}`;
            document.body.appendChild(a);
            a.click();
            document.body.removeChild(a);
            URL.revokeObjectURL(url);

            setExported(true);
            toast.success('Export téléchargé');
        } catch (error) {
            toast.error('Erreur lors de l\'export');
        } finally {
            setExporting(false);
        }
    }

    return (
        <div className="max-w-2xl mx-auto space-y-6">
            <div>
                <h1 className="text-3xl font-bold tracking-tight">Exporter les données</h1>
                <p className="text-muted-foreground">Téléchargez vos prospects et messages</p>
            </div>

            <Card>
                <CardHeader>
                    <CardTitle>Options d'export</CardTitle>
                    <CardDescription>Configurez le format de votre export</CardDescription>
                </CardHeader>
                <CardContent className="space-y-6">
                    {/* Format Selection */}
                    <div className="space-y-2">
                        <Label>Format de fichier</Label>
                        <Select value={format} onValueChange={setFormat}>
                            <SelectTrigger className="w-64">
                                <SelectValue />
                            </SelectTrigger>
                            <SelectContent>
                                <SelectItem value="xlsx">
                                    <div className="flex items-center gap-2">
                                        <FileSpreadsheet className="h-4 w-4 text-green-600" />
                                        Excel (.xlsx)
                                    </div>
                                </SelectItem>
                                <SelectItem value="csv">
                                    <div className="flex items-center gap-2">
                                        <FileText className="h-4 w-4 text-blue-600" />
                                        CSV (.csv)
                                    </div>
                                </SelectItem>
                            </SelectContent>
                        </Select>
                    </div>

                    {/* Options */}
                    <div className="space-y-4">
                        <div className="flex items-center justify-between">
                            <div>
                                <Label>Inclure les messages générés</Label>
                                <p className="text-sm text-muted-foreground">
                                    Ajoute une feuille/colonne avec les messages
                                </p>
                            </div>
                            <Switch
                                checked={includeMessages}
                                onCheckedChange={setIncludeMessages}
                            />
                        </div>
                    </div>

                    {/* Export Summary */}
                    <div className="p-4 rounded-lg bg-muted/50 space-y-2">
                        <h4 className="font-medium">Contenu de l'export</h4>
                        <ul className="text-sm text-muted-foreground space-y-1">
                            <li className="flex items-center gap-2">
                                <CheckCircle className="h-4 w-4 text-green-500" />
                                Tous les prospects avec leurs informations
                            </li>
                            {includeMessages && (
                                <li className="flex items-center gap-2">
                                    <CheckCircle className="h-4 w-4 text-green-500" />
                                    Messages générés pour chaque prospect
                                </li>
                            )}
                        </ul>
                    </div>

                    {/* Export Button */}
                    <Button
                        onClick={handleExport}
                        disabled={exporting}
                        className="w-full"
                        size="lg"
                    >
                        {exporting ? (
                            <>
                                <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                                Export en cours...
                            </>
                        ) : exported ? (
                            <>
                                <CheckCircle className="mr-2 h-4 w-4" />
                                Télécharger à nouveau
                            </>
                        ) : (
                            <>
                                <Download className="mr-2 h-4 w-4" />
                                Exporter les données
                            </>
                        )}
                    </Button>
                </CardContent>
            </Card>
        </div>
    );
}
