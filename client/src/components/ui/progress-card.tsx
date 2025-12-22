import { useEffect, useState } from 'react';
import { cn } from '@/lib/utils';
import { Target, Trophy, TrendingUp, Users, Mail, Megaphone, type LucideIcon } from 'lucide-react';

export type GoalType = 'prospects' | 'messages' | 'campaigns' | 'engagement' | 'custom';

interface ProgressCardProps {
    title: string;
    current: number;
    target: number;
    type?: GoalType;
    icon?: LucideIcon;
    suffix?: string;
    className?: string;
    showPercentage?: boolean;
    animated?: boolean;
}

const goalConfig: Record<GoalType, { icon: LucideIcon; gradient: string }> = {
    prospects: {
        icon: Users,
        gradient: 'from-blue-500 to-cyan-400',
    },
    messages: {
        icon: Mail,
        gradient: 'from-purple-500 to-pink-400',
    },
    campaigns: {
        icon: Megaphone,
        gradient: 'from-orange-500 to-yellow-400',
    },
    engagement: {
        icon: TrendingUp,
        gradient: 'from-emerald-500 to-teal-400',
    },
    custom: {
        icon: Target,
        gradient: 'from-indigo-500 to-violet-400',
    },
};

export function ProgressCard({
    title,
    current,
    target,
    type = 'custom',
    icon,
    suffix = '',
    className,
    showPercentage = true,
    animated = true,
}: ProgressCardProps) {
    const [animatedProgress, setAnimatedProgress] = useState(0);
    const config = goalConfig[type];
    const Icon = icon || config.icon;
    const percentage = Math.min(Math.round((current / target) * 100), 100);
    const isCompleted = current >= target;

    useEffect(() => {
        const delay = animated ? 100 : 0;
        const timer = setTimeout(() => {
            setAnimatedProgress(percentage);
        }, delay);
        return () => clearTimeout(timer);
    }, [percentage, animated]);

    return (
        <div
            className={cn(
                "group relative overflow-hidden rounded-xl border bg-card p-4 transition-all duration-300",
                "hover:shadow-md hover:border-primary/30",
                className
            )}
        >
            {/* Completed badge */}
            {isCompleted && (
                <div className="absolute top-2 right-2 animate-in zoom-in-50 fade-in duration-300">
                    <div className="flex items-center gap-1 px-2 py-0.5 rounded-full bg-emerald-100 dark:bg-emerald-900/30 text-emerald-600 dark:text-emerald-400 text-xs font-medium">
                        <Trophy className="h-3 w-3" />
                        Atteint!
                    </div>
                </div>
            )}

            <div className="flex items-start gap-3">
                {/* Icon */}
                <div
                    className={cn(
                        "flex h-10 w-10 shrink-0 items-center justify-center rounded-lg bg-linear-to-br text-white transition-transform duration-300",
                        "group-hover:scale-110",
                        config.gradient
                    )}
                >
                    <Icon className="h-5 w-5" />
                </div>

                {/* Content */}
                <div className="flex-1 min-w-0">
                    <h4 className="text-sm font-medium text-muted-foreground truncate">
                        {title}
                    </h4>
                    <div className="flex items-baseline gap-1 mt-0.5">
                        <span className="text-2xl font-bold tabular-nums">
                            {current.toLocaleString('fr-FR')}
                        </span>
                        <span className="text-sm text-muted-foreground">
                            / {target.toLocaleString('fr-FR')}{suffix}
                        </span>
                    </div>
                </div>

                {/* Percentage */}
                {showPercentage && (
                    <div
                        className={cn(
                            "text-right",
                            isCompleted ? "text-emerald-600 dark:text-emerald-400" : "text-muted-foreground"
                        )}
                    >
                        <span className="text-xl font-bold tabular-nums">{percentage}%</span>
                    </div>
                )}
            </div>

            {/* Progress bar */}
            <div className="mt-4 h-2 rounded-full bg-muted overflow-hidden">
                <div
                    className={cn(
                        "h-full rounded-full bg-linear-to-r transition-all duration-1000 ease-out",
                        config.gradient
                    )}
                    style={{ width: `${animatedProgress}%` }}
                />
            </div>

            {/* Shimmer effect on hover */}
            <div className="absolute inset-0 -translate-x-full group-hover:translate-x-full transition-transform duration-1000 bg-linear-to-r from-transparent via-white/5 to-transparent pointer-events-none" />
        </div>
    );
}

interface ProgressGridProps {
    goals: Omit<ProgressCardProps, 'className'>[];
    className?: string;
}

export function ProgressGrid({ goals, className }: ProgressGridProps) {
    return (
        <div className={cn("grid gap-4 md:grid-cols-2", className)}>
            {goals.map((goal, index) => (
                <div
                    key={index}
                    className="animate-in slide-in-from-bottom-2 fade-in-0"
                    style={{ animationDelay: `${index * 100}ms`, animationFillMode: 'both' }}
                >
                    <ProgressCard {...goal} />
                </div>
            ))}
        </div>
    );
}
