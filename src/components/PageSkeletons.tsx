import DashboardLayout from '@/components/layout/DashboardLayout';
import { Skeleton } from '@/components/ui/skeleton';

function LayoutShell({ children }: { children: React.ReactNode }) {
  return <DashboardLayout>{children}</DashboardLayout>;
}

function KpiRow({ count = 4 }: { count?: number }) {
  return (
    <div className={`grid gap-4 grid-cols-1 sm:grid-cols-2 lg:grid-cols-${count}`}>
      {Array.from({ length: count }).map((_, i) => (
        <div key={i} className="rounded-lg border bg-card p-5 space-y-3">
          <Skeleton className="h-3 w-24" />
          <Skeleton className="h-7 w-32" />
          <Skeleton className="h-3 w-16" />
        </div>
      ))}
    </div>
  );
}

function ChartBlock({ height = 'h-72' }: { height?: string }) {
  return (
    <div className="rounded-lg border bg-card p-5 space-y-4">
      <Skeleton className="h-4 w-40" />
      <Skeleton className={`${height} w-full`} />
    </div>
  );
}

function TableBlock({ rows = 6 }: { rows?: number }) {
  return (
    <div className="rounded-lg border bg-card p-5 space-y-3">
      <Skeleton className="h-4 w-48" />
      <div className="space-y-2 pt-2">
        {Array.from({ length: rows }).map((_, i) => (
          <div key={i} className="grid grid-cols-6 gap-3">
            {Array.from({ length: 6 }).map((_, j) => (
              <Skeleton key={j} className="h-4 w-full" />
            ))}
          </div>
        ))}
      </div>
    </div>
  );
}

export function DashboardSkeleton() {
  return (
    <LayoutShell>
      <div className="space-y-6">
        <div className="flex items-center justify-between">
          <Skeleton className="h-8 w-56" />
          <Skeleton className="h-9 w-40" />
        </div>
        <KpiRow count={4} />
        <div className="grid gap-4 lg:grid-cols-3">
          <div className="lg:col-span-2"><ChartBlock height="h-80" /></div>
          <ChartBlock height="h-80" />
        </div>
        <TableBlock rows={6} />
      </div>
    </LayoutShell>
  );
}

export function RoomTypesSkeleton() {
  return (
    <LayoutShell>
      <div className="space-y-6">
        <Skeleton className="h-8 w-48" />
        <KpiRow count={4} />
        <div className="grid gap-4 md:grid-cols-2">
          <ChartBlock />
          <ChartBlock />
        </div>
        <TableBlock rows={4} />
      </div>
    </LayoutShell>
  );
}

export function HistoricalSkeleton() {
  return (
    <LayoutShell>
      <div className="space-y-6">
        <Skeleton className="h-8 w-56" />
        <KpiRow count={3} />
        <ChartBlock height="h-96" />
        <TableBlock rows={8} />
      </div>
    </LayoutShell>
  );
}

export function AnalysisSkeleton() {
  return (
    <LayoutShell>
      <div className="space-y-6">
        <div className="flex items-center justify-between">
          <Skeleton className="h-8 w-40" />
          <Skeleton className="h-9 w-32" />
        </div>
        <div className="rounded-lg border bg-card p-5 space-y-4">
          <Skeleton className="h-6 w-3/4" />
          <div className="space-y-2">
            <Skeleton className="h-4 w-full" />
            <Skeleton className="h-4 w-full" />
            <Skeleton className="h-4 w-5/6" />
            <Skeleton className="h-4 w-4/6" />
          </div>
          <Skeleton className="h-64 w-full" />
        </div>
      </div>
    </LayoutShell>
  );
}

export function WebsiteAnalyticsSkeleton() {
  return (
    <LayoutShell>
      <div className="space-y-6">
        <Skeleton className="h-8 w-64" />
        <KpiRow count={4} />
        <div className="grid gap-4 lg:grid-cols-2">
          <ChartBlock />
          <ChartBlock />
        </div>
        <TableBlock rows={5} />
      </div>
    </LayoutShell>
  );
}

export function UploadSkeleton() {
  return (
    <LayoutShell>
      <div className="max-w-3xl mx-auto space-y-6">
        <Skeleton className="h-8 w-40" />
        <div className="rounded-lg border bg-card p-8 space-y-4">
          <Skeleton className="h-5 w-56" />
          <Skeleton className="h-48 w-full rounded-md" />
          <div className="flex gap-3">
            <Skeleton className="h-10 w-32" />
            <Skeleton className="h-10 w-24" />
          </div>
        </div>
      </div>
    </LayoutShell>
  );
}

export function ChangelogSkeleton() {
  return (
    <LayoutShell>
      <div className="space-y-6">
        <Skeleton className="h-8 w-48" />
        {Array.from({ length: 4 }).map((_, i) => (
          <div key={i} className="rounded-lg border bg-card p-5 space-y-3">
            <div className="flex items-center justify-between">
              <Skeleton className="h-5 w-40" />
              <Skeleton className="h-4 w-24" />
            </div>
            <Skeleton className="h-4 w-full" />
            <Skeleton className="h-4 w-5/6" />
          </div>
        ))}
      </div>
    </LayoutShell>
  );
}

export function NotFoundSkeleton() {
  return (
    <div className="min-h-screen flex items-center justify-center bg-background">
      <div className="space-y-3 text-center">
        <Skeleton className="h-10 w-40 mx-auto" />
        <Skeleton className="h-4 w-64 mx-auto" />
      </div>
    </div>
  );
}
