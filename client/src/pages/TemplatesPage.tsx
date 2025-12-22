import { useEffect, useState } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Badge } from '@/components/ui/badge';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import {
    Dialog,
    DialogContent,
    DialogDescription,
    DialogFooter,
    DialogHeader,
    DialogTitle,
    DialogTrigger,
} from '@/components/ui/dialog';
import {
    DropdownMenu,
    DropdownMenuContent,
    DropdownMenuItem,
    DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import {
    Plus,
    MoreHorizontal,
    Edit,
    Trash2,
    Copy,
    Mail,
    Linkedin,
    MessageSquare,
    FileText,
    Loader2
} from 'lucide-react';
import { templatesApi, type Template } from '@/api/client';
import { toast } from 'sonner';

export function TemplatesPage() {
    const [templates, setTemplates] = useState<Template[]>([]);
    const [loading, setLoading] = useState(true);
    const [saving, setSaving] = useState(false);
    const [dialogOpen, setDialogOpen] = useState(false);
    const [editingTemplate, setEditingTemplate] = useState<Template | null>(null);
    const [form, setForm] = useState({
        name: '',
        content: '',
        channel: 'email' as 'email' | 'linkedin' | 'sms'
    });

    useEffect(() => {
        loadTemplates();
    }, []);

    async function loadTemplates() {
        try {
            const result = await templatesApi.getAll();
            setTemplates(result.data || []);
        } catch (error) {
            toast.error('Erreur lors du chargement');
        } finally {
            setLoading(false);
        }
    }

    function openCreateDialog() {
        setEditingTemplate(null);
        setForm({ name: '', content: '', channel: 'email' });
        setDialogOpen(true);
    }

    function openEditDialog(template: Template) {
        setEditingTemplate(template);
        setForm({
            name: template.name,
            content: template.content,
            channel: template.channel
        });
        setDialogOpen(true);
    }

    async function saveTemplate() {
        if (!form.name.trim() || !form.content.trim()) {
            toast.error('Nom et contenu requis');
            return;
        }

        setSaving(true);
        try {
            if (editingTemplate) {
                await templatesApi.update(editingTemplate.id, form);
                setTemplates(prev => prev.map(t =>
                    t.id === editingTemplate.id ? { ...t, ...form } : t
                ));
                toast.success('Template modifié');
            } else {
                const result = await templatesApi.create(form);
                setTemplates(prev => [result.data, ...prev]);
                toast.success('Template créé');
            }
            setDialogOpen(false);
        } catch (error) {
            toast.error('Erreur lors de la sauvegarde');
        } finally {
            setSaving(false);
        }
    }

    async function deleteTemplate(id: string) {
        if (!confirm('Supprimer ce template ?')) return;
        try {
            await templatesApi.delete(id);
            setTemplates(prev => prev.filter(t => t.id !== id));
            toast.success('Template supprimé');
        } catch (error) {
            toast.error('Erreur lors de la suppression');
        }
    }

    async function duplicateTemplate(template: Template) {
        try {
            const result = await templatesApi.create({
                name: `${template.name} (copie)`,
                content: template.content,
                channel: template.channel,
            });
            setTemplates(prev => [result.data, ...prev]);
            toast.success('Template dupliqué');
        } catch (error) {
            toast.error('Erreur lors de la duplication');
        }
    }

    const channelIcons = {
        email: Mail,
        linkedin: Linkedin,
        sms: MessageSquare,
    };

    const channelLabels = {
        email: 'Email',
        linkedin: 'LinkedIn',
        sms: 'SMS',
    };

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
                    <h1 className="text-3xl font-bold tracking-tight">Templates</h1>
                    <p className="text-muted-foreground">Modèles de messages réutilisables</p>
                </div>
                <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
                    <DialogTrigger asChild>
                        <Button onClick={openCreateDialog}>
                            <Plus className="mr-2 h-4 w-4" />
                            Nouveau template
                        </Button>
                    </DialogTrigger>
                    <DialogContent className="max-w-2xl">
                        <DialogHeader>
                            <DialogTitle>
                                {editingTemplate ? 'Modifier le template' : 'Créer un template'}
                            </DialogTitle>
                            <DialogDescription>
                                Utilisez {'{{prenom}}'}, {'{{nom}}'}, {'{{entreprise}}'} pour les variables
                            </DialogDescription>
                        </DialogHeader>
                        <div className="space-y-4 py-4">
                            <div className="grid grid-cols-2 gap-4">
                                <div className="space-y-2">
                                    <Label>Nom du template</Label>
                                    <Input
                                        placeholder="Ex: Premier contact"
                                        value={form.name}
                                        onChange={(e) => setForm({ ...form, name: e.target.value })}
                                    />
                                </div>
                                <div className="space-y-2">
                                    <Label>Canal</Label>
                                    <Select
                                        value={form.channel}
                                        onValueChange={(v) => setForm({ ...form, channel: v as typeof form.channel })}
                                    >
                                        <SelectTrigger>
                                            <SelectValue />
                                        </SelectTrigger>
                                        <SelectContent>
                                            <SelectItem value="email">Email</SelectItem>
                                            <SelectItem value="linkedin">LinkedIn</SelectItem>
                                            <SelectItem value="sms">SMS</SelectItem>
                                        </SelectContent>
                                    </Select>
                                </div>
                            </div>
                            <div className="space-y-2">
                                <Label>Contenu</Label>
                                <textarea
                                    className="w-full min-h-[200px] p-3 rounded-lg border bg-background resize-none focus:outline-none focus:ring-2 focus:ring-ring"
                                    placeholder="Bonjour {{prenom}},

Je me permets de vous contacter..."
                                    value={form.content}
                                    onChange={(e) => setForm({ ...form, content: e.target.value })}
                                />
                            </div>
                        </div>
                        <DialogFooter>
                            <Button variant="outline" onClick={() => setDialogOpen(false)}>Annuler</Button>
                            <Button onClick={saveTemplate} disabled={saving}>
                                {saving && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                                {editingTemplate ? 'Modifier' : 'Créer'}
                            </Button>
                        </DialogFooter>
                    </DialogContent>
                </Dialog>
            </div>

            {/* Templates List */}
            {templates.length === 0 ? (
                <Card>
                    <CardContent className="flex flex-col items-center justify-center py-12">
                        <FileText className="h-12 w-12 text-muted-foreground/50 mb-4" />
                        <h3 className="text-lg font-semibold mb-2">Aucun template</h3>
                        <p className="text-muted-foreground text-sm mb-4">Créez votre premier modèle de message</p>
                        <Button onClick={openCreateDialog}>
                            <Plus className="mr-2 h-4 w-4" />
                            Créer un template
                        </Button>
                    </CardContent>
                </Card>
            ) : (
                <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
                    {templates.map((template) => {
                        const ChannelIcon = channelIcons[template.channel] || Mail;
                        return (
                            <Card key={template.id} className="hover:shadow-md transition-shadow">
                                <CardHeader>
                                    <div className="flex items-start justify-between">
                                        <div className="flex items-center gap-3">
                                            <div className="p-2 rounded-lg bg-muted">
                                                <ChannelIcon className="h-4 w-4" />
                                            </div>
                                            <div>
                                                <CardTitle className="text-base">{template.name}</CardTitle>
                                                <Badge variant="outline" className="mt-1">
                                                    {channelLabels[template.channel]}
                                                </Badge>
                                            </div>
                                        </div>
                                        <DropdownMenu>
                                            <DropdownMenuTrigger asChild>
                                                <Button variant="ghost" size="icon">
                                                    <MoreHorizontal className="h-4 w-4" />
                                                </Button>
                                            </DropdownMenuTrigger>
                                            <DropdownMenuContent align="end">
                                                <DropdownMenuItem onClick={() => openEditDialog(template)}>
                                                    <Edit className="mr-2 h-4 w-4" />
                                                    Modifier
                                                </DropdownMenuItem>
                                                <DropdownMenuItem onClick={() => duplicateTemplate(template)}>
                                                    <Copy className="mr-2 h-4 w-4" />
                                                    Dupliquer
                                                </DropdownMenuItem>
                                                <DropdownMenuItem
                                                    className="text-destructive"
                                                    onClick={() => deleteTemplate(template.id)}
                                                >
                                                    <Trash2 className="mr-2 h-4 w-4" />
                                                    Supprimer
                                                </DropdownMenuItem>
                                            </DropdownMenuContent>
                                        </DropdownMenu>
                                    </div>
                                </CardHeader>
                                <CardContent>
                                    <p className="text-sm text-muted-foreground line-clamp-3 whitespace-pre-wrap">
                                        {template.content}
                                    </p>
                                </CardContent>
                            </Card>
                        );
                    })}
                </div>
            )}
        </div>
    );
}
