import { useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { formatCurrency, formatPercent } from '@/lib/format';
import { CalendarDays, ArrowUp, ArrowDown, ChevronsUpDown } from 'lucide-react';
import { cn } from '@/lib/utils';
import { usePrefersReducedMotion } from '@/hooks/usePrefersReducedMotion';



interface DailyRecord {
  date: string;
  revenue: number;
  occupancy: number | null;
  average_rate: number | null;
  rooms_sold: number | null;
}

interface DailyDataTableProps {
  data: DailyRecord[];
  dailyTarget?: number;
  title?: string;
  icon?: React.ReactNode;
  variant?: 'default' | 'forecast';
}

type SortKey = 'date' | 'revenue' | 'rooms_sold' | 'occupancy' | 'average_rate';
type SortDir = 'asc' | 'desc';

export default function DailyDataTable({ data, dailyTarget = 0, title = 'Daily Breakdown', icon, variant = 'default' }: DailyDataTableProps) {
  const prefersReduced = usePrefersReducedMotion();
  const [sortKey, setSortKey] = useState<SortKey>('date');
  const [sortDir, setSortDir] = useState<SortDir>('asc');

  if (data.length === 0) return null;

  const toggleSort = (key: SortKey) => {
    if (key === sortKey) {
      setSortDir(d => (d === 'asc' ? 'desc' : 'asc'));
    } else {
      setSortKey(key);
      // Numeric columns are most useful highest-first on the first click
      setSortDir(key === 'date' ? 'asc' : 'desc');
    }
  };

  // Only show days with actual data
  const rows = [...data].filter(
    d => d.revenue > 0 || (d.rooms_sold ?? 0) > 0 || (d.occupancy ?? 0) > 0
  );

  const dir = sortDir === 'asc' ? 1 : -1;
  const sorted = rows.sort((a, b) => {
    if (sortKey === 'date') return a.date.localeCompare(b.date) * dir;
    const av = (a[sortKey] ?? 0) as number;
    const bv = (b[sortKey] ?? 0) as number;
    if (av === bv) return a.date.localeCompare(b.date);
    return (av - bv) * dir;
  });


  // Totals / averages
  const totalRevenue = sorted.reduce((s, d) => s + d.revenue, 0);
  const daysWithOcc = sorted.filter(d => (d.occupancy ?? 0) > 0);
  const avgOccupancy = daysWithOcc.length > 0
    ? daysWithOcc.reduce((s, d) => s + (d.occupancy || 0), 0) / daysWithOcc.length
    : 0;
  const daysWithRate = sorted.filter(d => (d.average_rate ?? 0) > 0);
  const avgRate = daysWithRate.length > 0
    ? daysWithRate.reduce((s, d) => s + (d.average_rate || 0), 0) / daysWithRate.length
    : 0;
  const totalRoomsSold = sorted.reduce((s, d) => s + (d.rooms_sold || 0), 0);

  // Best / weakest revenue day (only meaningful with more than one day)
  let bestDate: string | null = null;
  let worstDate: string | null = null;
  const revenueDays = sorted.filter(d => d.revenue > 0);
  if (revenueDays.length > 1) {
    bestDate = revenueDays.reduce((a, b) => (b.revenue > a.revenue ? b : a)).date;
    worstDate = revenueDays.reduce((a, b) => (b.revenue < a.revenue ? b : a)).date;
    if (bestDate === worstDate) worstDate = null;
  }

  const todayStr = new Date().toLocaleDateString('en-CA'); // YYYY-MM-DD, local

  const surfaceBg = variant === 'forecast' ? 'bg-[hsl(var(--card))]' : 'bg-card';
  const stickyHead = cn('sticky top-0 z-20 backdrop-blur supports-[backdrop-filter]:bg-card/95', surfaceBg);
  const stickyFoot = 'sticky bottom-0 z-20 bg-secondary border-t-2 border-border';


  const SortHead = ({ label, colKey, align = 'right' }: { label: string; colKey: SortKey; align?: 'left' | 'right' }) => {
    const active = sortKey === colKey;
    const Icon = active ? (sortDir === 'asc' ? ArrowUp : ArrowDown) : ChevronsUpDown;
    return (
      <TableHead className={cn(stickyHead, 'p-0')}>
        <button
          type="button"
          onClick={() => toggleSort(colKey)}
          aria-label={`Sort by ${label}`}
          aria-sort={active ? (sortDir === 'asc' ? 'ascending' : 'descending') : 'none'}
          className={cn(
            'w-full h-12 px-4 flex items-center gap-1.5 text-sm font-medium transition-colors hover:text-foreground',
            active ? 'text-foreground' : 'text-muted-foreground',
            align === 'right' ? 'justify-end' : 'justify-start'
          )}
        >
          {align === 'right' && <Icon className={cn('w-3.5 h-3.5', !active && 'opacity-40')} />}
          {label}
          {align === 'left' && <Icon className={cn('w-3.5 h-3.5', !active && 'opacity-40')} />}
        </button>
      </TableHead>
    );
  };

  return (
    <Card className={cn(variant === 'forecast' && 'border-dashed border-muted-foreground/30 bg-muted/20')}>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          {icon || <CalendarDays className="w-5 h-5 text-primary" />}
          {title}
          {variant === 'forecast' && (
            <span className="text-xs font-normal text-muted-foreground bg-muted px-2 py-0.5 rounded-full">Projected</span>
          )}
        </CardTitle>
      </CardHeader>
      <CardContent>
        <div className="max-h-[400px] overflow-auto">
          <Table>
            <TableHeader>
              <TableRow className="hover:bg-transparent">
                <SortHead label="Date" colKey="date" align="left" />
                <SortHead label="Revenue" colKey="revenue" />
                <SortHead label="Rooms Sold" colKey="rooms_sold" />
                <SortHead label="Occupancy" colKey="occupancy" />
                <SortHead label="ADR" colKey="average_rate" />

                {dailyTarget > 0 && (
                  <TableHead className={cn(stickyHead, 'text-center min-w-[180px]')}>Daily Target Progress</TableHead>
                )}
              </TableRow>
            </TableHeader>
            <TableBody>
              {sorted.map((d, i) => {
                const dateLabel = new Date(d.date).toLocaleDateString('en-ZA', {
                  weekday: 'short',
                  day: 'numeric',
                  month: 'short',
                });
                const occ = d.occupancy != null && d.occupancy > 0 ? d.occupancy * 100 : null;
                const progress = dailyTarget > 0 ? Math.min((d.revenue / dailyTarget) * 100, 100) : 0;
                const progressPct = dailyTarget > 0 ? (d.revenue / dailyTarget) * 100 : 0;
                const isBest = d.date === bestDate;
                const isWorst = d.date === worstDate;
                const isToday = d.date === todayStr;

                return (
                  <TableRow
                    key={d.date}
                    className={cn(
                      isBest && 'bg-success/10',
                      isWorst && 'bg-destructive/10',
                      isToday && 'ring-1 ring-inset ring-primary/40',
                      !prefersReduced && 'animate-fade-in'
                    )}
                    style={!prefersReduced ? { animationDelay: `${Math.min(i * 12, 300)}ms`, animationFillMode: 'both' } : undefined}
                  >
                    <TableCell className="font-medium">
                      <span className="flex items-center gap-2">
                        {dateLabel}
                        {isBest && (
                          <span className="text-[10px] font-semibold uppercase tracking-wide text-success bg-success/15 px-1.5 py-0.5 rounded">Best</span>
                        )}
                        {isWorst && (
                          <span className="text-[10px] font-semibold uppercase tracking-wide text-destructive bg-destructive/15 px-1.5 py-0.5 rounded">Lowest</span>
                        )}
                      </span>
                    </TableCell>

                    <TableCell className="text-right">{formatCurrency(d.revenue)}</TableCell>
                    <TableCell className="text-right">{d.rooms_sold ?? '—'}</TableCell>
                    <TableCell className="text-right">
                      {occ != null ? formatPercent(occ) : '—'}
                    </TableCell>
                    <TableCell className="text-right">
                      {(d.average_rate ?? 0) > 0 ? formatCurrency(d.average_rate!) : '—'}
                    </TableCell>
                    {dailyTarget > 0 && (
                      <TableCell>
                        <div className="flex items-center gap-2">
                          <div className="flex-1 h-5 bg-secondary rounded-full overflow-hidden">
                            <div
                              className={cn(
                                'h-full rounded-full transition-all duration-500',
                                progressPct >= 100 ? 'bg-success' : progressPct >= 80 ? 'bg-accent' : 'bg-warning'
                              )}
                              style={{ width: `${progress}%` }}
                            />
                          </div>
                          <span className="text-xs font-medium text-muted-foreground w-10 text-right">
                            {Math.round(progressPct)}%
                          </span>
                        </div>
                      </TableCell>
                    )}
                  </TableRow>
                );
              })}
              {/* Summary row — pinned to the bottom of the scroll area */}
              <TableRow className="font-semibold hover:bg-transparent">
                <TableCell className={stickyFoot}>Total / Avg</TableCell>
                <TableCell className={cn(stickyFoot, 'text-right')}>{formatCurrency(totalRevenue)}</TableCell>
                <TableCell className={cn(stickyFoot, 'text-right')}>{totalRoomsSold}</TableCell>
                <TableCell className={cn(stickyFoot, 'text-right')}>
                  {avgOccupancy > 0 ? formatPercent(avgOccupancy * 100) : '—'}
                </TableCell>
                <TableCell className={cn(stickyFoot, 'text-right')}>
                  {avgRate > 0 ? formatCurrency(Math.round(avgRate)) : '—'}
                </TableCell>
                {dailyTarget > 0 && <TableCell className={stickyFoot} />}
              </TableRow>

            </TableBody>
          </Table>
        </div>
      </CardContent>
    </Card>
  );
}