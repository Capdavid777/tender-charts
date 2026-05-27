import { ReactNode } from 'react';
import { Card, CardContent } from '@/components/ui/card';
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
  variant?: 'default' | 'success' | 'warning' | 'danger';
}

export default function KPICard({ 
  title, 
  value, 
  subtitle, 
  secondarySubtitle,
  secondarySubtitleClassName,
  icon, 
  trend, 
  progress,
  variant = 'default' 
}: KPICardProps) {
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
      'overflow-hidden border-l-4 transition-all duration-300 hover:-translate-y-1 hover:shadow-card-hover',
      variantStyles[variant]
    )}>
      <CardContent className="p-6">
        <div className="flex items-start justify-between">
          <div className="space-y-1">
            <p className="text-sm font-medium text-muted-foreground">{title}</p>
            <p className="text-2xl font-bold text-foreground">{value}</p>
            {subtitle && (
              <p className="text-sm text-muted-foreground">{subtitle}</p>
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
        
        {progress !== undefined && (
          <div className="mt-4">
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