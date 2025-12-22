import { useEffect, useState, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import {
    CommandDialog,
    CommandEmpty,
    CommandGroup,
    CommandInput,
    CommandItem,
    CommandList,
    CommandSeparator,
} from '@/components/ui/command';
import {
    LayoutDashboard,
    Users,
    List,
    Upload,
    Sparkles,
    Mail,
    Download,
    Megaphone,
    FileText,
    BarChart3,
    Settings,
    MapPin,
    Phone,
    User,
    Building2,
    Search,
    Keyboard
} from 'lucide-react';
import { prospectsApi, type Prospect } from '@/api/client';

// Navigation pages
const pages = [
    { name: 'Tableau de bord', href: '/', icon: LayoutDashboard, keywords: ['home', 'dashboard', 'accueil'] },
    { name: 'Prospects', href: '/prospects', icon: Users, keywords: ['contacts', 'leads'] },
    { name: 'Listes', href: '/lists', icon: List, keywords: ['segments', 'groupes'] },
    { name: 'Recherche Maps', href: '/search', icon: MapPin, keywords: ['google', 'maps', 'apify'] },
    { name: 'Importer', href: '/import', icon: Upload, keywords: ['csv', 'upload'] },
    { name: 'Générer', href: '/generate', icon: Sparkles, keywords: ['ai', 'messages', 'emails'] },
    { name: 'Messages', href: '/messages', icon: Mail, keywords: ['emails', 'envoi'] },
    { name: 'Exporter', href: '/export', icon: Download, keywords: ['excel', 'csv'] },
    { name: 'Campagnes', href: '/campaigns', icon: Megaphone, keywords: ['sequences', 'automation'] },
    { name: 'Templates', href: '/templates', icon: FileText, keywords: ['modèles'] },
    { name: 'Analyser', href: '/analyze', icon: BarChart3, keywords: ['research', 'données'] },
    { name: 'Paramètres', href: '/settings', icon: Settings, keywords: ['config', 'api'] },
];

// Quick actions
const actions = [
    { name: 'Nouvelle recherche Google Maps', action: 'search', icon: Search, keywords: ['find', 'trouver'] },
    { name: 'Appeler un prospect', action: 'call', icon: Phone, keywords: ['téléphone', 'call'] },
    { name: 'Envoyer un email', action: 'email', icon: Mail, keywords: ['message', 'send'] },
    { name: 'Voir les raccourcis', action: 'shortcuts', icon: Keyboard, keywords: ['help', 'aide'] },
];

interface CommandPaletteProps {
    open: boolean;
    onOpenChange: (open: boolean) => void;
}

export function CommandPalette({ open, onOpenChange }: CommandPaletteProps) {
    const navigate = useNavigate();
    const [search, setSearch] = useState('');
    const [prospects, setProspects] = useState<Prospect[]>([]);
    const [loadingProspects, setLoadingProspects] = useState(false);

    // Load prospects when search changes
    useEffect(() => {
        if (search.length > 1) {
            setLoadingProspects(true);
            const timer = setTimeout(async () => {
                try {
                    const response = await prospectsApi.getAll();
                    const filtered = (response.data || []).filter(p =>
                        p.nom?.toLowerCase().includes(search.toLowerCase()) ||
                        p.prenom?.toLowerCase().includes(search.toLowerCase()) ||
                        p.entreprise?.toLowerCase().includes(search.toLowerCase()) ||
                        p.email?.toLowerCase().includes(search.toLowerCase())
                    ).slice(0, 5);
                    setProspects(filtered);
                } catch {
                    setProspects([]);
                } finally {
                    setLoadingProspects(false);
                }
            }, 300);
            return () => clearTimeout(timer);
        } else {
            setProspects([]);
        }
    }, [search]);

    // Handle selection
    const handleSelect = useCallback((value: string) => {
        onOpenChange(false);
        setSearch('');

        // Check if it's a page navigation
        const page = pages.find(p => p.href === value);
        if (page) {
            navigate(page.href);
            return;
        }

        // Check if it's a prospect
        if (value.startsWith('prospect:')) {
            const prospectId = value.replace('prospect:', '');
            navigate(`/prospects/${prospectId}`);
            return;
        }

        // Check if it's an action
        switch (value) {
            case 'search':
                navigate('/search');
                break;
            case 'call':
                navigate('/prospects');
                break;
            case 'email':
                navigate('/messages');
                break;
            case 'shortcuts':
                // Show shortcuts modal (could be implemented)
                alert('Raccourcis:\n\nCtrl/Cmd + K = Recherche\nK = Appeler\nE = Email\nN = Note\nS = Rechercher');
                break;
        }
    }, [navigate, onOpenChange]);

    return (
        <CommandDialog open={open} onOpenChange={onOpenChange}>
            <CommandInput
                placeholder="Rechercher une page, un prospect ou une action..."
                value={search}
                onValueChange={setSearch}
            />
            <CommandList>
                <CommandEmpty>
                    {loadingProspects ? 'Recherche...' : 'Aucun résultat trouvé.'}
                </CommandEmpty>

                {/* Prospects Results */}
                {prospects.length > 0 && (
                    <CommandGroup heading="Prospects">
                        {prospects.map(prospect => (
                            <CommandItem
                                key={prospect.id}
                                value={`prospect:${prospect.id}`}
                                onSelect={handleSelect}
                            >
                                <User className="mr-2 h-4 w-4" />
                                <div className="flex flex-col">
                                    <span>{prospect.prenom} {prospect.nom}</span>
                                    {prospect.entreprise && (
                                        <span className="text-xs text-muted-foreground flex items-center gap-1">
                                            <Building2 className="h-3 w-3" />
                                            {prospect.entreprise}
                                        </span>
                                    )}
                                </div>
                            </CommandItem>
                        ))}
                    </CommandGroup>
                )}

                {/* Pages */}
                <CommandGroup heading="Pages">
                    {pages.map(page => (
                        <CommandItem
                            key={page.href}
                            value={page.href}
                            onSelect={handleSelect}
                            keywords={page.keywords}
                        >
                            <page.icon className="mr-2 h-4 w-4" />
                            {page.name}
                        </CommandItem>
                    ))}
                </CommandGroup>

                <CommandSeparator />

                {/* Actions */}
                <CommandGroup heading="Actions">
                    {actions.map(action => (
                        <CommandItem
                            key={action.action}
                            value={action.action}
                            onSelect={handleSelect}
                            keywords={action.keywords}
                        >
                            <action.icon className="mr-2 h-4 w-4" />
                            {action.name}
                        </CommandItem>
                    ))}
                </CommandGroup>
            </CommandList>
        </CommandDialog>
    );
}
