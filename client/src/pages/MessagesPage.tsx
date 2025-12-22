import { useEffect, useState } from 'react';
import { Card, CardContent, CardHeader } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { Tabs, TabsList, TabsTrigger } from '@/components/ui/tabs';
import {
    DropdownMenu,
    DropdownMenuContent,
    DropdownMenuItem,
    DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import {
    Search,
    MoreHorizontal,
    Mail,
    Linkedin,
    MessageSquare,
    Copy,
    CheckCircle,
    Send,
    Loader2
} from 'lucide-react';
import { messagesApi, prospectsApi, type Message, type Prospect } from '@/api/client';
import { toast } from 'sonner';

export function MessagesPage() {
    const [messages, setMessages] = useState<Message[]>([]);
    const [prospects, setProspects] = useState<Record<string, Prospect>>({});
    const [loading, setLoading] = useState(true);
    const [search, setSearch] = useState('');
    const [filter, setFilter] = useState('all');

    useEffect(() => {
        async function loadData() {
            try {
                const [messagesRes, prospectsRes] = await Promise.all([
                    messagesApi.getAll(),
                    prospectsApi.getAll(),
                ]);
                setMessages(messagesRes.data || []);

                const prospectsMap: Record<string, Prospect> = {};
                (prospectsRes.data || []).forEach(p => { prospectsMap[p.id] = p; });
                setProspects(prospectsMap);
            } catch (error) {`r`n                console.error('API error:', error);`r`n                toast.error('Erreur lors du chargement');
            } finally {
                setLoading(false);
            }
        }
        loadData();
    }, []);

    function getProspectName(prospectId: string) {
        const p = prospects[prospectId];
        if (!p) return 'Inconnu';
        return `${p.prenom || ''} ${p.nom || ''}`.trim() || p.entreprise || 'Sans nom';
    }

    const channelIcons = {
        email: Mail,
        linkedin: Linkedin,
        sms: MessageSquare,
    };

    const statusColors = {
        pending: 'bg-yellow-100 text-yellow-700',
        sent: 'bg-blue-100 text-blue-700',
        replied: 'bg-green-100 text-green-700',
    };

    const statusLabels = {
        pending: 'En attente',
        sent: 'Envoyé',
        replied: 'Répondu',
    };

    const filteredMessages = messages.filter(m => {
        if (filter !== 'all' && m.status !== filter) return false;
        if (search) {
            const prospectName = getProspectName(m.prospectId).toLowerCase();
            const messageText = (m.content || m.message || '').toLowerCase();
            return prospectName.includes(search.toLowerCase()) || messageText.includes(search.toLowerCase());
        }
        return true;
    });

    async function copyMessage(content: string) {
        await navigator.clipboard.writeText(content);
        toast.success('Message copié');
    }

    async function updateStatus(id: string, status: string) {
        try {
            await messagesApi.update(id, { status: status as Message['status'] });
            setMessages(prev => prev.map(m => m.id === id ? { ...m, status: status as Message['status'] } : m));
            toast.success('Statut mis à jour');
        } catch (error) {`r`n            console.error('API error:', error);`r`n            toast.error('Erreur lors de la mise à jour');
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
        <div className="space-y-6">
            <div>
                <h1 className="text-3xl font-bold tracking-tight">Messages générés</h1>
                <p className="text-muted-foreground">Gérez vos messages de prospection</p>
            </div>

            {/* Stats */}
            <div className="grid gap-4 grid-cols-2 md:grid-cols-4">
                <Card>
                    <CardContent className="pt-6">
                        <div className="text-2xl font-bold">{messages.length}</div>
                        <p className="text-sm text-muted-foreground">Total messages</p>
                    </CardContent>
                </Card>
                <Card>
                    <CardContent className="pt-6">
                        <div className="text-2xl font-bold text-yellow-600">
                            {messages.filter(m => m.status === 'pending').length}
                        </div>
                        <p className="text-sm text-muted-foreground">En attente</p>
                    </CardContent>
                </Card>
                <Card>
                    <CardContent className="pt-6">
                        <div className="text-2xl font-bold text-blue-600">
                            {messages.filter(m => m.status === 'sent').length}
                        </div>
                        <p className="text-sm text-muted-foreground">Envoyés</p>
                    </CardContent>
                </Card>
                <Card>
                    <CardContent className="pt-6">
                        <div className="text-2xl font-bold text-green-600">
                            {messages.filter(m => m.status === 'replied').length}
                        </div>
                        <p className="text-sm text-muted-foreground">Réponses</p>
                    </CardContent>
                </Card>
            </div>

            {/* Filters */}
            <Card>
                <CardHeader>
                    <div className="flex flex-col md:flex-row md:items-center gap-4">
                        <div className="relative flex-1 max-w-sm">
                            <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
                            <Input
                                placeholder="Rechercher..."
                                value={search}
                                onChange={(e) => setSearch(e.target.value)}
                                className="pl-9"
                            />
                        </div>
                        <div className="overflow-x-auto -mx-2 px-2">
                            <Tabs value={filter} onValueChange={setFilter}>
                                <TabsList className="w-full md:w-auto">
                                    <TabsTrigger value="all" className="flex-1 md:flex-none">Tous</TabsTrigger>
                                    <TabsTrigger value="pending" className="flex-1 md:flex-none">En attente</TabsTrigger>
                                    <TabsTrigger value="sent" className="flex-1 md:flex-none">Envoyés</TabsTrigger>
                                    <TabsTrigger value="replied" className="flex-1 md:flex-none">Réponses</TabsTrigger>
                                </TabsList>
                            </Tabs>
                        </div>
                    </div>
                </CardHeader>
                <CardContent>
                    {filteredMessages.length === 0 ? (
                        <div className="text-center py-12">
                            <Mail className="h-12 w-12 text-muted-foreground/50 mx-auto mb-4" />
                            <p className="text-muted-foreground">Aucun message trouvé</p>
                        </div>
                    ) : (
                        <div className="space-y-4">
                            {filteredMessages.map((message) => {
                                const ChannelIcon = channelIcons[message.channel] || Mail;
                                return (
                                    <div key={message.id} className="p-4 border rounded-lg hover:bg-muted/50 transition-colors">
                                        <div className="flex items-start justify-between gap-4">
                                            <div className="flex items-center gap-3">
                                                <div className="p-2 rounded-lg bg-muted">
                                                    <ChannelIcon className="h-4 w-4" />
                                                </div>
                                                <div>
                                                    <p className="font-medium">{getProspectName(message.prospectId)}</p>
                                                    <div className="flex items-center gap-2 mt-1">
                                                        <Badge variant="outline" className={statusColors[message.status]}>
                                                            {statusLabels[message.status]}
                                                        </Badge>
                                                        <span className="text-xs text-muted-foreground">
                                                            {new Date(message.createdAt).toLocaleDateString('fr-FR')}
                                                        </span>
                                                    </div>
                                                </div>
                                            </div>
                                            <DropdownMenu>
                                                <DropdownMenuTrigger asChild>
                                                    <Button variant="ghost" size="icon">
                                                        <MoreHorizontal className="h-4 w-4" />
                                                    </Button>
                                                </DropdownMenuTrigger>
                                                <DropdownMenuContent align="end">
                                                    <DropdownMenuItem onClick={() => updateStatus(message.id, 'sent')}>
                                                        <Send className="mr-2 h-4 w-4" />
                                                        Marquer envoyé
                                                    </DropdownMenuItem>
                                                    <DropdownMenuItem onClick={() => updateStatus(message.id, 'replied')}>
                                                        <CheckCircle className="mr-2 h-4 w-4" />
                                                        Marquer répondu
                                                    </DropdownMenuItem>
                                                </DropdownMenuContent>
                                            </DropdownMenu>
                                        </div>
                                        <p className="mt-3 text-sm text-muted-foreground whitespace-pre-wrap line-clamp-3">
                                            {message.content || message.message || 'Aucun contenu'}
                                        </p>
                                        <div className="mt-3 flex items-center gap-2">
                                            <Button
                                                variant="outline"
                                                size="sm"
                                                onClick={() => copyMessage(message.content || message.message || '')}
                                                className="gap-1"
                                            >
                                                <Copy className="h-3 w-3" />
                                                Copier
                                            </Button>
                                            <span className="text-xs text-muted-foreground">
                                                {(message.content || message.message || '').length} caractères
                                            </span>
                                        </div>
                                    </div>
                                );
                            })}
                        </div>
                    )}
                </CardContent>
            </Card>
        </div>
    );
}
