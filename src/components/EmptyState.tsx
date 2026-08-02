import { ReactNode } from 'react';
import { Card, CardContent } from '@/components/ui/card';
import { cn } from '@/lib/utils';

interface EmptyStateProps {
  icon?: ReactNode;
  title: string;
  description?: ReactNode;
  action?: ReactNode;
  /** Render without the surrounding Card (for use inside an existing card). */
  bare?: boolean;
  className?: string;
}

export default function EmptyState({
  icon,
  title,
  description,
  action,
  bare = false,
  className,
}: EmptyStateProps) {
  const body = (
    <div className={cn('flex flex-col items-center justify-center text-center px-6 py-12', className)}>
      {icon && (
        <div className="mb-4 flex h-12 w-12 items-center justify-center rounded-full bg-muted text-muted-foreground">
          {icon}
        </div>
      )}
      <h3 className="text-base font-semibold text-foreground">{title}</h3>
      {description && (
        <p className="mt-1.5 max-w-md text-sm text-muted-foreground">{description}</p>
      )}
      {action && <div className="mt-5 flex flex-wrap items-center justify-center gap-2">{action}</div>}
    </div>
  );

  if (bare) return body;

  return (
    <Card className="border-dashed">
      <CardContent className="p-0">{body}</CardContent>
    </Card>
  );
}
