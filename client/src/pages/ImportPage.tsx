import { useState, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import {
    Table,
    TableBody,
    TableCell,
    TableHead,
    TableHeader,
    TableRow,
} from '@/components/ui/table';
import { Upload, FileSpreadsheet, CheckCircle, Loader2 } from 'lucide-react';
import { toast } from 'sonner';

export function ImportPage() {
    const [file, setFile] = useState<File | null>(null);
    const [preview, setPreview] = useState<Record<string, string>[]>([]);
    const [headers, setHeaders] = useState<string[]>([]);
    const [loading, setLoading] = useState(false);
    const [importing, setImporting] = useState(false);
    const navigate = useNavigate();

    const handleDrop = useCallback((e: React.DragEvent) => {
        e.preventDefault();
        const droppedFile = e.dataTransfer.files[0];
        if (droppedFile?.name.endsWith('.csv')) {
            setFile(droppedFile);
            loadPreview(droppedFile);
        } else {
            toast.error('Veuillez déposer un fichier CSV');
        }
    }, []);

    const handleFileSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
        const selectedFile = e.target.files?.[0];
        if (selectedFile) {
            setFile(selectedFile);
            loadPreview(selectedFile);
        }
    };

    async function loadPreview(file: File) {
        setLoading(true);
        const formData = new FormData();
        formData.append('file', file);

        try {
            const response = await fetch('/api/prospects/preview', {
                method: 'POST',
                body: formData,
            });
            const data = await response.json();

            if (data.data && data.data.length > 0) {
                setHeaders(Object.keys(data.data[0]));
                setPreview(data.data.slice(0, 5));
            }
        } catch (error) {`r`n            console.error('API error:', error);`r`n            toast.error('Erreur lors de la prévisualisation');
        } finally {
            setLoading(false);
        }
    }

    async function handleImport() {
        if (!file) return;

        setImporting(true);
        const formData = new FormData();
        formData.append('file', file);

        try {
            const response = await fetch('/api/prospects/import', {
                method: 'POST',
                body: formData,
            });
            const data = await response.json();

            if (data.success) {
                toast.success(`${data.imported} prospects importés avec succès`);
                navigate('/prospects');
            } else {
                toast.error(data.error || 'Erreur lors de l\'import');
            }
        } catch (error) {
            console.error('Import failed:', error);
            toast.error('Erreur lors de l\'import');
        } finally { } finally {
            setImporting(false);
        }
    }

    return (
        <div className="max-w-4xl mx-auto space-y-6">
            <div>
                <h1 className="text-3xl font-bold tracking-tight">Importer des prospects</h1>
                <p className="text-muted-foreground">Chargez un fichier CSV avec vos contacts</p>
            </div>

            {/* Drop Zone */}
            <Card>
                <CardContent className="pt-6">
                    <div
                        onDragOver={(e) => e.preventDefault()}
                        onDrop={handleDrop}
                        className={`border-2 border-dashed rounded-xl p-12 text-center transition-colors ${file ? 'border-green-500 bg-green-50' : 'border-muted-foreground/25 hover:border-primary/50'
                            }`}
                    >
                        {loading ? (
                            <div className="flex flex-col items-center gap-4">
                                <Loader2 className="h-12 w-12 animate-spin text-primary" />
                                <p className="text-muted-foreground">Analyse du fichier...</p>
                            </div>
                        ) : file ? (
                            <div className="flex flex-col items-center gap-4">
                                <CheckCircle className="h-12 w-12 text-green-500" />
                                <div>
                                    <p className="font-semibold text-lg">{file.name}</p>
                                    <p className="text-sm text-muted-foreground">
                                        {(file.size / 1024).toFixed(1)} KB
                                    </p>
                                </div>
                                <Button variant="outline" onClick={() => { setFile(null); setPreview([]); }}>
                                    Changer de fichier
                                </Button>
                            </div>
                        ) : (
                            <div className="flex flex-col items-center gap-4">
                                <div className="p-4 rounded-full bg-primary/10">
                                    <Upload className="h-8 w-8 text-primary" />
                                </div>
                                <div>
                                    <p className="font-medium text-lg">Glissez-déposez votre fichier CSV ici</p>
                                    <p className="text-sm text-muted-foreground mt-1">ou cliquez pour sélectionner</p>
                                </div>
                                <input
                                    type="file"
                                    accept=".csv"
                                    onChange={handleFileSelect}
                                    aria-label="Sélectionner un fichier CSV"
                                    className="absolute inset-0 w-full h-full opacity-0 cursor-pointer"
                                />
                                <Button variant="outline" asChild>
                                    <label className="cursor-pointer">
                                        <FileSpreadsheet className="mr-2 h-4 w-4" />
                                        Sélectionner un fichier
                                        <input type="file" accept=".csv" onChange={handleFileSelect} className="hidden" />
                                    </label>
                                </Button>
                            </div>
                        )}
                    </div>
                </CardContent>
            </Card>

            {/* Preview */}
            {preview.length > 0 && (
                <Card>
                    <CardHeader>
                        <CardTitle>Prévisualisation</CardTitle>
                        <CardDescription>{preview.length} premières lignes</CardDescription>
                    </CardHeader>
                    <CardContent>
                        <div className="overflow-x-auto">
                            <Table>
                                <TableHeader>
                                    <TableRow>
                                        {headers.map((h) => (
                                            <TableHead key={h} className="whitespace-nowrap">{h}</TableHead>
                                        ))}
                                    </TableRow>
                                </TableHeader>
                                <TableBody>
                                    {preview.map((row, i) => (
                                        <TableRow key={i}>
                                            {headers.map((h) => (
                                                <TableCell key={h} className="whitespace-nowrap max-w-xs truncate">
                                                    {row[h] || '-'}
                                                </TableCell>
                                            ))}
                                        </TableRow>
                                    ))}
                                </TableBody>
                            </Table>
                        </div>
                    </CardContent>
                </Card>
            )}

            {/* Actions */}
            {file && preview.length > 0 && (
                <div className="flex justify-end gap-4">
                    <Button variant="outline" onClick={() => { setFile(null); setPreview([]); }}>
                        Annuler
                    </Button>
                    <Button onClick={handleImport} disabled={importing}>
                        {importing && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                        Importer les prospects
                    </Button>
                </div>
            )}
        </div>
    );
}
