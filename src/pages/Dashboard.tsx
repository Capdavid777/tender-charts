import { useState, useEffect, useMemo, useCallback } from 'react';
import DashboardLayout from '@/components/layout/DashboardLayout';
import KPICard from '@/components/dashboard/KPICard';
import AlertBanner from '@/components/dashboard/AlertBanner';
import RevenueChart from '@/components/dashboard/RevenueChart';
import { DollarSign, Percent, TrendingUp, Target, TrendingUpDown } from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';
import { formatCurrency, formatPercent } from '@/lib/format';
import { useMonth } from '@/contexts/MonthContext';
import MonthSelector from '@/components/MonthSelector';
import AnalysisSummary from '@/components/dashboard/AnalysisSummary';
import DailyDataTable from '@/components/dashboard/DailyDataTable';
import MonthProjectionSummary from '@/components/dashboard/MonthProjectionSummary';
import OtherIncomeSummary from '@/components/dashboard/OtherIncomeSummary';
import { Skeleton } from '@/components/ui/skeleton';
import { Card, CardContent } from '@/components/ui/card';

interface DailyData {
  date: string;
  revenue: number;
  target: number;
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
export default function Dashboard() {
  const [dismissedAlerts, setDismissedAlerts] = useState<string[]>([]);
  const [lastUpdated, setLastUpdated] = useState('');
  const [allData, setAllData] = useState<RawDailyData[]>([]);
  const [loading, setLoading] = useState(true);
  const { selectedMonth, setSelectedMonth } = useMonth();
  const [totalRooms, setTotalRooms] = useState(80);
  const [monthlyTargets, setMonthlyTargets] = useState<Record<string, MonthlyTarget>>({});
  const [otherIncomeTotal, setOtherIncomeTotal] = useState(0);
  const handleOtherIncomeChange = useCallback((total: number) => setOtherIncomeTotal(total), []);
  

  // Get target for selected month
  const currentTarget = useMemo(() => {
    return monthlyTargets[selectedMonth] || { target_revenue: 0, target_occupancy: 80, available_rooms: totalRooms, breakeven_rate: 0, breakeven_occupancy: 0, room_cost_per_occupied: 0 };
  }, [monthlyTargets, selectedMonth, totalRooms]);

  const targetOccupancy = (currentTarget.target_occupancy || 0.80) * 100;
  const availableRooms = currentTarget.available_rooms || totalRooms;
  const breakevenAdr = currentTarget.breakeven_rate || 0;
  const breakevenOccupancy = currentTarget.breakeven_occupancy || 0;

  // Derive available months from data (for filtering)
  const availableMonths = useMemo(() => {
    const months = new Set<string>();
    allData.forEach(d => {
      const date = new Date(d.date);
      const key = `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}`;
      months.add(key);
    });
    return Array.from(months).sort().reverse();
  }, [allData]);

  // Filter data by selected month
  const filteredData = useMemo(() => {
    if (!selectedMonth) return allData;
    const [year, month] = selectedMonth.split('-').map(Number);
    return allData.filter(d => {
      const date = new Date(d.date);
      return date.getFullYear() === year && date.getMonth() + 1 === month;
    });
  }, [allData, selectedMonth]);

  // Calculate display data
  // Split filtered data into actual (before today) and forecast (today onwards)
  const { actualFilteredData, forecastFilteredData } = useMemo(() => {
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
  }, [filteredData]);

  // Calculate display data using only actual data for KPIs
  const dailyData: DailyData[] = useMemo(() => {
    if (!selectedMonth || !currentTarget.target_revenue) return actualFilteredData.map(d => {
      const date = new Date(d.date);
      return { date: date.toLocaleDateString('en-ZA', { day: 'numeric', month: 'short' }), revenue: Number(d.revenue), target: 0 };
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
      };
    });
  }, [actualFilteredData, selectedMonth, currentTarget]);

  const occupancy = useMemo(() => {
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
  }, [actualFilteredData, availableRooms]);

  // Compare occupancy to the same date range in the previous month
  const occupancyTrend = useMemo(() => {
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
  }, [selectedMonth, actualFilteredData, allData, monthlyTargets, totalRooms, occupancy]);

  const adr = useMemo(() => {
    const daysWithRates = actualFilteredData.filter(d => (d.average_rate ?? 0) > 0);
    if (daysWithRates.length === 0) return 0;
    const avgRate = daysWithRates.reduce((sum, d) => sum + (d.average_rate || 0), 0) / daysWithRates.length;
    return Math.round(avgRate);
  }, [actualFilteredData]);

  const fetchData = useCallback(async () => {
    setLoading(true);

    const [uploadsRes, revenueRes, roomTypesRes, targetsRes] = await Promise.all([
      supabase.from('data_uploads').select('uploaded_at').order('uploaded_at', { ascending: false }).limit(1),
      supabase.from('daily_revenue').select('*').is('room_type_id', null).order('date', { ascending: true }),
      supabase.from('room_types').select('total_rooms'),
      supabase.from('monthly_targets').select('*'),
    ]);

    if (uploadsRes.data && uploadsRes.data.length > 0) {
      const date = new Date(uploadsRes.data[0].uploaded_at);
      setLastUpdated(date.toLocaleDateString('en-ZA', {
        day: 'numeric', month: 'short', year: 'numeric',
        hour: '2-digit', minute: '2-digit'
      }));
    } else {
      setLastUpdated('No data uploaded yet');
    }

    if (revenueRes.data && revenueRes.data.length > 0) {
      setAllData(revenueRes.data as RawDailyData[]);
    }

    if (roomTypesRes.data) {
      const total = roomTypesRes.data.reduce((sum, rt) => sum + (rt.total_rooms || 0), 0);
      setTotalRooms(total);
    }

    if (targetsRes.data) {
      const map: Record<string, MonthlyTarget> = {};
      targetsRes.data.forEach(t => {
        const key = `${t.year}-${String(t.month).padStart(2, '0')}`;
        map[key] = { target_revenue: Number(t.target_revenue), target_occupancy: Number(t.target_occupancy), available_rooms: Number((t as any).available_rooms || 0), breakeven_rate: Number((t as any).breakeven_rate || 0), breakeven_occupancy: Number((t as any).breakeven_occupancy || 0), room_cost_per_occupied: Number((t as any).room_cost_per_occupied || 0) };
      });
      setMonthlyTargets(map);
    }

    setLoading(false);
  }, []);

  useEffect(() => {
    fetchData();
    const handler = () => fetchData();
    window.addEventListener('app:refresh-data', handler);
    return () => window.removeEventListener('app:refresh-data', handler);
  }, [fetchData]);

  // Calculate KPIs from data
  const roomRevenue = dailyData.reduce((sum, d) => sum + d.revenue, 0);
  const totalRevenue = roomRevenue + otherIncomeTotal;
  const targetRevenue = dailyData.reduce((sum, d) => sum + d.target, 0);
  const revenueProgress = targetRevenue > 0 ? (totalRevenue / targetRevenue) * 100 : 0;
  const variance = targetRevenue > 0 ? ((totalRevenue - targetRevenue) / targetRevenue) * 100 : 0;

  // Generate alerts based on thresholds
  const alerts = [];
  if (revenueProgress < 80) {
    alerts.push({
      id: 'revenue-warning',
      type: 'revenue' as const,
      title: 'Revenue Behind Target',
      message: `Current revenue is ${Math.abs(variance).toFixed(2)}% below the monthly target. Consider reviewing pricing strategy.`,
      severity: revenueProgress < 60 ? 'critical' as const : 'warning' as const,
    });
  }
  if (occupancy < targetOccupancy) {
    alerts.push({
      id: 'occupancy-warning',
      type: 'occupancy' as const,
      title: 'Low Occupancy Alert',
      message: `Occupancy has dropped to ${formatPercent(occupancy)}. This is below the ${formatPercent(targetOccupancy)} threshold.`,
      severity: 'warning' as const,
    });
  }

  const visibleAlerts = alerts.filter(a => !dismissedAlerts.includes(a.id));

  const handleDismissAlert = (id: string) => {
    setDismissedAlerts(prev => [...prev, id]);
  };

  return (
    <DashboardLayout lastUpdated={lastUpdated}>
      <div className="space-y-6">
        {/* Page title + Month selector */}
        <div className="flex items-center justify-between flex-wrap gap-4">
          <div>
            <h2 className="text-2xl font-bold text-foreground">Dashboard Overview</h2>
            <p className="text-muted-foreground">Monitor our performance at a glance</p>
          </div>
          <MonthSelector />
        </div>

        {/* Alerts */}
        <AlertBanner alerts={visibleAlerts} onDismiss={handleDismissAlert} />

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
          <div className="animate-fade-in-up" style={{ animationDelay: '0ms' }}>
          <KPICard
            title="Revenue MTD"
            value={formatCurrency(totalRevenue)}
            subtitle={otherIncomeTotal > 0 ? `Rooms: ${formatCurrency(roomRevenue)} + Other: ${formatCurrency(otherIncomeTotal)}` : 'All room types'}
            icon={<DollarSign className="w-5 h-5 text-primary" />}
            progress={revenueProgress}
            variant={revenueProgress >= 80 ? 'success' : revenueProgress >= 60 ? 'warning' : 'danger'}
          />
          </div>
          <div className="animate-fade-in-up" style={{ animationDelay: '100ms' }}>
          <KPICard
            title="Occupancy Rate"
            value={formatPercent(occupancy)}
            subtitle={`Target: ${formatPercent(targetOccupancy)}`}
            icon={<Percent className="w-5 h-5 text-primary" />}
            trend={occupancyTrend || undefined}
            variant={occupancy >= targetOccupancy ? 'success' : 'default'}
          />
          </div>
          <div className="animate-fade-in-up" style={{ animationDelay: '200ms' }}>
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
          <div className="animate-fade-in-up" style={{ animationDelay: '300ms' }}>
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
        {dailyData.length > 0 ? (
          <div className="animate-fade-in-up" style={{ animationDelay: '500ms' }}>
            <RevenueChart data={dailyData} dailyTarget={dailyData[0]?.target || 0} />
          </div>
        ) : !loading && (
          <div className="text-center py-12 text-muted-foreground">
            No revenue data available. Upload an Excel file to see your dashboard.
          </div>
        )}

        {/* Other Income Breakdown */}
        <div className="animate-fade-in-up" style={{ animationDelay: '600ms' }}>
          <OtherIncomeSummary onTotalChange={handleOtherIncomeChange} />
        </div>

        {/* Month-End Projection Summary */}
        <div className="animate-fade-in-up" style={{ animationDelay: '700ms' }}>
          <MonthProjectionSummary
            actualData={actualFilteredData}
            forecastData={forecastFilteredData}
            targetRevenue={currentTarget.target_revenue}
            targetOccupancy={targetOccupancy}
            availableRooms={availableRooms}
            otherIncomeTotal={otherIncomeTotal}
            loading={loading}
          />
        </div>

        {/* Daily Breakdown Table (Actual only) */}
        {actualFilteredData.length > 0 && (
          <div className="animate-fade-in-up" style={{ animationDelay: '800ms' }}>
            <DailyDataTable data={actualFilteredData} dailyTarget={dailyData[0]?.target || 0} title="Daily Breakdown" />
          </div>
        )}

        {/* Forecast Table */}
        {forecastFilteredData.length > 0 && (
          <div className="animate-fade-in-up" style={{ animationDelay: '900ms' }}>
            <DailyDataTable data={forecastFilteredData} dailyTarget={dailyData[0]?.target || 0} title="Forecast" icon={<TrendingUpDown className="w-5 h-5 text-primary" />} variant="forecast" />
          </div>
        )}
      </div>
    </DashboardLayout>
  );
}