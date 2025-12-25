import { Outlet, NavLink } from 'react-router-dom';
import { useState } from 'react';
import {
    SidebarProvider,
    Sidebar,
    SidebarContent,
    SidebarHeader,
    SidebarMenu,
    SidebarMenuItem,
    SidebarMenuButton,
    SidebarGroup,
    SidebarGroupLabel,
    SidebarGroupContent,
    SidebarFooter,
    SidebarTrigger,
} from '@/components/ui/sidebar';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import {
    DropdownMenu,
    DropdownMenuContent,
    DropdownMenuItem,
    DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
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
    Search,
    Bell,
    Copy,
    Command,
    MapPin,
    Zap,
    KanbanSquare,
    Workflow,
} from 'lucide-react';

const navItems = [
    { label: 'Tableau de bord', href: '/', icon: LayoutDashboard },
    { label: 'Prospects', href: '/prospects', icon: Users },
    { label: 'Listes', href: '/lists', icon: List },
    { label: 'Pipeline', href: '/pipeline', icon: KanbanSquare },
];

const actionsItems = [
    { label: 'Recherche Maps', href: '/search', icon: MapPin },
    { label: 'Importer', href: '/import', icon: Upload },
    { label: 'Générer', href: '/generate', icon: Sparkles },
    { label: 'Messages', href: '/messages', icon: Mail },
    { label: 'Exporter', href: '/export', icon: Download },
    { label: 'Outils Apify', href: '/tools/apify', icon: Search },
];

const campaignItems = [
    { label: 'Séquences', href: '/sequences', icon: Zap },
    { label: 'Automations', href: '/automations', icon: Workflow },
    { label: 'Campagnes', href: '/campaigns', icon: Megaphone },
    { label: 'Templates', href: '/templates', icon: FileText },
    { label: 'Analyser', href: '/analyze', icon: BarChart3 },
];

export function AppLayout() {
    const [notifications] = useState<{ id: string; title: string; unread: boolean }[]>([]);
    const unreadCount = notifications.filter(n => n.unread).length;

    return (
        <SidebarProvider>
            <div className="flex min-h-screen w-full">
                {/* Sidebar */}
                <Sidebar>
                    <SidebarHeader className="border-b p-4">
                        <div className="flex items-center gap-2">
                            <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-primary text-primary-foreground font-bold">
                                P
                            </div>
                            <span className="text-lg font-semibold">ProspectApp</span>
                        </div>
                    </SidebarHeader>

                    <SidebarContent>
                        {/* Main Navigation */}
                        <SidebarGroup>
                            <SidebarGroupLabel>Principal</SidebarGroupLabel>
                            <SidebarGroupContent>
                                <SidebarMenu>
                                    {navItems.map((item) => (
                                        <SidebarMenuItem key={item.href}>
                                            <SidebarMenuButton asChild>
                                                <NavLink
                                                    to={item.href}
                                                    className={({ isActive }) =>
                                                        isActive ? 'bg-accent text-accent-foreground' : ''
                                                    }
                                                >
                                                    <item.icon className="h-4 w-4" />
                                                    <span>{item.label}</span>
                                                </NavLink>
                                            </SidebarMenuButton>
                                        </SidebarMenuItem>
                                    ))}
                                </SidebarMenu>
                            </SidebarGroupContent>
                        </SidebarGroup>

                        {/* Actions */}
                        <SidebarGroup>
                            <SidebarGroupLabel>Actions</SidebarGroupLabel>
                            <SidebarGroupContent>
                                <SidebarMenu>
                                    {actionsItems.map((item) => (
                                        <SidebarMenuItem key={item.href}>
                                            <SidebarMenuButton asChild>
                                                <NavLink
                                                    to={item.href}
                                                    className={({ isActive }) =>
                                                        isActive ? 'bg-accent text-accent-foreground' : ''
                                                    }
                                                >
                                                    <item.icon className="h-4 w-4" />
                                                    <span>{item.label}</span>
                                                </NavLink>
                                            </SidebarMenuButton>
                                        </SidebarMenuItem>
                                    ))}
                                </SidebarMenu>
                            </SidebarGroupContent>
                        </SidebarGroup>

                        {/* Campaigns */}
                        <SidebarGroup>
                            <SidebarGroupLabel>Campagnes</SidebarGroupLabel>
                            <SidebarGroupContent>
                                <SidebarMenu>
                                    {campaignItems.map((item) => (
                                        <SidebarMenuItem key={item.href}>
                                            <SidebarMenuButton asChild>
                                                <NavLink
                                                    to={item.href}
                                                    className={({ isActive }) =>
                                                        isActive ? 'bg-accent text-accent-foreground' : ''
                                                    }
                                                >
                                                    <item.icon className="h-4 w-4" />
                                                    <span>{item.label}</span>
                                                </NavLink>
                                            </SidebarMenuButton>
                                        </SidebarMenuItem>
                                    ))}
                                </SidebarMenu>
                            </SidebarGroupContent>
                        </SidebarGroup>
                    </SidebarContent>

                    <SidebarFooter className="border-t p-4">
                        <SidebarMenu>
                            <SidebarMenuItem>
                                <SidebarMenuButton asChild>
                                    <NavLink to="/settings">
                                        <Settings className="h-4 w-4" />
                                        <span>Paramètres</span>
                                    </NavLink>
                                </SidebarMenuButton>
                            </SidebarMenuItem>
                        </SidebarMenu>
                    </SidebarFooter>
                </Sidebar>

                {/* Main content */}
                <div className="flex flex-1 flex-col">
                    {/* Top Header */}
                    <header className="sticky top-0 z-40 flex h-14 items-center justify-between border-b bg-background/95 backdrop-blur px-6">
                        <div className="flex items-center gap-4">
                            <SidebarTrigger />

                            {/* Global Search */}
                            <div className="relative hidden md:block">
                                <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
                                <Input
                                    placeholder="Rechercher..."
                                    className="w-72 pl-9 pr-12"
                                />
                                <kbd className="absolute right-3 top-1/2 -translate-y-1/2 pointer-events-none hidden h-5 select-none items-center gap-1 rounded border bg-muted px-1.5 font-mono text-[10px] font-medium opacity-100 sm:flex">
                                    <Command className="h-3 w-3" />K
                                </kbd>
                            </div>
                        </div>

                        <div className="flex items-center gap-2">
                            {/* Duplicate Detection */}
                            <Button variant="ghost" size="icon" title="Détecter les doublons">
                                <Copy className="h-4 w-4" />
                            </Button>

                            {/* Notifications */}
                            <DropdownMenu>
                                <DropdownMenuTrigger asChild>
                                    <Button variant="ghost" size="icon" className="relative">
                                        <Bell className="h-4 w-4" />
                                        {unreadCount > 0 && (
                                            <Badge className="absolute -top-1 -right-1 h-5 w-5 rounded-full p-0 text-[10px]">
                                                {unreadCount > 99 ? '99+' : unreadCount}
                                            </Badge>
                                        )}
                                    </Button>
                                </DropdownMenuTrigger>
                                <DropdownMenuContent align="end" className="w-80">
                                    <div className="flex items-center justify-between p-4 border-b">
                                        <span className="font-semibold">Notifications</span>
                                        <Button variant="ghost" size="sm" className="text-xs">
                                            Tout marquer lu
                                        </Button>
                                    </div>
                                    <div className="p-4 text-center text-sm text-muted-foreground">
                                        Aucune notification
                                    </div>
                                </DropdownMenuContent>
                            </DropdownMenu>

                            {/* User Avatar */}
                            <DropdownMenu>
                                <DropdownMenuTrigger asChild>
                                    <Button variant="ghost" size="icon" className="rounded-full">
                                        <div className="flex h-8 w-8 items-center justify-center rounded-full bg-linear-to-br from-primary to-blue-400 text-white font-medium text-sm">
                                            U
                                        </div>
                                    </Button>
                                </DropdownMenuTrigger>
                                <DropdownMenuContent align="end">
                                    <DropdownMenuItem asChild>
                                        <NavLink to="/profile">
                                            <Users className="mr-2 h-4 w-4" />
                                            Mon profil
                                        </NavLink>
                                    </DropdownMenuItem>
                                    <DropdownMenuItem asChild>
                                        <NavLink to="/settings">
                                            <Settings className="mr-2 h-4 w-4" />
                                            Paramètres
                                        </NavLink>
                                    </DropdownMenuItem>
                                </DropdownMenuContent>
                            </DropdownMenu>
                        </div>
                    </header>

                    {/* Page Content */}
                    <main className="flex-1 p-6 bg-muted/30">
                        <Outlet />
                    </main>
                </div>
            </div>
        </SidebarProvider>
    );
}
