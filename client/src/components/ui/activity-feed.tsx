import {
    Upload,
    Sparkles,
    UserPlus,
    Mail,
    Send,
    MessageSquare,
    FileText,
    Megaphone,
    Check,
    AlertCircle,
    type LucideIcon
} from 'lucide-react';
import { cn } from '@/lib/utils';

export type ActivityType =
    | 'import'
    | 'message_generated'
    | 'message_sent'
    | 'prospect_added'
    | 'campaign_started'
    | 'campaign_completed'
    | 'template_created'
    | 'reply_received'
    | 'error';

export interface ActivityItem {
    id: string;
    type: ActivityType;
    title: string;
    description?: string;
    timestamp: Date | string;
    metadata?: Record<string, unknown>;
}

interface ActivityFeedProps {
    activities: ActivityItem[];
    maxItems?: number;
    showTimeline?: boolean;
    className?: string;
}

const activityConfig: Record<ActivityType, { icon: LucideIcon; color: string; bgColor: string }> = {
    import: {
        icon: Upload,
        color: 'text-blue-600 dark:text-blue-400',
        bgColor: 'bg-blue-100 dark:bg-blue-900/30',
    },
    message_generated: {
        icon: Sparkles,
        color: 'text-purple-600 dark:text-purple-400',
        bgColor: 'bg-purple-100 dark:bg-purple-900/30',
    },
    message_sent: {
        icon: Send,
        color: 'text-emerald-600 dark:text-emerald-400',
        bgColor: 'bg-emerald-100 dark:bg-emerald-900/30',
    },
    prospect_added: {
        icon: UserPlus,
        color: 'text-cyan-600 dark:text-cyan-400',
        bgColor: 'bg-cyan-100 dark:bg-cyan-900/30',
    },
    campaign_started: {
        icon: Megaphone,
        color: 'text-orange-600 dark:text-orange-400',
        bgColor: 'bg-orange-100 dark:bg-orange-900/30',
    },
    campaign_completed: {
        icon: Check,
        color: 'text-green-600 dark:text-green-400',
        bgColor: 'bg-green-100 dark:bg-green-900/30',
    },
    template_created: {
        icon: FileText,
        color: 'text-indigo-600 dark:text-indigo-400',
        bgColor: 'bg-indigo-100 dark:bg-indigo-900/30',
    },
    reply_received: {
        icon: MessageSquare,
        color: 'text-pink-600 dark:text-pink-400',
        bgColor: 'bg-pink-100 dark:bg-pink-900/30',
    },
    error: {
        icon: AlertCircle,
        color: 'text-red-600 dark:text-red-400',
        bgColor: 'bg-red-100 dark:bg-red-900/30',
    },
};

function formatRelativeTime(date: Date | string): string {
    const now = new Date();
    const then = new Date(date);
    const diffMs = now.getTime() - then.getTime();
    const diffSecs = Math.floor(diffMs / 1000);
    const diffMins = Math.floor(diffSecs / 60);
    const diffHours = Math.floor(diffMins / 60);
    const diffDays = Math.floor(diffHours / 24);

    if (diffSecs < 60) return 'À l\'instant';
    if (diffMins < 60) return `Il y a ${diffMins} min`;
    if (diffHours < 24) return `Il y a ${diffHours}h`;
    if (diffDays === 1) return 'Hier';
    if (diffDays < 7) return `Il y a ${diffDays} jours`;

    return then.toLocaleDateString('fr-FR', {
        day: 'numeric',
        month: 'short',
    });
}

export function ActivityFeed({
    activities,
    maxItems = 5,
    showTimeline = true,
    className,
}: ActivityFeedProps) {
    const displayedActivities = activities.slice(0, maxItems);

    if (displayedActivities.length === 0) {
        return (
            <div className={cn("flex flex-col items-center justify-center py-8 text-center", className)}>
                <div className="w-12 h-12 rounded-full bg-muted flex items-center justify-center mb-3">
                    <Mail className="h-6 w-6 text-muted-foreground" />
                </div>
                <p className="text-sm text-muted-foreground">Aucune activité récente</p>
            </div>
        );
    }

    return (
        <div className={cn("relative", className)}>
            {/* Timeline line */}
            {showTimeline && displayedActivities.length > 1 && (
                <div className="absolute left-[19px] top-8 bottom-4 w-0.5 bg-linear-to-b from-border via-border to-transparent" />
            )}

            <div className="space-y-1">
                {displayedActivities.map((activity, index) => {
                    const config = activityConfig[activity.type];
                    const Icon = config.icon;

                    return (
                        <div
                            key={activity.id}
                            className={cn(
                                "group flex items-start gap-3 p-3 rounded-lg transition-all duration-300",
                                "hover:bg-muted/50",
                                "animate-in slide-in-from-left-2 fade-in-0"
                            )}
                            style={{ animationDelay: `${index * 75}ms`, animationFillMode: 'both' }}
                        >
                            {/* Icon */}
                            <div
                                className={cn(
                                    "relative z-10 flex h-10 w-10 shrink-0 items-center justify-center rounded-full transition-transform duration-300",
                                    "group-hover:scale-110",
                                    config.bgColor
                                )}
                            >
                                <Icon className={cn("h-5 w-5", config.color)} />
                            </div>

                            {/* Content */}
                            <div className="flex-1 min-w-0">
                                <div className="flex items-start justify-between gap-2">
                                    <p className="text-sm font-medium leading-tight text-foreground">
                                        {activity.title}
                                    </p>
                                    <span className="text-xs text-muted-foreground whitespace-nowrap">
                                        {formatRelativeTime(activity.timestamp)}
                                    </span>
                                </div>
                                {activity.description && (
                                    <p className="mt-0.5 text-sm text-muted-foreground line-clamp-2">
                                        {activity.description}
                                    </p>
                                )}
                            </div>
                        </div>
                    );
                })}
            </div>
        </div>
    );
}
