import { useState, useEffect } from 'react';
import DashboardLayout from '@/components/layout/DashboardLayout';
import KPICard from '@/components/dashboard/KPICard';
import AlertBanner from '@/components/dashboard/AlertBanner';
import RevenueChart from '@/components/dashboard/RevenueChart';
import { DollarSign, Percent, TrendingUp, Target } from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';

// Sample data - will be replaced with real data from database
const sampleDailyData = [
  { date: 'Jan 1', revenue: 15000, target: 12000 },
  { date: 'Jan 2', revenue: 8500, target: 12000 },
  { date: 'Jan 3', revenue: 14200, target: 12000 },
  { date: 'Jan 4', revenue: 11800, target: 12000 },
  { date: 'Jan 5', revenue: 16500, target: 12000 },
  { date: 'Jan 6', revenue: 9200, target: 12000 },
  { date: 'Jan 7', revenue: 13400, target: 12000 },
  { date: 'Jan 8', revenue: 7800, target: 12000 },
  { date: 'Jan 9', revenue: 15800, target: 12000 },
  { date: 'Jan 10', revenue: 12100, target: 12000 },
];

export default function Dashboard() {
  const [dismissedAlerts, setDismissedAlerts] = useState<string[]>([]);
  const [lastUpdated, setLastUpdated] = useState('');

  useEffect(() => {
    // Fetch last upload timestamp
    const fetchLastUpload = async () => {
      const { data } = await supabase
        .from('data_uploads')
        .select('uploaded_at')
        .order('uploaded_at', { ascending: false })
        .limit(1);
      
      if (data && data.length > 0) {
        const date = new Date(data[0].uploaded_at);
        setLastUpdated(date.toLocaleDateString('en-ZA', { 
          day: 'numeric', 
          month: 'short', 
          year: 'numeric',
          hour: '2-digit',
          minute: '2-digit'
        }));
      } else {
        setLastUpdated('No data uploaded yet');
      }
    };

    fetchLastUpload();
  }, []);

  // Calculate KPIs from sample data
  const totalRevenue = sampleDailyData.reduce((sum, d) => sum + d.revenue, 0);
  const targetRevenue = sampleDailyData.reduce((sum, d) => sum + d.target, 0);
  const revenueProgress = (totalRevenue / targetRevenue) * 100;
  const variance = ((totalRevenue - targetRevenue) / targetRevenue) * 100;

  // Sample occupancy data
  const occupancy = 72;
  const targetOccupancy = 80;
  const adr = 1450;
  const breakevenAdr = 1200;

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
        {/* Page title */}
        <div>
          <h2 className="text-2xl font-bold text-foreground">Dashboard Overview</h2>
          <p className="text-muted-foreground">Monitor your property performance at a glance</p>
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
        <RevenueChart data={sampleDailyData} dailyTarget={12000} />
      </div>
    </DashboardLayout>
  );
}