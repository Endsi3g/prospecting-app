import { TrendingUp, TrendingDown, Minus } from 'lucide-react';
import { cn } from '@/lib/utils';

interface TrendIndicatorProps {
    value: number;
    suffix?: string;
    size?: 'sm' | 'md' | 'lg';
    showIcon?: boolean;
    className?: string;
}

export function TrendIndicator({
    value,
    suffix = '%',
    size = 'md',
    showIcon = true,
    className,
}: TrendIndicatorProps) {
    const isPositive = value > 0;
    const isNegative = value < 0;
    const isNeutral = value === 0;

    const sizeClasses = {
        sm: 'text-xs gap-0.5',
        md: 'text-sm gap-1',
        lg: 'text-base gap-1.5',
    };

    const iconSizes = {
        sm: 'h-3 w-3',
        md: 'h-4 w-4',
        lg: 'h-5 w-5',
    };

    const Icon = isPositive ? TrendingUp : isNegative ? TrendingDown : Minus;

    return (
        <div
            className={cn(
                'inline-flex items-center font-medium transition-all duration-300',
                sizeClasses[size],
                isPositive && 'text-emerald-600 dark:text-emerald-400',
                isNegative && 'text-red-600 dark:text-red-400',
                isNeutral && 'text-muted-foreground',
                className
            )}
        >
            {showIcon && (
                <Icon
                    className={cn(
                        iconSizes[size],
                        'transition-transform duration-300',
                        isPositive && 'animate-bounce-subtle',
                        isNegative && 'animate-bounce-subtle-down'
                    )}
                />
            )}
            <span>
                {isPositive && '+'}
                {value.toFixed(1)}{suffix}
            </span>
        </div>
    );
}
