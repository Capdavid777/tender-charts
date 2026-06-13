import { Skeleton } from '@/components/ui/skeleton';
import { Card, CardContent, CardHeader } from '@/components/ui/card';
import { cn } from '@/lib/utils';

/**
 * ChartSkeleton — mimics a bar chart with axis labels, gridlines,
 * a dashed target reference line, and bars of varied heights.
 */
interface ChartSkeletonProps {
  bars?: number;
  height?: number;
  titleWidth?: string;
  className?: string;
}

export function ChartSkeleton({
  bars = 14,
  height = 300,
  titleWidth = 'w-40',
  className,
}: ChartSkeletonProps) {
  // Deterministic pseudo-random heights so it looks like real data, not uniform.
  const heights = Array.from({ length: bars }, (_, i) => {
    const seed = Math.sin(i * 12.9898) * 43758.5453;
    const frac = seed - Math.floor(seed);
    return 30 + frac * 60; // 30%–90%
  });

  return (
    <Card className={className}>
      <CardHeader>
        <div className="flex items-center justify-between">
          <Skeleton className={cn('h-6', titleWidth)} />
          <div className="hidden sm:flex items-center gap-4">
            <div className="flex items-center gap-2">
              <Skeleton className="h-3 w-3 rounded" />
              <Skeleton className="h-3 w-20" />
            </div>
            <div className="flex items-center gap-2">
              <Skeleton className="h-3 w-3 rounded" />
              <Skeleton className="h-3 w-20" />
            </div>
          </div>
        </div>
      </CardHeader>
      <CardContent>
        <div className="relative flex gap-3 pl-10 pr-2" style={{ height }}>
          {/* Y-axis labels */}
          <div className="absolute left-0 top-0 bottom-6 flex flex-col justify-between py-1">
            {[0, 1, 2, 3, 4].map(i => (
              <Skeleton key={i} className="h-3 w-7" />
            ))}
          </div>

          {/* Gridlines */}
          <div className="absolute left-10 right-2 top-0 bottom-6 flex flex-col justify-between pointer-events-none">
            {[0, 1, 2, 3, 4].map(i => (
              <div key={i} className="border-t border-dashed border-border/60" />
            ))}
            {/* Target line */}
            <div className="absolute left-0 right-0 top-[35%] border-t-2 border-dashed border-accent/40" />
          </div>

          {/* Bars */}
          <div className="relative flex-1 flex items-end gap-[2%] pb-6">
            {heights.map((h, i) => (
              <Skeleton
                key={i}
                className="flex-1 rounded-t-md rounded-b-none bg-muted"
                style={{ height: `${h}%` }}
              />
            ))}
          </div>

          {/* X-axis labels */}
          <div className="absolute left-10 right-2 bottom-0 flex justify-between">
            {Array.from({ length: Math.min(7, bars) }).map((_, i) => (
              <Skeleton key={i} className="h-3 w-8" />
            ))}
          </div>
        </div>
      </CardContent>
    </Card>
  );
}

/**
 * TableSkeleton — mimics a data table with header row, body rows,
 * and an optional progress-bar column.
 */
interface TableSkeletonProps {
  rows?: number;
  columns?: number;
  withProgressColumn?: boolean;
  titleWidth?: string;
  className?: string;
}

export function TableSkeleton({
  rows = 8,
  columns = 5,
  withProgressColumn = true,
  titleWidth = 'w-44',
  className,
}: TableSkeletonProps) {
  const totalCols = columns + (withProgressColumn ? 1 : 0);

  return (
    <Card className={className}>
      <CardHeader>
        <div className="flex items-center gap-2">
          <Skeleton className="h-5 w-5 rounded" />
          <Skeleton className={cn('h-6', titleWidth)} />
        </div>
      </CardHeader>
      <CardContent>
        <div className="space-y-3">
          {/* Header row */}
          <div
            className="grid gap-4 pb-3 border-b"
            style={{ gridTemplateColumns: `repeat(${totalCols}, minmax(0, 1fr))` }}
          >
            {Array.from({ length: totalCols }).map((_, i) => (
              <Skeleton
                key={i}
                className={cn('h-4', i === 0 ? 'w-20' : 'w-16 ml-auto', withProgressColumn && i === totalCols - 1 && 'w-28 mx-auto')}
              />
            ))}
          </div>

          {/* Body rows */}
          {Array.from({ length: rows }).map((_, r) => (
            <div
              key={r}
              className="grid gap-4 items-center py-1"
              style={{ gridTemplateColumns: `repeat(${totalCols}, minmax(0, 1fr))` }}
            >
              {Array.from({ length: columns }).map((_, c) => (
                <Skeleton
                  key={c}
                  className={cn('h-4', c === 0 ? 'w-28' : 'w-20 ml-auto')}
                />
              ))}
              {withProgressColumn && (
                <div className="flex items-center gap-2">
                  <Skeleton className="flex-1 h-5 rounded-full" />
                  <Skeleton className="h-3 w-8" />
                </div>
              )}
            </div>
          ))}

          {/* Totals row */}
          <div
            className="grid gap-4 pt-3 border-t-2 items-center"
            style={{ gridTemplateColumns: `repeat(${totalCols}, minmax(0, 1fr))` }}
          >
            {Array.from({ length: totalCols }).map((_, i) => (
              <Skeleton
                key={i}
                className={cn('h-4', i === 0 ? 'w-24' : 'w-20 ml-auto')}
              />
            ))}
          </div>
        </div>
      </CardContent>
    </Card>
  );
}

/**
 * FilterBarSkeleton — mimics a page header with title, subtitle,
 * and right-aligned filter controls (e.g. month selector, dropdowns).
 */
interface FilterBarSkeletonProps {
  filters?: number;
  filterWidth?: string;
  showSubtitle?: boolean;
  className?: string;
}

export function FilterBarSkeleton({
  filters = 1,
  filterWidth = 'w-[180px]',
  showSubtitle = true,
  className,
}: FilterBarSkeletonProps) {
  return (
    <div className={cn('flex items-center justify-between flex-wrap gap-4', className)}>
      <div className="space-y-2">
        <Skeleton className="h-7 w-56" />
        {showSubtitle && <Skeleton className="h-4 w-72" />}
      </div>
      <div className="flex items-center gap-2">
        {Array.from({ length: filters }).map((_, i) => (
          <Skeleton key={i} className={cn('h-10 rounded-md', filterWidth)} />
        ))}
      </div>
    </div>
  );
}

/**
 * SearchSkeleton — mimics a search input, optionally paired with
 * adjacent filter chips or action buttons.
 */
interface SearchSkeletonProps {
  searchWidth?: string;
  chips?: number;
  withButton?: boolean;
  className?: string;
}

export function SearchSkeleton({
  searchWidth = 'w-full max-w-sm',
  chips = 0,
  withButton = false,
  className,
}: SearchSkeletonProps) {
  return (
    <div className={cn('flex items-center gap-2 flex-wrap', className)}>
      <div className={cn('relative', searchWidth)}>
        <Skeleton className="h-10 w-full rounded-md" />
        <Skeleton className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 rounded-full" />
      </div>
      {Array.from({ length: chips }).map((_, i) => (
        <Skeleton key={i} className="h-7 w-20 rounded-full" />
      ))}
      {withButton && <Skeleton className="h-10 w-28 rounded-md ml-auto" />}
    </div>
  );
}

/**
 * DropdownTriggerSkeleton — closed state of a Select/Dropdown.
 * Mimics the trigger button with placeholder label and chevron.
 */
interface DropdownTriggerSkeletonProps {
  width?: string;
  withLabel?: boolean;
  labelWidth?: string;
  className?: string;
}

export function DropdownTriggerSkeleton({
  width = 'w-[180px]',
  withLabel = false,
  labelWidth = 'w-20',
  className,
}: DropdownTriggerSkeletonProps) {
  return (
    <div className={cn('flex flex-col gap-1.5', className)}>
      {withLabel && <Skeleton className={cn('h-3', labelWidth)} />}
      <div
        className={cn(
          'relative inline-flex items-center justify-between rounded-md border border-input bg-background px-3 h-10',
          width,
        )}
      >
        <Skeleton className="h-4 w-2/3" />
        <Skeleton className="h-3 w-3 rounded-sm" />
      </div>
    </div>
  );
}

/**
 * DropdownOpenSkeleton — open state of a Select/Dropdown.
 * Renders the trigger plus a popover panel with option rows
 * (each row has an optional check indicator and a label).
 */
interface DropdownOpenSkeletonProps {
  width?: string;
  options?: number;
  withCheck?: boolean;
  withLabel?: boolean;
  labelWidth?: string;
  className?: string;
}

export function DropdownOpenSkeleton({
  width = 'w-[180px]',
  options = 6,
  withCheck = true,
  withLabel = false,
  labelWidth = 'w-20',
  className,
}: DropdownOpenSkeletonProps) {
  // Deterministic varied option-label widths so the panel doesn't look uniform.
  const labelWidths = ['w-24', 'w-32', 'w-20', 'w-28', 'w-36', 'w-24', 'w-32', 'w-20'];

  return (
    <div className={cn('flex flex-col gap-1.5', className)}>
      {withLabel && <Skeleton className={cn('h-3', labelWidth)} />}
      <div className={cn('relative', width)}>
        {/* Trigger */}
        <div className="relative inline-flex items-center justify-between rounded-md border border-input bg-background px-3 h-10 w-full">
          <Skeleton className="h-4 w-2/3" />
          <Skeleton className="h-3 w-3 rounded-sm" />
        </div>

        {/* Popover panel */}
        <div className="absolute left-0 right-0 top-full mt-1 rounded-md border bg-popover shadow-md p-1 z-50 animate-fade-in">
          {Array.from({ length: options }).map((_, i) => (
            <div
              key={i}
              className={cn(
                'flex items-center gap-2 px-2 py-1.5 rounded-sm',
                i === 0 && 'bg-accent/30',
              )}
            >
              {withCheck && <Skeleton className="h-3.5 w-3.5 rounded-sm shrink-0" />}
              <Skeleton className={cn('h-4', labelWidths[i % labelWidths.length])} />
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}


