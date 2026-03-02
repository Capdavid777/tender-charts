import { useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import DashboardLayout from '@/components/layout/DashboardLayout';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Download, TrendingUp, TrendingDown } from 'lucide-react';
import { formatCurrency, formatPercent } from '@/lib/format';
import { supabase } from '@/integrations/supabase/client';
import MonthSelector from '@/components/MonthSelector';
import {
  LineChart,
  Line,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  Legend,
} from 'recharts';

export default function Historical() {
  const [sortColumn, setSortColumn] = useState<string>('year');
  const [sortDirection, setSortDirection] = useState<'asc' | 'desc'>('desc');

  const { data: historicalData = [] } = useQuery({
    queryKey: ['annual-summary'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('annual_summary')
        .select('*')
        .order('year', { ascending: true });
      if (error) throw error;
      return data.map(row => ({
        year: String(row.year),
        revenue: row.total_revenue,
        occupancy: Number((row.occupancy_percentage ?? 0).toFixed(2)),
        roomsSold: row.total_rooms_sold,
        avgRate: Number((row.average_rate ?? 0).toFixed(2)),
      }));
    },
  });

  const handleSort = (column: string) => {
    if (sortColumn === column) {
      setSortDirection(sortDirection === 'asc' ? 'desc' : 'asc');
    } else {
      setSortColumn(column);
      setSortDirection('desc');
    }
  };

  const sortedData = [...historicalData].sort((a, b) => {
    const aValue = a[sortColumn as keyof typeof a];
    const bValue = b[sortColumn as keyof typeof b];
    const multiplier = sortDirection === 'asc' ? 1 : -1;
    
    if (typeof aValue === 'string') {
      return aValue.localeCompare(bValue as string) * multiplier;
    }
    return ((aValue as number) - (bValue as number)) * multiplier;
  });

  const exportToCSV = () => {
    const headers = ['Year', 'Rooms Sold', 'Occupancy %', 'Revenue', 'Avg Rate'];
    const rows = historicalData.map(d => [
      d.year,
      d.roomsSold,
      d.occupancy,
      d.revenue,
      d.avgRate,
    ]);
    
    const csvContent = [
      headers.join(','),
      ...rows.map(row => row.join(',')),
    ].join('\n');
    
    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
    const link = document.createElement('a');
    link.href = URL.createObjectURL(blob);
    link.download = 'historical_data.csv';
    link.click();
  };

  const CustomTooltip = ({ active, payload, label }: any) => {
    if (active && payload && payload.length) {
      return (
        <div className="bg-card border rounded-lg shadow-lg p-3">
          <p className="font-medium text-foreground mb-2">{label}</p>
          {payload.map((entry: any, index: number) => (
            <p key={index} className="text-sm" style={{ color: entry.color }}>
              {entry.name}: {entry.name.includes('Revenue') 
                ? formatCurrency(entry.value) 
                : formatPercent(entry.value)}
            </p>
          ))}
        </div>
      );
    }
    return null;
  };

  const trendData = historicalData;

  return (
    <DashboardLayout>
      <div className="space-y-6">
        {/* Page title */}
        <div className="flex items-center justify-between flex-wrap gap-4">
          <div>
            <h2 className="text-2xl font-bold text-foreground">Historical Trends</h2>
            <p className="text-muted-foreground">Year-over-year performance analysis</p>
          </div>
          <div className="flex items-center gap-2">
            <MonthSelector />
            <Button onClick={exportToCSV} variant="outline" className="gap-2">
              <Download className="w-4 h-4" />
              Export CSV
            </Button>
          </div>
        </div>

        {/* Trend Charts */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          {/* Revenue Trend */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <TrendingUp className="w-5 h-5 text-success" />
                Annual Revenue Trend
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="h-[280px]">
                <ResponsiveContainer width="100%" height="100%">
                  <LineChart data={trendData} margin={{ top: 10, right: 30, left: 10, bottom: 10 }}>
                    <CartesianGrid strokeDasharray="3 3" className="stroke-border" />
                    <XAxis 
                      dataKey="year" 
                      tick={{ fontSize: 12 }}
                      tickLine={false}
                      axisLine={false}
                    />
                    <YAxis 
                      tickFormatter={(value) => `R${(value / 1000000).toFixed(1)}M`}
                      tick={{ fontSize: 12 }}
                      tickLine={false}
                      axisLine={false}
                    />
                    <Tooltip content={<CustomTooltip />} />
                    <Line 
                      type="monotone" 
                      dataKey="revenue" 
                      name="Revenue"
                      stroke="hsl(var(--primary))" 
                      strokeWidth={3}
                      dot={{ fill: 'hsl(var(--primary))', strokeWidth: 2 }}
                      activeDot={{ r: 6 }}
                    />
                  </LineChart>
                </ResponsiveContainer>
              </div>
            </CardContent>
          </Card>

          {/* Occupancy Trend */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <TrendingUp className="w-5 h-5 text-accent" />
                Annual Occupancy Trend
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="h-[280px]">
                <ResponsiveContainer width="100%" height="100%">
                  <LineChart data={trendData} margin={{ top: 10, right: 30, left: 10, bottom: 10 }}>
                    <CartesianGrid strokeDasharray="3 3" className="stroke-border" />
                    <XAxis 
                      dataKey="year" 
                      tick={{ fontSize: 12 }}
                      tickLine={false}
                      axisLine={false}
                    />
                    <YAxis 
                      tickFormatter={(value) => `${value}%`}
                      tick={{ fontSize: 12 }}
                      tickLine={false}
                      axisLine={false}
                      domain={[0, 100]}
                    />
                    <Tooltip content={<CustomTooltip />} />
                    <Line 
                      type="monotone" 
                      dataKey="occupancy" 
                      name="Occupancy"
                      stroke="hsl(var(--accent))" 
                      strokeWidth={3}
                      dot={{ fill: 'hsl(var(--accent))', strokeWidth: 2 }}
                      activeDot={{ r: 6 }}
                    />
                  </LineChart>
                </ResponsiveContainer>
              </div>
            </CardContent>
          </Card>
        </div>

        {/* Historical Data Table */}
        <Card>
          <CardHeader>
            <CardTitle>Year-by-Year Summary</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="overflow-x-auto">
              <table className="w-full">
                <thead>
                  <tr className="border-b">
                    {[
                      { key: 'year', label: 'Year' },
                      { key: 'roomsSold', label: 'Rooms Sold' },
                      { key: 'occupancy', label: 'Occupancy %' },
                      { key: 'revenue', label: 'Revenue' },
                      { key: 'avgRate', label: 'Avg Rate' },
                    ].map(({ key, label }) => (
                      <th 
                        key={key}
                        className="text-left py-3 px-4 font-medium text-muted-foreground cursor-pointer hover:text-foreground transition-colors"
                        onClick={() => handleSort(key)}
                      >
                        <div className="flex items-center gap-1">
                          {label}
                          {sortColumn === key && (
                            sortDirection === 'asc' 
                              ? <TrendingUp className="w-3 h-3" />
                              : <TrendingDown className="w-3 h-3" />
                          )}
                        </div>
                      </th>
                    ))}
                  </tr>
                </thead>
                <tbody>
                  {sortedData.map((row, index) => (
                    <tr key={index} className="border-b last:border-0 hover:bg-muted/50">
                      <td className="py-3 px-4 font-medium">{row.year}</td>
                      <td className="py-3 px-4">{row.roomsSold.toLocaleString()}</td>
                      <td className="py-3 px-4">{formatPercent(row.occupancy)}</td>
                      <td className="py-3 px-4">{formatCurrency(row.revenue)}</td>
                      <td className="py-3 px-4">{formatCurrency(row.avgRate)}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </CardContent>
        </Card>
      </div>
    </DashboardLayout>
  );
}