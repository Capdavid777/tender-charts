import { AlertTriangle, TrendingDown, X } from 'lucide-react';
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert';
import { Button } from '@/components/ui/button';
import { cn } from '@/lib/utils';

interface AlertBannerProps {
  alerts: {
    id: string;
    type: 'revenue' | 'occupancy' | 'general';
    title: string;
    message: string;
    severity: 'warning' | 'critical';
  }[];
  onDismiss?: (id: string) => void;
}

export default function AlertBanner({ alerts, onDismiss }: AlertBannerProps) {
  if (alerts.length === 0) return null;

  return (
    <div className="space-y-3 animate-fade-in">
      {alerts.map((alert) => (
        <Alert 
          key={alert.id}
          className={cn(
            'border-l-4',
            alert.severity === 'critical' 
              ? 'border-l-destructive bg-destructive/5' 
              : 'border-l-warning bg-warning/5'
          )}
        >
          <div className="flex items-start gap-3">
            {alert.type === 'revenue' ? (
              <TrendingDown className={cn(
                'h-5 w-5 mt-0.5',
                alert.severity === 'critical' ? 'text-destructive' : 'text-warning'
              )} />
            ) : (
              <AlertTriangle className={cn(
                'h-5 w-5 mt-0.5',
                alert.severity === 'critical' ? 'text-destructive' : 'text-warning'
              )} />
            )}
            <div className="flex-1">
              <AlertTitle className="font-semibold">{alert.title}</AlertTitle>
              <AlertDescription className="text-muted-foreground">
                {alert.message}
              </AlertDescription>
            </div>
            {onDismiss && (
              <Button 
                variant="ghost" 
                size="sm" 
                className="h-6 w-6 p-0"
                onClick={() => onDismiss(alert.id)}
              >
                <X className="h-4 w-4" />
              </Button>
            )}
          </div>
        </Alert>
      ))}
    </div>
  );
}