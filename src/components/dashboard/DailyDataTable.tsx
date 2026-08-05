import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { formatCurrency, formatPercent } from '@/lib/format';
import { CalendarDays } from 'lucide-react';
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

export default function DailyDataTable({ data, dailyTarget = 0, title = 'Daily Breakdown', icon, variant = 'default' }: DailyDataTableProps) {
  const prefersReduced = usePrefersReducedMotion();

  if (data.length === 0) return null;


  // Only show days with actual data, sorted ascending
  const sorted = [...data]
    .filter(d => d.revenue > 0 || (d.rooms_sold ?? 0) > 0 || (d.occupancy ?? 0) > 0)
    .sort((a, b) => a.date.localeCompare(b.date));

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
                <TableHead className={cn(stickyHead, 'text-left')}>Date</TableHead>
                <TableHead className={cn(stickyHead, 'text-right')}>Revenue</TableHead>
                <TableHead className={cn(stickyHead, 'text-right')}>Rooms Sold</TableHead>
                <TableHead className={cn(stickyHead, 'text-right')}>Occupancy</TableHead>
                <TableHead className={cn(stickyHead, 'text-right')}>ADR</TableHead>
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
              {/* Summary row */}
              <TableRow className="border-t-2 font-semibold bg-muted/50">
                <TableCell>Total / Avg</TableCell>
                <TableCell className="text-right">{formatCurrency(totalRevenue)}</TableCell>
                <TableCell className="text-right">{totalRoomsSold}</TableCell>
                <TableCell className="text-right">
                  {avgOccupancy > 0 ? formatPercent(avgOccupancy * 100) : '—'}
                </TableCell>
                <TableCell className="text-right">
                  {avgRate > 0 ? formatCurrency(Math.round(avgRate)) : '—'}
                </TableCell>
                {dailyTarget > 0 && <TableCell />}
              </TableRow>
            </TableBody>
          </Table>
        </div>
      </CardContent>
    </Card>
  );
}