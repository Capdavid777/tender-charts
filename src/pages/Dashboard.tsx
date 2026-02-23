import { useState, useEffect, useMemo } from 'react';
import DashboardLayout from '@/components/layout/DashboardLayout';
import KPICard from '@/components/dashboard/KPICard';
import AlertBanner from '@/components/dashboard/AlertBanner';
import RevenueChart from '@/components/dashboard/RevenueChart';
import { DollarSign, Percent, TrendingUp, Target } from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';

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
}

export default function Dashboard() {
  const [dismissedAlerts, setDismissedAlerts] = useState<string[]>([]);
  const [lastUpdated, setLastUpdated] = useState('');
  const [allData, setAllData] = useState<RawDailyData[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedMonth, setSelectedMonth] = useState<string>('');
  const [targetOccupancy] = useState(80);
  const [breakevenAdr] = useState(800);

  // Derive available months from data
  const availableMonths = useMemo(() => {
    const months = new Set<string>();
    allData.forEach(d => {
      const date = new Date(d.date);
      const key = `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}`;
      months.add(key);
    });
    return Array.from(months).sort().reverse();
  }, [allData]);

  // Auto-select latest month
  useEffect(() => {
    if (availableMonths.length > 0 && !selectedMonth) {
      setSelectedMonth(availableMonths[0]);
    }
  }, [availableMonths, selectedMonth]);

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
  const dailyData: DailyData[] = useMemo(() => {
    const dailyTarget = 50265.22929;
    return filteredData.map(d => {
      const date = new Date(d.date);
      return {
        date: date.toLocaleDateString('en-ZA', { day: 'numeric', month: 'short' }),
        revenue: Number(d.revenue),
        target: dailyTarget,
      };
    });
  }, [filteredData]);

  const occupancy = useMemo(() => {
    if (filteredData.length === 0) return 0;
    const totalRooms = filteredData.reduce((sum, d) => sum + (d.rooms_sold || 0), 0);
    return Math.round((totalRooms / (63 * filteredData.length)) * 100);
  }, [filteredData]);

  const adr = useMemo(() => {
    if (filteredData.length === 0) return 0;
    const avg = filteredData.reduce((sum, d) => sum + Number(d.average_rate || 0), 0) / filteredData.length;
    return Math.round(avg);
  }, [filteredData]);

  useEffect(() => {
    const fetchData = async () => {
      setLoading(true);

      const { data: uploads } = await supabase
        .from('data_uploads')
        .select('uploaded_at')
        .order('uploaded_at', { ascending: false })
        .limit(1);

      if (uploads && uploads.length > 0) {
        const date = new Date(uploads[0].uploaded_at);
        setLastUpdated(date.toLocaleDateString('en-ZA', {
          day: 'numeric', month: 'short', year: 'numeric',
          hour: '2-digit', minute: '2-digit'
        }));
      } else {
        setLastUpdated('No data uploaded yet');
      }

      const { data: revenueData } = await supabase
        .from('daily_revenue')
        .select('*')
        .order('date', { ascending: true });

      if (revenueData && revenueData.length > 0) {
        setAllData(revenueData as RawDailyData[]);
      }

      setLoading(false);
    };

    fetchData();
  }, []);

  // Calculate KPIs from data
  const totalRevenue = dailyData.reduce((sum, d) => sum + d.revenue, 0);
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
      message: `Current revenue is ${Math.abs(variance).toFixed(1)}% below the monthly target. Consider reviewing pricing strategy.`,
      severity: revenueProgress < 60 ? 'critical' as const : 'warning' as const,
    });
  }
  if (occupancy < 50) {
    alerts.push({
      id: 'occupancy-warning',
      type: 'occupancy' as const,
      title: 'Low Occupancy Alert',
      message: `Occupancy has dropped to ${occupancy}%. This is below the 50% threshold.`,
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
            <p className="text-muted-foreground">Monitor your property performance at a glance</p>
          </div>
          {availableMonths.length > 0 && (
            <Select value={selectedMonth} onValueChange={setSelectedMonth}>
              <SelectTrigger className="w-[180px]">
                <SelectValue placeholder="Select month" />
              </SelectTrigger>
              <SelectContent>
                {availableMonths.map(m => {
                  const [year, month] = m.split('-').map(Number);
                  const label = new Date(year, month - 1).toLocaleDateString('en-ZA', { month: 'long', year: 'numeric' });
                  return <SelectItem key={m} value={m}>{label}</SelectItem>;
                })}
              </SelectContent>
            </Select>
          )}
        </div>

        {/* Alerts */}
        <AlertBanner alerts={visibleAlerts} onDismiss={handleDismissAlert} />

        {/* KPI Cards */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
          <KPICard
            title="Revenue to Date"
            value={`R${totalRevenue.toLocaleString()}`}
            subtitle={`Target: R${targetRevenue.toLocaleString()}`}
            icon={<DollarSign className="w-5 h-5 text-primary" />}
            progress={revenueProgress}
            variant={revenueProgress >= 80 ? 'success' : revenueProgress >= 60 ? 'warning' : 'danger'}
          />
          <KPICard
            title="Occupancy Rate"
            value={`${occupancy}%`}
            subtitle={`Target: ${targetOccupancy}%`}
            icon={<Percent className="w-5 h-5 text-primary" />}
            trend={{ value: 5, label: 'vs last month' }}
            variant={occupancy >= targetOccupancy ? 'success' : 'default'}
          />
          <KPICard
            title="Average Daily Rate"
            value={`R${adr.toLocaleString()}`}
            subtitle={`Breakeven: R${breakevenAdr.toLocaleString()}`}
            icon={<TrendingUp className="w-5 h-5 text-primary" />}
            variant={adr >= breakevenAdr ? 'success' : 'danger'}
          />
          <KPICard
            title="Target Variance"
            value={`${variance >= 0 ? '+' : ''}${variance.toFixed(1)}%`}
            subtitle={variance >= 0 ? 'Ahead of target' : 'Behind target'}
            icon={<Target className="w-5 h-5 text-primary" />}
            variant={variance >= 0 ? 'success' : variance >= -20 ? 'warning' : 'danger'}
          />
        </div>

        {/* Revenue Chart */}
        {dailyData.length > 0 ? (
          <RevenueChart data={dailyData} dailyTarget={50265.22929} />
        ) : !loading && (
          <div className="text-center py-12 text-muted-foreground">
            No revenue data available. Upload an Excel file to see your dashboard.
          </div>
        )}
      </div>
    </DashboardLayout>
  );
}