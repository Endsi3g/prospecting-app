import { useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Switch } from '@/components/ui/switch';
import { Badge } from '@/components/ui/badge';
import { Separator } from '@/components/ui/separator';
import {
    User,
    Mail,
    Building,
    Shield,
    Key,
    Bell,
    Smartphone,
    Save,
    Loader2,

    Calendar,
    BarChart3
} from 'lucide-react';
import { toast } from 'sonner';

export function ProfilePage() {
    const [saving, setSaving] = useState(false);
    const [profile, setProfile] = useState({
        firstName: 'Utilisateur',
        lastName: '',
        email: 'user@example.com',
        company: '',
        phone: '',
        notifications: {
            email: true,
            push: false,
        },
    });

    async function handleSave() {
        setSaving(true);
        // Simulate save
        await new Promise(resolve => setTimeout(resolve, 1000));
        toast.success('Profil sauvegardé');
        setSaving(false);
    }

    // Mock stats
    const stats = {
        prospectsImported: 274,
        messagesGenerated: 156,
        campaignsCreated: 8,
        memberSince: '2024-12-01',
    };

    return (
        <div className="max-w-4xl mx-auto space-y-6">
            <div>
                <h1 className="text-3xl font-bold tracking-tight">Profil & Compte</h1>
                <p className="text-muted-foreground">Gérez vos informations personnelles</p>
            </div>

            <div className="grid gap-6 md:grid-cols-3">
                {/* Profile Card */}
                <Card className="md:col-span-2">
                    <CardHeader>
                        <CardTitle className="flex items-center gap-2">
                            <User className="h-5 w-5 text-primary" />
                            Informations personnelles
                        </CardTitle>
                    </CardHeader>
                    <CardContent className="space-y-6">
                        {/* Avatar */}
                        <div className="flex items-center gap-4">
                            <div className="h-20 w-20 rounded-full bg-linear-to-br from-primary to-blue-400 flex items-center justify-center text-white text-2xl font-bold">
                                {profile.firstName[0]}{profile.lastName?.[0] || ''}
                            </div>
                            <div>
                                <h3 className="text-lg font-semibold">
                                    {profile.firstName} {profile.lastName}
                                </h3>
                                <p className="text-sm text-muted-foreground">{profile.email}</p>
                                <Badge className="mt-1" variant="secondary">Plan Gratuit</Badge>
                            </div>
                        </div>

                        <Separator />

                        {/* Form */}
                        <div className="grid gap-4 md:grid-cols-2">
                            <div className="space-y-2">
                                <Label>Prénom</Label>
                                <Input
                                    value={profile.firstName}
                                    onChange={(e) => setProfile({ ...profile, firstName: e.target.value })}
                                />
                            </div>
                            <div className="space-y-2">
                                <Label>Nom</Label>
                                <Input
                                    value={profile.lastName}
                                    onChange={(e) => setProfile({ ...profile, lastName: e.target.value })}
                                />
                            </div>
                            <div className="space-y-2">
                                <Label>Email</Label>
                                <div className="relative">
                                    <Mail className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
                                    <Input
                                        type="email"
                                        value={profile.email}
                                        onChange={(e) => setProfile({ ...profile, email: e.target.value })}
                                        className="pl-9"
                                    />
                                </div>
                            </div>
                            <div className="space-y-2">
                                <Label>Téléphone</Label>
                                <div className="relative">
                                    <Smartphone className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
                                    <Input
                                        type="tel"
                                        value={profile.phone}
                                        onChange={(e) => setProfile({ ...profile, phone: e.target.value })}
                                        className="pl-9"
                                        placeholder="+33 6 12 34 56 78"
                                    />
                                </div>
                            </div>
                            <div className="space-y-2 md:col-span-2">
                                <Label>Entreprise</Label>
                                <div className="relative">
                                    <Building className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
                                    <Input
                                        value={profile.company}
                                        onChange={(e) => setProfile({ ...profile, company: e.target.value })}
                                        className="pl-9"
                                        placeholder="Nom de votre entreprise"
                                    />
                                </div>
                            </div>
                        </div>
                    </CardContent>
                </Card>

                {/* Stats Card */}
                <Card>
                    <CardHeader>
                        <CardTitle className="flex items-center gap-2">
                            <BarChart3 className="h-5 w-5 text-green-500" />
                            Statistiques
                        </CardTitle>
                    </CardHeader>
                    <CardContent className="space-y-4">
                        <div className="flex items-center justify-between">
                            <span className="text-sm text-muted-foreground">Prospects importés</span>
                            <span className="font-bold">{stats.prospectsImported}</span>
                        </div>
                        <div className="flex items-center justify-between">
                            <span className="text-sm text-muted-foreground">Messages générés</span>
                            <span className="font-bold">{stats.messagesGenerated}</span>
                        </div>
                        <div className="flex items-center justify-between">
                            <span className="text-sm text-muted-foreground">Campagnes créées</span>
                            <span className="font-bold">{stats.campaignsCreated}</span>
                        </div>
                        <Separator />
                        <div className="flex items-center gap-2 text-sm text-muted-foreground">
                            <Calendar className="h-4 w-4" />
                            Membre depuis {new Date(stats.memberSince).toLocaleDateString('fr-FR', { month: 'long', year: 'numeric' })}
                        </div>
                    </CardContent>
                </Card>
            </div>

            {/* Notifications */}
            <Card>
                <CardHeader>
                    <CardTitle className="flex items-center gap-2">
                        <Bell className="h-5 w-5 text-amber-500" />
                        Préférences de notification
                    </CardTitle>
                </CardHeader>
                <CardContent className="space-y-4">
                    <div className="flex items-center justify-between">
                        <div>
                            <Label>Notifications par email</Label>
                            <p className="text-sm text-muted-foreground">
                                Recevez des mises à jour par email
                            </p>
                        </div>
                        <Switch
                            checked={profile.notifications.email}
                            onCheckedChange={(checked) => setProfile({
                                ...profile,
                                notifications: { ...profile.notifications, email: checked }
                            })}
                        />
                    </div>
                    <div className="flex items-center justify-between">
                        <div>
                            <Label>Notifications push</Label>
                            <p className="text-sm text-muted-foreground">
                                Notifications dans le navigateur
                            </p>
                        </div>
                        <Switch
                            checked={profile.notifications.push}
                            onCheckedChange={(checked) => setProfile({
                                ...profile,
                                notifications: { ...profile.notifications, push: checked }
                            })}
                        />
                    </div>
                </CardContent>
            </Card>

            {/* Security */}
            <Card>
                <CardHeader>
                    <CardTitle className="flex items-center gap-2">
                        <Shield className="h-5 w-5 text-red-500" />
                        Sécurité
                    </CardTitle>
                </CardHeader>
                <CardContent className="space-y-4">
                    <div className="flex items-center justify-between">
                        <div>
                            <Label>Mot de passe</Label>
                            <p className="text-sm text-muted-foreground">
                                Dernière modification il y a 30 jours
                            </p>
                        </div>
                        <Button variant="outline">
                            <Key className="mr-2 h-4 w-4" />
                            Modifier
                        </Button>
                    </div>
                    <Separator />
                    <div className="flex items-center justify-between">
                        <div>
                            <Label className="text-destructive">Supprimer le compte</Label>
                            <p className="text-sm text-muted-foreground">
                                Cette action est irréversible
                            </p>
                        </div>
                        <Button variant="destructive">
                            Supprimer
                        </Button>
                    </div>
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
                    Enregistrer les modifications
                </Button>
            </div>
        </div>
    );
}
