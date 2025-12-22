import { useEffect, useRef, useState } from 'react';
import { cn } from '@/lib/utils';

interface DataPoint {
    label: string;
    value: number;
    secondaryValue?: number;
}

interface AreaChartProps {
    data: DataPoint[];
    height?: number;
    primaryColor?: string;
    secondaryColor?: string;
    showGrid?: boolean;
    showLabels?: boolean;
    showTooltip?: boolean;
    className?: string;
    primaryLabel?: string;
    secondaryLabel?: string;
}

export function AreaChart({
    data,
    height = 200,
    primaryColor = 'rgb(99, 102, 241)',
    secondaryColor = 'rgb(34, 197, 94)',
    showGrid = true,
    showLabels = true,
    showTooltip = true,
    className,
    primaryLabel = 'Primary',
    secondaryLabel = 'Secondary',
}: AreaChartProps) {
    const containerRef = useRef<HTMLDivElement>(null);
    const [dimensions, setDimensions] = useState({ width: 0, height });
    const [hoveredIndex, setHoveredIndex] = useState<number | null>(null);
    const [isAnimated, setIsAnimated] = useState(false);

    useEffect(() => {
        const updateDimensions = () => {
            if (containerRef.current) {
                setDimensions({
                    width: containerRef.current.offsetWidth,
                    height,
                });
            }
        };

        updateDimensions();
        window.addEventListener('resize', updateDimensions);

        // Trigger animation after mount
        const timer = setTimeout(() => setIsAnimated(true), 100);

        return () => {
            window.removeEventListener('resize', updateDimensions);
            clearTimeout(timer);
        };
    }, [height]);

    if (data.length === 0 || dimensions.width === 0) {
        return (
            <div
                ref={containerRef}
                className={cn("w-full animate-pulse bg-muted/50 rounded-lg", className)}
                style={{ height }}
            />
        );
    }

    const padding = { top: 20, right: 20, bottom: 40, left: 50 };
    const chartWidth = dimensions.width - padding.left - padding.right;
    const chartHeight = height - padding.top - padding.bottom;

    const maxValue = Math.max(
        ...data.map(d => Math.max(d.value, d.secondaryValue ?? 0))
    );
    const minValue = 0;
    const valueRange = maxValue - minValue || 1;

    const xStep = chartWidth / (data.length - 1 || 1);

    const getY = (value: number) =>
        chartHeight - ((value - minValue) / valueRange) * chartHeight;

    const createPath = (values: number[], filled = false) => {
        const points = values.map((v, i) => ({
            x: i * xStep,
            y: getY(v),
        }));

        let path = `M ${points[0].x} ${points[0].y}`;

        for (let i = 1; i < points.length; i++) {
            const cp1x = points[i - 1].x + xStep / 3;
            const cp1y = points[i - 1].y;
            const cp2x = points[i].x - xStep / 3;
            const cp2y = points[i].y;
            path += ` C ${cp1x} ${cp1y}, ${cp2x} ${cp2y}, ${points[i].x} ${points[i].y}`;
        }

        if (filled) {
            path += ` L ${points[points.length - 1].x} ${chartHeight}`;
            path += ` L 0 ${chartHeight} Z`;
        }

        return path;
    };

    const primaryValues = data.map(d => d.value);
    const secondaryValues = data.map(d => d.secondaryValue ?? 0);
    const hasSecondary = data.some(d => d.secondaryValue !== undefined);

    const gridLines = 5;
    const gridStep = valueRange / gridLines;

    return (
        <div ref={containerRef} className={cn("relative w-full", className)}>
            <svg
                width={dimensions.width}
                height={height}
                className="overflow-visible"
            >
                <defs>
                    <linearGradient id="primaryGradient" x1="0%" y1="0%" x2="0%" y2="100%">
                        <stop offset="0%" stopColor={primaryColor} stopOpacity="0.3" />
                        <stop offset="100%" stopColor={primaryColor} stopOpacity="0.02" />
                    </linearGradient>
                    <linearGradient id="secondaryGradient" x1="0%" y1="0%" x2="0%" y2="100%">
                        <stop offset="0%" stopColor={secondaryColor} stopOpacity="0.3" />
                        <stop offset="100%" stopColor={secondaryColor} stopOpacity="0.02" />
                    </linearGradient>
                    <filter id="glow">
                        <feGaussianBlur stdDeviation="2" result="coloredBlur" />
                        <feMerge>
                            <feMergeNode in="coloredBlur" />
                            <feMergeNode in="SourceGraphic" />
                        </feMerge>
                    </filter>
                </defs>

                <g transform={`translate(${padding.left}, ${padding.top})`}>
                    {/* Grid lines */}
                    {showGrid && Array.from({ length: gridLines + 1 }).map((_, i) => (
                        <g key={i}>
                            <line
                                x1={0}
                                y1={chartHeight - (i * chartHeight / gridLines)}
                                x2={chartWidth}
                                y2={chartHeight - (i * chartHeight / gridLines)}
                                stroke="currentColor"
                                strokeOpacity={0.08}
                                strokeDasharray="4 4"
                            />
                            <text
                                x={-10}
                                y={chartHeight - (i * chartHeight / gridLines) + 4}
                                textAnchor="end"
                                className="fill-muted-foreground text-[10px]"
                            >
                                {Math.round(minValue + i * gridStep)}
                            </text>
                        </g>
                    ))}

                    {/* Secondary area */}
                    {hasSecondary && (
                        <g className={cn(
                            "transition-all duration-1000 ease-out",
                            isAnimated ? "opacity-100" : "opacity-0"
                        )}>
                            <path
                                d={createPath(secondaryValues, true)}
                                fill="url(#secondaryGradient)"
                                className="transition-all duration-700"
                                style={{
                                    clipPath: isAnimated ? 'inset(0 0 0 0)' : 'inset(0 100% 0 0)',
                                }}
                            />
                            <path
                                d={createPath(secondaryValues)}
                                fill="none"
                                stroke={secondaryColor}
                                strokeWidth={2}
                                strokeLinecap="round"
                                className="transition-all duration-700"
                                style={{
                                    strokeDasharray: chartWidth * 2,
                                    strokeDashoffset: isAnimated ? 0 : chartWidth * 2,
                                }}
                            />
                        </g>
                    )}

                    {/* Primary area */}
                    <g className={cn(
                        "transition-all duration-1000 ease-out",
                        isAnimated ? "opacity-100" : "opacity-0"
                    )}>
                        <path
                            d={createPath(primaryValues, true)}
                            fill="url(#primaryGradient)"
                            className="transition-all duration-700"
                            style={{
                                clipPath: isAnimated ? 'inset(0 0 0 0)' : 'inset(0 100% 0 0)',
                            }}
                        />
                        <path
                            d={createPath(primaryValues)}
                            fill="none"
                            stroke={primaryColor}
                            strokeWidth={2.5}
                            strokeLinecap="round"
                            filter="url(#glow)"
                            className="transition-all duration-700"
                            style={{
                                strokeDasharray: chartWidth * 2,
                                strokeDashoffset: isAnimated ? 0 : chartWidth * 2,
                            }}
                        />
                    </g>

                    {/* Data points & Labels */}
                    {data.map((point, i) => (
                        <g
                            key={i}
                            onMouseEnter={() => setHoveredIndex(i)}
                            onMouseLeave={() => setHoveredIndex(null)}
                            className="cursor-pointer"
                        >
                            {/* Hover area */}
                            <rect
                                x={i * xStep - xStep / 2}
                                y={0}
                                width={xStep}
                                height={chartHeight}
                                fill="transparent"
                            />

                            {/* Vertical line on hover */}
                            {hoveredIndex === i && (
                                <line
                                    x1={i * xStep}
                                    y1={0}
                                    x2={i * xStep}
                                    y2={chartHeight}
                                    stroke="currentColor"
                                    strokeOpacity={0.2}
                                    strokeDasharray="4 4"
                                />
                            )}

                            {/* Primary point */}
                            <circle
                                cx={i * xStep}
                                cy={getY(point.value)}
                                r={hoveredIndex === i ? 6 : 4}
                                fill={primaryColor}
                                stroke="white"
                                strokeWidth={2}
                                className={cn(
                                    "transition-all duration-300",
                                    isAnimated ? "opacity-100 scale-100" : "opacity-0 scale-0"
                                )}
                                style={{ transitionDelay: `${i * 50}ms` }}
                            />

                            {/* Secondary point */}
                            {hasSecondary && point.secondaryValue !== undefined && (
                                <circle
                                    cx={i * xStep}
                                    cy={getY(point.secondaryValue)}
                                    r={hoveredIndex === i ? 5 : 3}
                                    fill={secondaryColor}
                                    stroke="white"
                                    strokeWidth={2}
                                    className={cn(
                                        "transition-all duration-300",
                                        isAnimated ? "opacity-100 scale-100" : "opacity-0 scale-0"
                                    )}
                                    style={{ transitionDelay: `${i * 50 + 25}ms` }}
                                />
                            )}

                            {/* X-axis labels */}
                            {showLabels && (
                                <text
                                    x={i * xStep}
                                    y={chartHeight + 20}
                                    textAnchor="middle"
                                    className="fill-muted-foreground text-[11px]"
                                >
                                    {point.label}
                                </text>
                            )}
                        </g>
                    ))}
                </g>
            </svg>

            {/* Tooltip */}
            {showTooltip && hoveredIndex !== null && (
                <div
                    className="absolute pointer-events-none z-10 px-3 py-2 bg-popover border rounded-lg shadow-lg text-sm animate-in fade-in-0 zoom-in-95 duration-150"
                    style={{
                        left: padding.left + hoveredIndex * xStep,
                        top: padding.top + getY(data[hoveredIndex].value) - 60,
                        transform: 'translateX(-50%)',
                    }}
                >
                    <div className="font-medium text-foreground">{data[hoveredIndex].label}</div>
                    <div className="flex items-center gap-2 mt-1">
                        <div className="w-2 h-2 rounded-full" style={{ backgroundColor: primaryColor }} />
                        <span className="text-muted-foreground">{primaryLabel}:</span>
                        <span className="font-semibold">{data[hoveredIndex].value}</span>
                    </div>
                    {hasSecondary && data[hoveredIndex].secondaryValue !== undefined && (
                        <div className="flex items-center gap-2">
                            <div className="w-2 h-2 rounded-full" style={{ backgroundColor: secondaryColor }} />
                            <span className="text-muted-foreground">{secondaryLabel}:</span>
                            <span className="font-semibold">{data[hoveredIndex].secondaryValue}</span>
                        </div>
                    )}
                </div>
            )}

            {/* Legend */}
            <div className="flex items-center justify-center gap-6 mt-4">
                <div className="flex items-center gap-2">
                    <div className="w-3 h-3 rounded-full" style={{ backgroundColor: primaryColor }} />
                    <span className="text-sm text-muted-foreground">{primaryLabel}</span>
                </div>
                {hasSecondary && (
                    <div className="flex items-center gap-2">
                        <div className="w-3 h-3 rounded-full" style={{ backgroundColor: secondaryColor }} />
                        <span className="text-sm text-muted-foreground">{secondaryLabel}</span>
                    </div>
                )}
            </div>
        </div>
    );
}
