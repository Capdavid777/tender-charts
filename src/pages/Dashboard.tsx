import { useState, useEffect, useMemo, useCallback, useRef } from 'react';
import { useQuery, useQueryClient, keepPreviousData, type QueryClient } from '@tanstack/react-query';
import { cn } from '@/lib/utils';
import { usePrefersReducedMotion } from '@/hooks/usePrefersReducedMotion';

import DashboardLayout from '@/components/layout/DashboardLayout';
import KPICard from '@/components/dashboard/KPICard';
import AlertBanner from '@/components/dashboard/AlertBanner';
import RevenueChart from '@/components/dashboard/RevenueChart';
import { DollarSign, Percent, TrendingUp, Target, TrendingUpDown, AlertTriangle, RefreshCw, CalendarX, Inbox, LineChart } from 'lucide-react';
import EmptyState from '@/components/EmptyState';
import { Link } from 'react-router-dom';
import { useAuth } from '@/contexts/AuthContext';

import { Alert, AlertTitle, AlertDescription } from '@/components/ui/alert';
import { Button } from '@/components/ui/button';
import { supabase } from '@/integrations/supabase/client';
import { formatCurrency, formatPercent } from '@/lib/format';
import { useMonth } from '@/contexts/MonthContext';
import MonthSelector from '@/components/MonthSelector';
import AnalysisSummary from '@/components/dashboard/AnalysisSummary';
import DailyDataTable from '@/components/dashboard/DailyDataTable';
import MonthProjectionSummary from '@/components/dashboard/MonthProjectionSummary';
import OtherIncomeSummary, { OtherIncomeItem } from '@/components/dashboard/OtherIncomeSummary';
import PerfPanel from '@/components/dashboard/PerfPanel';
import { Skeleton } from '@/components/ui/skeleton';
import { ChartSkeleton, TableSkeleton, FilterBarSkeleton, KPICardSkeleton } from '@/components/ui/skeleton-variants';
import LazySection from '@/components/dashboard/LazySection';
import { Card, CardContent } from '@/components/ui/card';
import { perfRegistry, useMemoTracked } from '@/lib/perf';

const PERF_SCOPE = 'Dashboard';

interface DailyData {
  date: string;
  revenue: number;
  target: number;
  isWeekend?: boolean;
}

interface RawDailyData {
  date: string;
  revenue: number;
  rooms_sold: number | null;
  average_rate: number | null;
  occupancy: number | null;
}

interface MonthlyTarget {
  target_revenue: number;
  target_occupancy: number | null;
  available_rooms: number;
  breakeven_rate: number;
  breakeven_occupancy: number;
  room_cost_per_occupied: number;
}

function formatMonthLabel(key: string): string {
  if (!key) return 'this month';
  const [year, month] = key.split('-').map(Number);
  if (!year || !month) return key;
  return new Date(year, month - 1, 1).toLocaleDateString('en-ZA', { month: 'long', year: 'numeric' });
}

const otherIncomeQueryKey = (month: string | null) => ['dashboard', 'otherIncome', month || 'none'] as const;

async function fetchOtherIncome(selectedMonth: string | null): Promise<OtherIncomeItem[]> {
  if (!selectedMonth) return [];
  const [year, month] = selectedMonth.split('-').map(Number);
  const { data, error } = await supabase
    .from('other_income')
    .select('product_type, revenue')
    .eq('year', year)
    .eq('month', month)
    .order('revenue', { ascending: false });
  if (error) throw error;
  return (data as OtherIncomeItem[]) || [];
}
const DASHBOARD_CORE_KEY = ['dashboard', 'core'] as const;
const CORE_STALE_TIME = 1000 * 60 * 5;

async function fetchDashboardCore() {
  const [uploadsRes, revenueRes, roomTypesRes, targetsRes] = await Promise.all([
    supabase.from('data_uploads').select('uploaded_at').order('uploaded_at', { ascending: false }).limit(1),
    supabase.from('daily_revenue').select('date, revenue, rooms_sold, average_rate, occupancy').is('room_type_id', null).order('date', { ascending: true }),
    supabase.from('room_types').select('total_rooms'),
    supabase.from('monthly_targets').select('*'),
  ]);

  const firstError = [uploadsRes, revenueRes, roomTypesRes, targetsRes]
    .map((r: any) => r?.error)
    .find(Boolean);
  if (firstError) throw firstError;

  const lastUpdatedStr = uploadsRes.data && uploadsRes.data.length > 0
    ? new Date(uploadsRes.data[0].uploaded_at).toLocaleDateString('en-ZA', {
        day: 'numeric', month: 'short', year: 'numeric',
        hour: '2-digit', minute: '2-digit',
      })
    : 'No data uploaded yet';

  const allDataResult = (revenueRes.data || []) as RawDailyData[];
  const totalRoomsResult = (roomTypesRes.data || []).reduce((sum, rt) => sum + (rt.total_rooms || 0), 0) || 80;

  const targetsMap: Record<string, MonthlyTarget> = {};
  (targetsRes.data || []).forEach(t => {
    const key = `${t.year}-${String(t.month).padStart(2, '0')}`;
    targetsMap[key] = {
      target_revenue: Number(t.target_revenue),
      target_occupancy: Number(t.target_occupancy),
      available_rooms: Number((t as any).available_rooms || 0),
      breakeven_rate: Number((t as any).breakeven_rate || 0),
      breakeven_occupancy: Number((t as any).breakeven_occupancy || 0),
      room_cost_per_occupied: Number((t as any).room_cost_per_occupied || 0),
    };
  });

  return { lastUpdated: lastUpdatedStr, allData: allDataResult, totalRooms: totalRoomsResult, monthlyTargets: targetsMap };
}

/** Warm the Dashboard's data when its nav link is hovered/focused. */
export function prefetchRouteData(queryClient: QueryClient, month?: string) {
  queryClient.prefetchQuery({
    queryKey: DASHBOARD_CORE_KEY,
    queryFn: fetchDashboardCore,
    staleTime: CORE_STALE_TIME,
  });
  if (month) {
    queryClient.prefetchQuery({
      queryKey: otherIncomeQueryKey(month),
      queryFn: () => fetchOtherIncome(month),
      staleTime: CORE_STALE_TIME,
    });
  }
}

export default function Dashboard() {


  // Render timing: mark start synchronously, record duration after commit.
  const renderStart = useRef(performance.now());
  renderStart.current = performance.now();
  useEffect(() => {
    perfRegistry.recordRender(PERF_SCOPE, performance.now() - renderStart.current);
  });

  const [dismissedAlerts, setDismissedAlerts] = useState<string[]>([]);
  const [lastUpdated, setLastUpdated] = useState('');
  const [allData, setAllData] = useState<RawDailyData[]>([]);
  const [loading, setLoading] = useState(true);
  const { selectedMonth, setSelectedMonth } = useMonth();
  const { isAdmin } = useAuth();
  const monthLabel = useMemo(() => formatMonthLabel(selectedMonth), [selectedMonth]);

  const [totalRooms, setTotalRooms] = useState(80);
  const [monthlyTargets, setMonthlyTargets] = useState<Record<string, MonthlyTarget>>({});
  // Per-month other income — kept previous month's data on screen while the new month loads.
  const monthClient = useQueryClient();
  const otherIncomeQuery = useQuery({
    queryKey: otherIncomeQueryKey(selectedMonth),
    queryFn: () => fetchOtherIncome(selectedMonth),
    placeholderData: keepPreviousData,
    staleTime: 1000 * 60 * 5,
  });
  const otherIncomeItems = otherIncomeQuery.data ?? [];

  // Warm adjacent months so switching feels instant.
  const prefetchMonth = useCallback((month: string) => {
    if (!month) return;
    monthClient.prefetchQuery({
      queryKey: otherIncomeQueryKey(month),
      queryFn: () => fetchOtherIncome(month),
      staleTime: 1000 * 60 * 5,
    });
  }, [monthClient]);

  useEffect(() => {
    if (!selectedMonth) return;
    const [y, m] = selectedMonth.split('-').map(Number);
    const shift = (delta: number) => {
      const d = new Date(y, m - 1 + delta, 1);
      return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}`;
    };
    const id = window.setTimeout(() => {
      prefetchMonth(shift(-1));
      prefetchMonth(shift(1));
    }, 150);
    return () => window.clearTimeout(id);
  }, [selectedMonth, prefetchMonth]);

  // Brief settle window on every month change so recomputed charts/tables cross-fade
  // instead of snapping, even when the data is served straight from cache.
  const prefersReducedMotion = usePrefersReducedMotion();
  const [monthSettling, setMonthSettling] = useState(false);
  const firstMonthRef = useRef(true);
  useEffect(() => {
    if (!selectedMonth) return;
    if (firstMonthRef.current) {
      firstMonthRef.current = false;
      return;
    }
    if (prefersReducedMotion) return;
    setMonthSettling(true);
    const id = window.setTimeout(() => setMonthSettling(false), 260);
    return () => window.clearTimeout(id);
  }, [selectedMonth, prefersReducedMotion]);

  const isMonthTransitioning =
    monthSettling || (otherIncomeQuery.isPlaceholderData && otherIncomeQuery.isFetching);

  const otherIncomeTotal = useMemo(
    () => otherIncomeItems.reduce((sum, i) => sum + Number(i.revenue), 0),
    [otherIncomeItems],
  );

  // Get target for selected month
  const currentTarget = useMemoTracked(() => {
    return monthlyTargets[selectedMonth] || { target_revenue: 0, target_occupancy: 80, available_rooms: totalRooms, breakeven_rate: 0, breakeven_occupancy: 0, room_cost_per_occupied: 0 };
  }, [monthlyTargets, selectedMonth, totalRooms], PERF_SCOPE, 'currentTarget');

  const targetOccupancy = (currentTarget.target_occupancy || 0.80) * 100;
  const availableRooms = currentTarget.available_rooms || totalRooms;
  const breakevenAdr = currentTarget.breakeven_rate || 0;
  const breakevenOccupancy = currentTarget.breakeven_occupancy || 0;

  // Derive available months from data (for filtering)
  const availableMonths = useMemoTracked(() => {
    const months = new Set<string>();
    allData.forEach(d => {
      const date = new Date(d.date);
      const key = `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}`;
      months.add(key);
    });
    return Array.from(months).sort().reverse();
  }, [allData], PERF_SCOPE, 'availableMonths');

  // Filter data by selected month
  const filteredData = useMemoTracked(() => {
    if (!selectedMonth) return allData;
    const [year, month] = selectedMonth.split('-').map(Number);
    return allData.filter(d => {
      const date = new Date(d.date);
      return date.getFullYear() === year && date.getMonth() + 1 === month;
    });
  }, [allData, selectedMonth], PERF_SCOPE, 'filteredData');

  // Calculate display data
  // Split filtered data into actual (before today) and forecast (today onwards)
  const { actualFilteredData, forecastFilteredData } = useMemoTracked(() => {
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    return {
      actualFilteredData: filteredData.filter(d => {
        const date = new Date(d.date);
        date.setHours(0, 0, 0, 0);
        return date < today;
      }),
      forecastFilteredData: filteredData.filter(d => {
        const date = new Date(d.date);
        date.setHours(0, 0, 0, 0);
        return date >= today;
      }),
    };
  }, [filteredData], PERF_SCOPE, 'actual/forecastSplit');

  // Calculate display data using only actual data for KPIs
  const dailyData: DailyData[] = useMemoTracked(() => {
    const isWeekendDay = (d: Date) => d.getDay() === 0 || d.getDay() === 6;
    if (!selectedMonth || !currentTarget.target_revenue) return actualFilteredData.map(d => {
      const date = new Date(d.date);
      return {
        date: date.toLocaleDateString('en-ZA', { day: 'numeric', month: 'short' }),
        revenue: Number(d.revenue),
        target: 0,
        isWeekend: isWeekendDay(date),
      };
    });
    const [year, month] = selectedMonth.split('-').map(Number);
    const daysInMonth = new Date(year, month, 0).getDate();
    const dailyTarget = currentTarget.target_revenue / daysInMonth;
    return actualFilteredData.map(d => {
      const date = new Date(d.date);
      return {
        date: date.toLocaleDateString('en-ZA', { day: 'numeric', month: 'short' }),
        revenue: Number(d.revenue),
        target: dailyTarget,
        isWeekend: isWeekendDay(date),
      };
    });
  }, [actualFilteredData, selectedMonth, currentTarget], PERF_SCOPE, 'dailyData');


  const occupancy = useMemoTracked(() => {
    if (actualFilteredData.length === 0) return 0;
    const daysWithData = actualFilteredData.filter(d => (d.occupancy ?? 0) > 0 || (d.rooms_sold ?? 0) > 0);
    if (daysWithData.length === 0) return 0;
    // Use stored occupancy rates (average of daily rates) for accuracy
    const hasOccupancy = daysWithData.some(d => d.occupancy != null && d.occupancy > 0);
    if (hasOccupancy) {
      const avgOccupancy = daysWithData.reduce((sum, d) => sum + (d.occupancy || 0), 0) / daysWithData.length;
      return Number((avgOccupancy * 100).toFixed(2));
    }
    // Fallback to rooms_sold calculation
    if (availableRooms === 0) return 0;
    const totalRoomsSold = daysWithData.reduce((sum, d) => sum + (d.rooms_sold || 0), 0);
    return Number(((totalRoomsSold / (availableRooms * daysWithData.length)) * 100).toFixed(2));
  }, [actualFilteredData, availableRooms], PERF_SCOPE, 'occupancy');

  // Compare occupancy to the same date range in the previous month
  const occupancyTrend = useMemoTracked(() => {
    if (!selectedMonth || actualFilteredData.length === 0) return null;
    const [year, month] = selectedMonth.split('-').map(Number);
    // Get the max day of current filtered data (only days with actual data)
    const daysWithActualData = actualFilteredData.filter(d => (d.occupancy ?? 0) > 0 || (d.rooms_sold ?? 0) > 0);
    if (daysWithActualData.length === 0) return null;
    const maxDay = Math.max(...daysWithActualData.map(d => new Date(d.date).getDate()));
    // Calculate previous month
    const prevMonth = month === 1 ? 12 : month - 1;
    const prevYear = month === 1 ? year - 1 : year;
    // Get previous month's available rooms
    const prevKey = `${prevYear}-${String(prevMonth).padStart(2, '0')}`;
    const prevTarget = monthlyTargets[prevKey];
    const prevAvailableRooms = prevTarget?.available_rooms || totalRooms;
    // Filter previous month data up to the same day
    const prevData = allData.filter(d => {
      const date = new Date(d.date);
      return date.getFullYear() === prevYear && date.getMonth() + 1 === prevMonth && date.getDate() <= maxDay && ((d.occupancy ?? 0) > 0 || (d.rooms_sold ?? 0) > 0);
    });
    if (prevData.length === 0) return null;
    // Use stored occupancy if available
    const hasOccupancy = prevData.some(d => d.occupancy != null && d.occupancy > 0);
    let prevOccupancy: number;
    if (hasOccupancy) {
      prevOccupancy = (prevData.reduce((sum, d) => sum + (d.occupancy || 0), 0) / prevData.length) * 100;
    } else {
      if (prevAvailableRooms === 0) return null;
      const prevRoomsSold = prevData.reduce((sum, d) => sum + (d.rooms_sold || 0), 0);
      prevOccupancy = (prevRoomsSold / (prevAvailableRooms * prevData.length)) * 100;
    }
    const pctChange = prevOccupancy > 0 ? Number(((occupancy - prevOccupancy) / prevOccupancy * 100).toFixed(1)) : null;
    if (pctChange === null) return null;
    return { value: pctChange, label: 'vs last month (same period)' };
  }, [selectedMonth, actualFilteredData, allData, monthlyTargets, totalRooms, occupancy], PERF_SCOPE, 'occupancyTrend');

  const adr = useMemoTracked(() => {
    const daysWithRates = actualFilteredData.filter(d => (d.average_rate ?? 0) > 0);
    if (daysWithRates.length === 0) return 0;
    const avgRate = daysWithRates.reduce((sum, d) => sum + (d.average_rate || 0), 0) / daysWithRates.length;
    return Math.round(avgRate);
  }, [actualFilteredData], PERF_SCOPE, 'adr');

  const [error, setError] = useState<string | null>(null);
  const queryClient = useQueryClient();

  const dashboardQuery = useQuery({
    queryKey: DASHBOARD_CORE_KEY,
    queryFn: fetchDashboardCore,
    staleTime: CORE_STALE_TIME,
  });


  // Mirror query results into existing local state so downstream memos stay untouched.
  // Show cached data instantly on load; refresh in the background.
  useEffect(() => {
    if (!dashboardQuery.data) return;
    setLastUpdated(dashboardQuery.data.lastUpdated);
    setAllData(dashboardQuery.data.allData);
    setTotalRooms(dashboardQuery.data.totalRooms);
    setMonthlyTargets(dashboardQuery.data.monthlyTargets);
  }, [dashboardQuery.data]);

  // Only show the skeleton if we have no data at all (cold cache); otherwise render cached data.
  useEffect(() => {
    setLoading(dashboardQuery.isPending && !dashboardQuery.data);
  }, [dashboardQuery.isPending, dashboardQuery.data]);

  useEffect(() => {
    setError(dashboardQuery.error ? (dashboardQuery.error as any)?.message || 'Failed to load dashboard data. Please try again.' : null);
  }, [dashboardQuery.error]);

  const fetchData = useCallback(() => {
    queryClient.invalidateQueries({ queryKey: ['dashboard', 'core'] });
  }, [queryClient]);

  useEffect(() => {
    const handler = () => fetchData();
    window.addEventListener('app:refresh-data', handler);
    return () => window.removeEventListener('app:refresh-data', handler);
  }, [fetchData]);




  // Calculate KPIs from data (memoized to avoid recomputing on unrelated re-renders)
  const { roomRevenue, totalRevenue, targetRevenue, revenueProgress, variance } = useMemoTracked(() => {
    const room = dailyData.reduce((sum, d) => sum + d.revenue, 0);
    const total = room + otherIncomeTotal;
    const target = dailyData.reduce((sum, d) => sum + d.target, 0);
    return {
      roomRevenue: room,
      totalRevenue: total,
      targetRevenue: target,
      revenueProgress: target > 0 ? (total / target) * 100 : 0,
      variance: target > 0 ? ((total - target) / target) * 100 : 0,
    };
  }, [dailyData, otherIncomeTotal], PERF_SCOPE, 'kpiTotals');

  // Generate alerts based on thresholds (memoized)
  const alerts = useMemoTracked(() => {
    const list: Array<{
      id: string;
      type: 'revenue' | 'occupancy';
      title: string;
      message: string;
      severity: 'critical' | 'warning';
    }> = [];
    if (revenueProgress < 80) {
      list.push({
        id: 'revenue-warning',
        type: 'revenue',
        title: 'Revenue Behind Target',
        message: `Current revenue is ${Math.abs(variance).toFixed(2)}% below the monthly target. Consider reviewing pricing strategy.`,
        severity: revenueProgress < 60 ? 'critical' : 'warning',
      });
    }
    if (occupancy < targetOccupancy) {
      list.push({
        id: 'occupancy-warning',
        type: 'occupancy',
        title: 'Low Occupancy Alert',
        message: `Occupancy has dropped to ${formatPercent(occupancy)}. This is below the ${formatPercent(targetOccupancy)} threshold.`,
        severity: 'warning',
      });
    }
    return list;
  }, [revenueProgress, variance, occupancy, targetOccupancy], PERF_SCOPE, 'alerts');

  const visibleAlerts = useMemoTracked(
    () => alerts.filter(a => !dismissedAlerts.includes(a.id)),
    [alerts, dismissedAlerts],
    PERF_SCOPE,
    'visibleAlerts',
  );

  const handleDismissAlert = useCallback((id: string) => {
    setDismissedAlerts(prev => [...prev, id]);
  }, []);

  return (
    <DashboardLayout lastUpdated={lastUpdated}>
      <div className="space-y-6">
        {/* Page title + Month selector */}
        {loading ? (
          <FilterBarSkeleton filters={1} filterWidth="w-[180px]" />
        ) : (
          <div className="flex items-center justify-between flex-wrap gap-4">
            <div>
              <h2 className="text-2xl font-bold text-foreground">Dashboard Overview</h2>
              <p className="text-muted-foreground">Monitor our performance at a glance</p>
            </div>
            <MonthSelector onPrefetchMonth={prefetchMonth} />
          </div>
        )}

        {/* Alerts */}
        <AlertBanner alerts={visibleAlerts} onDismiss={handleDismissAlert} />

        {error && (
          <Alert variant="destructive">
            <AlertTriangle className="h-4 w-4" />
            <AlertTitle>Couldn't load the latest dashboard data</AlertTitle>
            <AlertDescription className="flex items-start justify-between gap-4 flex-wrap">
              <span>{error}</span>
              <Button size="sm" variant="outline" onClick={() => fetchData()} className="gap-1.5">
                <RefreshCw className="w-3.5 h-3.5" /> Retry
              </Button>
            </AlertDescription>
          </Alert>
        )}

        {loading && !error ? (
          <>
            {/* KPI Skeletons */}
            <div className="space-y-2">
              <div className="flex items-center gap-2 flex-wrap">
                <Skeleton className="h-6 w-40 rounded-full" />
                <Skeleton className="h-6 w-56 rounded-full" />
              </div>
              <KPICardSkeleton count={4} showProgress progressStyle="ring" />
            </div>

            {/* Analysis Summary Skeleton */}
            <Card>
              <CardContent className="p-6 space-y-4">
                <Skeleton className="h-6 w-48" />
                <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
                  {[0, 1, 2, 3].map(i => (
                    <div key={i} className="space-y-2">
                      <Skeleton className="h-4 w-20" />
                      <Skeleton className="h-8 w-28" />
                      <Skeleton className="h-4 w-32" />
                    </div>
                  ))}
                </div>
              </CardContent>
            </Card>

            {/* Revenue Chart Skeleton */}
            <ChartSkeleton bars={14} height={300} titleWidth="w-40" />

            {/* Other Income Skeleton */}
            <Card>
              <CardContent className="p-6 space-y-4">
                <Skeleton className="h-6 w-44" />
                <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
                  {[0, 1, 2].map(i => (
                    <div key={i} className="space-y-2">
                      <Skeleton className="h-4 w-24" />
                      <Skeleton className="h-8 w-28" />
                      <Skeleton className="h-2 w-full rounded-full" />
                    </div>
                  ))}
                </div>
              </CardContent>
            </Card>

            {/* Month Projection Skeleton */}
            <Card>
              <CardContent className="p-6 space-y-4">
                <Skeleton className="h-6 w-52" />
                <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
                  {[0, 1, 2, 3].map(i => (
                    <div key={i} className="space-y-2">
                      <Skeleton className="h-4 w-20" />
                      <Skeleton className="h-8 w-28" />
                      <Skeleton className="h-2 w-full rounded-full" />
                    </div>
                  ))}
                </div>
              </CardContent>
            </Card>

            {/* Daily Table Skeleton */}
            <TableSkeleton rows={8} columns={5} withProgressColumn titleWidth="w-36" />
          </>

        ) : filteredData.length === 0 && !isMonthTransitioning ? (
          allData.length === 0 ? (
            <EmptyState
              icon={<Inbox className="w-6 h-6" />}
              title="No data uploaded yet"
              description="Once the monthly Excel file has been uploaded, your revenue, occupancy and forecast figures will appear here."
              action={isAdmin ? (
                <Button asChild size="sm" className="gap-1.5">
                  <Link to="/upload">Upload data</Link>
                </Button>
              ) : (
                <span className="text-sm text-muted-foreground">Ask an administrator to upload the latest file.</span>
              )}
            />
          ) : (
            <EmptyState
              icon={<CalendarX className="w-6 h-6" />}
              title={`No data for ${monthLabel}`}
              description="Nothing has been uploaded for this month yet. Pick a month that already has data, or upload the latest file."
              action={
                <>
                  {availableMonths.slice(0, 3).map(m => (
                    <Button key={m} size="sm" variant="outline" onClick={() => setSelectedMonth(m)}>
                      {formatMonthLabel(m)}
                    </Button>
                  ))}
                  {isAdmin && (
                    <Button asChild size="sm" className="gap-1.5">
                      <Link to="/upload">Upload data</Link>
                    </Button>
                  )}
                </>
              }
            />
          )
        ) : (

          <div
            className={cn(
              'relative space-y-6 transition-opacity duration-200 motion-reduce:transition-none',
              isMonthTransitioning && 'opacity-60',
            )}
            aria-busy={isMonthTransitioning}
          >
            {/* Subtle indeterminate bar while the new month settles */}
            {isMonthTransitioning && (
              <div
                aria-hidden
                className="pointer-events-none absolute -top-2 left-0 right-0 h-0.5 overflow-hidden rounded-full bg-muted"
              >
                <div className="absolute inset-0 -translate-x-full animate-shimmer bg-gradient-to-r from-transparent via-primary to-transparent" />
              </div>
            )}


            {/* KPI Cards */}
            <div className="space-y-2">
              <div className="flex items-center gap-2 flex-wrap">
                <span className="inline-flex items-center text-xs font-medium text-muted-foreground bg-muted px-2.5 py-1 rounded-full">Actuals Only — Forecast Excluded</span>
                {currentTarget.room_cost_per_occupied > 0 && (
                  <span className="inline-flex items-center text-xs font-medium text-foreground bg-accent/40 border border-accent px-2.5 py-1 rounded-full">
                    Room Cost / Occupied Room: {formatCurrency(currentTarget.room_cost_per_occupied)}
                  </span>
                )}
              </div>
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
                <div className="animate-fade-in-up h-full" style={{ animationDelay: '0ms' }}>
                <KPICard
                    title="Revenue MTD"
                    value={formatCurrency(totalRevenue)}
                    subtitle={otherIncomeTotal > 0 ? `Rooms: ${formatCurrency(roomRevenue)} + Other: ${formatCurrency(otherIncomeTotal)}` : 'All room types'}
                    icon={<DollarSign className="w-5 h-5 text-primary" />}
                    progress={revenueProgress}
                    progressStyle="ring"
                    variant={revenueProgress >= 80 ? 'success' : revenueProgress >= 60 ? 'warning' : 'danger'}
                    sparklineData={dailyData.map(d => d.revenue)}
                  />
                </div>
                <div className="animate-fade-in-up h-full" style={{ animationDelay: '100ms' }}>
                  <KPICard
                    title="Occupancy Rate"
                    value={formatPercent(occupancy)}
                    subtitle={`Target: ${formatPercent(targetOccupancy)}`}
                    icon={<Percent className="w-5 h-5 text-primary" />}
                    trend={occupancyTrend || undefined}
                    variant={occupancy >= targetOccupancy ? 'success' : 'default'}
                  />
                </div>
                <div className="animate-fade-in-up h-full" style={{ animationDelay: '200ms' }}>
                  <KPICard
                    title="Average Daily Rate"
                    value={formatCurrency(adr)}
                    subtitle="Simple avg across days"
                    secondarySubtitle={`${adr < breakevenAdr ? '⚠ ' : '✓ '}Breakeven: ${formatCurrency(breakevenAdr)}`}
                    secondarySubtitleClassName={adr >= breakevenAdr ? 'text-success' : 'text-destructive'}
                    icon={<TrendingUp className="w-5 h-5 text-primary" />}
                    variant={adr >= breakevenAdr ? 'success' : 'danger'}
                  />
                </div>
                <div className="animate-fade-in-up h-full" style={{ animationDelay: '300ms' }}>
                  <KPICard
                    title="Target Variance"
                    value={`${variance >= 0 ? '+' : ''}${variance.toFixed(2)}%`}
                    subtitle={`${variance >= 0 ? 'Ahead' : 'Behind'} by ${formatCurrency(Math.abs(totalRevenue - targetRevenue))}`}
                    icon={<Target className="w-5 h-5 text-primary" />}
                    variant={variance >= 0 ? 'success' : variance >= -20 ? 'warning' : 'danger'}
                  />
                </div>
              </div>
            </div>

            {/* Monthly Analysis Summary */}
            <div className="animate-fade-in-up" style={{ animationDelay: '400ms' }}>
              <AnalysisSummary />
            </div>

            {/* Revenue Chart */}
            {isMonthTransitioning && dailyData.length === 0 ? (
              <ChartSkeleton bars={14} height={300} titleWidth="w-40" />
            ) : dailyData.length > 0 ? (
              <div className="animate-fade-in-up" style={{ animationDelay: '500ms' }}>
                <RevenueChart data={dailyData} dailyTarget={dailyData[0]?.target || 0} />
              </div>
            ) : (
              <div className="animate-fade-in-up" style={{ animationDelay: '500ms' }}>
                <EmptyState
                  icon={<LineChart className="w-6 h-6" />}
                  title="No revenue to chart for this month"
                  description={`There are no daily revenue figures recorded for ${monthLabel} yet.`}
                />
              </div>
            )}


            {/* Other Income Breakdown — deferred until near viewport */}
            <LazySection
              estimatedHeight={280}
              warmPriority={0}
              fallback={<ChartSkeleton bars={8} height={160} titleWidth="w-48" />}
            >
              <OtherIncomeSummary items={otherIncomeItems} loading={loading} error={error} onRetry={fetchData} />
            </LazySection>



            {/* Month-End Projection Summary — deferred until near viewport */}
            <LazySection
              estimatedHeight={320}
              warmPriority={1}
              fallback={<ChartSkeleton bars={8} height={200} titleWidth="w-56" />}
            >
              <MonthProjectionSummary
                actualData={actualFilteredData}
                forecastData={forecastFilteredData}
                targetRevenue={currentTarget.target_revenue}
                targetOccupancy={targetOccupancy}
                availableRooms={availableRooms}
                otherIncomeTotal={otherIncomeTotal}
                loading={loading}
                error={error}
                onRetry={fetchData}
              />
            </LazySection>

            {/* Daily Breakdown Table (Actual only) — deferred until near viewport */}
            <LazySection
              estimatedHeight={520}
              warmPriority={2}
              fallback={<TableSkeleton rows={8} columns={5} titleWidth="w-40" />}
            >
              {actualFilteredData.length > 0 ? (
                <DailyDataTable data={actualFilteredData} dailyTarget={dailyData[0]?.target || 0} title="Daily Breakdown" />
              ) : (
                <EmptyState
                  icon={<CalendarX className="w-6 h-6" />}
                  title="No actuals yet for this month"
                  description={`${monthLabel} hasn't started recording completed days yet — only forecast figures are available so far.`}
                />
              )}
            </LazySection>

            {/* Forecast Table — deferred until near viewport */}
            <LazySection
              estimatedHeight={520}
              warmPriority={3}
              fallback={<TableSkeleton rows={6} columns={5} titleWidth="w-28" />}
            >
              {forecastFilteredData.length > 0 ? (
                <DailyDataTable data={forecastFilteredData} dailyTarget={dailyData[0]?.target || 0} title="Forecast" icon={<TrendingUpDown className="w-5 h-5 text-primary" />} variant="forecast" />
              ) : (
                <EmptyState
                  icon={<TrendingUpDown className="w-6 h-6" />}
                  title="No forecast days remaining"
                  description={`Every day in ${monthLabel} has already been recorded as actuals, so there is nothing left to forecast.`}
                />
              )}
            </LazySection>
          </div>

        )}
      </div>
      {import.meta.env.DEV && <PerfPanel scope={PERF_SCOPE} />}
    </DashboardLayout>
  );
}