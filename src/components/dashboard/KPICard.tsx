import { ReactNode } from 'react';
import { Card, CardContent } from '@/components/ui/card';
import { useCountUp } from '@/hooks/useCountUp';
import Sparkline from '@/components/dashboard/Sparkline';
import CircularProgress from '@/components/ui/circular-progress';
import { cn } from '@/lib/utils';



interface KPICardProps {
  title: string;
  value: string;
  subtitle?: string;
  secondarySubtitle?: string;
  secondarySubtitleClassName?: string;
  icon: ReactNode;
  trend?: {
    value: number;
    label: string;
  };
  progress?: number;
  progressStyle?: 'bar' | 'ring';
  variant?: 'default' | 'success' | 'warning' | 'danger';
  sparklineData?: number[];
}

const variantSparklineColors: Record<NonNullable<KPICardProps['variant']>, string> = {
  default: 'hsl(var(--primary))',
  success: 'hsl(var(--success))',
  warning: 'hsl(var(--warning))',
  danger: 'hsl(var(--destructive))',
};

export default function KPICard({ 
  title, 
  value, 
  subtitle, 
  secondarySubtitle,
  secondarySubtitleClassName,
  icon, 
  trend, 
  progress,
  variant = 'default',
  sparklineData,
}: KPICardProps) {
  const animatedValue = useCountUp(value);

  const variantStyles = {
    default: 'border-l-primary',
    success: 'border-l-success',
    warning: 'border-l-warning',
    danger: 'border-l-destructive',
  };


  const trendColor = trend && trend.value >= 0 ? 'text-success' : 'text-destructive';

  const clampedProgress = progress !== undefined ? Math.min(progress, 100) : 0;

  return (
    <Card className={cn(
      'h-full flex flex-col overflow-hidden border-l-4 transition-all duration-300 hover:-translate-y-1 hover:shadow-card-hover',
      variantStyles[variant]
    )}>
      <CardContent className="p-6 flex flex-col flex-1">
        <div className="flex items-start justify-between">
          <div className="space-y-1 min-w-0">
            <p className="text-sm font-medium text-muted-foreground">{title}</p>
            <p className="text-2xl font-bold text-foreground tabular-nums">{animatedValue}</p>
            {subtitle && (
              <p className="text-sm text-muted-foreground truncate">{subtitle}</p>
            )}
            {secondarySubtitle && (
              <p className={cn('text-sm font-medium', secondarySubtitleClassName || 'text-muted-foreground')}>{secondarySubtitle}</p>
            )}
            {trend && (
              <p className={cn('text-sm font-medium', trendColor)}>
                {trend.value >= 0 ? '+' : ''}{trend.value.toFixed(2)}% {trend.label}
              </p>
            )}
          </div>
          <div className="flex-shrink-0 p-3 rounded-lg bg-secondary">
            {icon}
          </div>
        </div>

        {sparklineData && sparklineData.length >= 2 && (
          <div className="mt-3 -mx-2">
            <Sparkline data={sparklineData} color={variantSparklineColors[variant]} />
          </div>
        )}
        
        {progress !== undefined && (
          <div className="mt-auto pt-4">
            <div className="flex items-center justify-between text-sm mb-1">
              <span className="text-muted-foreground">Progress to target</span>
              <span className="font-medium">{progress.toFixed(2)}%</span>
            </div>
            <div className="h-2 bg-secondary rounded-full overflow-hidden">
              <div
                className={cn(
                  'h-full rounded-full animate-progress-fill',
                  progress >= 100 ? 'bg-success' : progress >= 80 ? 'bg-accent' : 'bg-destructive'
                )}
                style={{ ['--progress-target' as any]: `${clampedProgress}%`, width: `${clampedProgress}%` }}
              />
            </div>
          </div>
        )}
      </CardContent>
    </Card>
  );
}