import { useState, useEffect } from 'react';
import { usePrefersReducedMotion } from '@/hooks/usePrefersReducedMotion';
import DashboardLayout from '@/components/layout/DashboardLayout';
import KPICard from '@/components/dashboard/KPICard';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { BedDouble, DollarSign, Percent, TrendingUp } from 'lucide-react';
import { formatCurrency, formatPercent } from '@/lib/format';
import { supabase } from '@/integrations/supabase/client';
import { useMonth } from '@/contexts/MonthContext';
import MonthSelector from '@/components/MonthSelector';
import {
  PieChart,
  Pie,
  Cell,
  ResponsiveContainer,
  Legend,
  Tooltip,
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
} from 'recharts';

const COLORS = [
  'hsl(222, 47%, 20%)',
  'hsl(38, 92%, 50%)',
  'hsl(142, 76%, 36%)',
  'hsl(199, 89%, 48%)',
];

interface RoomTypeData {
  name: string;
  revenue: number;
  occupancy: number;
  adr: number;
  rooms: number;
}

export default function RoomTypes() {
  const [roomTypes, setRoomTypes] = useState<RoomTypeData[]>([]);
  const [totalRevenue, setTotalRevenue] = useState(0);
  const [weightedAdr, setWeightedAdr] = useState(0);
  const [avgOccupancy, setAvgOccupancy] = useState(0);
  const { selectedMonth } = useMonth();

  useEffect(() => {
    const fetchData = async () => {
      const { data: rtData } = await supabase
        .from('room_types')
        .select('*')
        .order('name');

      // Use shared selectedMonth or fall back to latest month with data
      let year: number, monthIdx: number;
      
      if (selectedMonth) {
        const parts = selectedMonth.split('-').map(Number);
        year = parts[0];
        monthIdx = parts[1] - 1;
      } else {
        // Fallback: find most recent month with data
        const { data: latestRecord } = await supabase
          .from('daily_revenue')
          .select('date')
          .is('room_type_id', null)
          .order('date', { ascending: false })
          .limit(1)
          .maybeSingle();

        const refDate = latestRecord ? new Date(latestRecord.date + 'T00:00:00') : new Date();
        year = refDate.getFullYear();
        monthIdx = refDate.getMonth();
      }

      const month = String(monthIdx + 1).padStart(2, '0');
      const startDate = `${year}-${month}-01`;
      const endDate = `${year}-${month}-${new Date(year, monthIdx + 1, 0).getDate()}`;

      // Fetch aggregate daily data (room_type_id is null)
      const { data: revenueData } = await supabase
        .from('daily_revenue')
        .select('revenue, rooms_sold, average_rate, occupancy')
        .is('room_type_id', null)
        .gte('date', startDate)
        .lte('date', endDate);

      const totalRev = revenueData?.reduce((sum, d) => sum + Number(d.revenue || 0), 0) || 0;
      setTotalRevenue(totalRev);

      const totalRoomsSold = revenueData?.reduce((sum, d) => sum + Number(d.rooms_sold || 0), 0) || 0;
      const calculatedWeightedAdr = totalRoomsSold > 0 ? totalRev / totalRoomsSold : 0;
      setWeightedAdr(calculatedWeightedAdr);

      const daysWithOccupancy = revenueData?.filter(d => (d.occupancy ?? 0) > 0) || [];
      if (daysWithOccupancy.length > 0) {
        const avg = daysWithOccupancy.reduce((sum, d) => sum + Number(d.occupancy || 0), 0) / daysWithOccupancy.length;
        setAvgOccupancy(Number((avg * 100).toFixed(2)));
      }

      // Fetch per-room-type revenue data
      const { data: rtRevenueData } = await supabase
        .from('daily_revenue')
        .select('room_type_id, revenue, rooms_sold, average_rate, occupancy')
        .not('room_type_id', 'is', null)
        .gte('date', startDate)
        .lte('date', endDate);

      if (rtData && rtData.length > 0) {
        const validRtData = rtData.filter(rt => rt.name && rt.name.trim() !== '');
        // Build a map of room_type_id -> aggregated data
        const rtRevenueMap = new Map<string, { revenue: number; roomsSold: number; occupancy: number }>();
        rtRevenueData?.forEach(d => {
          const id = d.room_type_id!;
          const existing = rtRevenueMap.get(id) || { revenue: 0, roomsSold: 0, occupancy: 0 };
          existing.revenue += Number(d.revenue || 0);
          existing.roomsSold += Number(d.rooms_sold || 0);
          existing.occupancy += Number(d.occupancy || 0);
          rtRevenueMap.set(id, existing);
        });

        setRoomTypes(validRtData.map(rt => {
          const data = rtRevenueMap.get(rt.id);
          return {
            name: rt.name,
            revenue: data?.revenue || 0,
            occupancy: data ? Number((data.occupancy * 100).toFixed(2)) : 0,
            adr: data && data.roomsSold > 0 ? Number((data.revenue / data.roomsSold).toFixed(2)) : 0,
            rooms: rt.total_rooms,
          };
        }));
      }
    };

    fetchData();
  }, [selectedMonth]);

  const totalRoomTypes = roomTypes.length;

  const pieData = roomTypes.map(r => ({
    name: r.name,
    value: r.revenue,
  }));

  const CustomTooltip = ({ active, payload }: any) => {
    if (active && payload && payload.length) {
      return (
        <div className="bg-card border rounded-lg shadow-lg p-3">
          <p className="font-medium text-foreground">{payload[0].name}</p>
          <p className="text-sm text-muted-foreground">
            Revenue: <span className="font-semibold">{formatCurrency(payload[0].value)}</span>
          </p>
          <p className="text-sm text-muted-foreground">
            Share: <span className="font-semibold">
              {((payload[0].value / totalRevenue) * 100).toFixed(2)}%
            </span>
          </p>
        </div>
      );
    }
    return null;
  };

  return (
    <DashboardLayout>
      <div className="space-y-6">
        {/* Page title + Month selector */}
        <div className="flex items-center justify-between flex-wrap gap-4">
          <div>
            <h2 className="text-2xl font-bold text-foreground">Room Types</h2>
            <p className="text-muted-foreground">Performance breakdown by room category</p>
          </div>
          <MonthSelector />
        </div>

        {/* Summary KPIs */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
          <KPICard
            title="Active Room Types"
            value={totalRoomTypes.toString()}
            subtitle="Categories tracked"
            icon={<BedDouble className="w-5 h-5 text-primary" />}
          />
          <KPICard
            title="Revenue MTD"
            value={formatCurrency(totalRevenue)}
            subtitle="All room types"
            icon={<DollarSign className="w-5 h-5 text-primary" />}
            variant="success"
          />
          <KPICard
            title="Weighted ADR"
            value={formatCurrency(weightedAdr)}
            subtitle="Revenue ÷ rooms sold"
            icon={<TrendingUp className="w-5 h-5 text-primary" />}
          />
          <KPICard
            title="Avg Occupancy"
            value={formatPercent(avgOccupancy)}
            subtitle="All room types"
            icon={<Percent className="w-5 h-5 text-primary" />}
          />
        </div>

        {/* Charts */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          {/* Revenue Breakdown Pie Chart */}
          <Card>
            <CardHeader>
              <CardTitle>Revenue by Room Type</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="h-[300px] flex items-center justify-center">
                {pieData.some(d => d.value > 0) ? (
                  <ResponsiveContainer width="100%" height="100%">
                    <PieChart>
                      <Pie
                        data={pieData}
                        cx="50%"
                        cy="50%"
                        innerRadius={60}
                        outerRadius={100}
                        paddingAngle={2}
                        dataKey="value"
                        isAnimationActive
                        animationDuration={1000}
                        animationBegin={150}
                      >
                        {pieData.map((entry, index) => (
                          <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                        ))}
                      </Pie>
                      <Tooltip content={<CustomTooltip />} />
                      <Legend 
                        verticalAlign="bottom" 
                        height={36}
                        formatter={(value) => <span className="text-sm text-foreground">{value}</span>}
                      />
                    </PieChart>
                  </ResponsiveContainer>
                ) : (
                  <div className="text-center space-y-2">
                    <p className="text-muted-foreground text-sm">No revenue data by room type available</p>
                    <p className="text-muted-foreground text-xs">Daily revenue records need to be linked to room types</p>
                  </div>
                )}
              </div>
            </CardContent>
          </Card>

          {/* Occupancy vs ADR Bar Chart */}
          <Card>
            <CardHeader>
              <CardTitle>Occupancy vs ADR Comparison</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="h-[300px]">
                <ResponsiveContainer width="100%" height="100%">
                  <BarChart 
                    data={roomTypes} 
                    layout="vertical"
                    margin={{ top: 10, right: 30, left: 100, bottom: 10 }}
                  >
                    <CartesianGrid strokeDasharray="3 3" className="stroke-border" />
                    <XAxis type="number" tickLine={false} axisLine={false} />
                    <YAxis 
                      type="category" 
                      dataKey="name" 
                      tick={{ fontSize: 12 }}
                      tickLine={false}
                      axisLine={false}
                      width={90}
                    />
                    <Tooltip 
                      contentStyle={{ 
                        backgroundColor: 'hsl(var(--card))',
                        border: '1px solid hsl(var(--border))',
                        borderRadius: '8px',
                      }}
                    />
                    <Bar dataKey="occupancy" name="Occupancy %" fill="hsl(var(--primary))" radius={[0, 4, 4, 0]} isAnimationActive animationDuration={800} animationBegin={100} />
                    <Bar dataKey="adr" name="ADR (R)" fill="hsl(38, 92%, 50%)" radius={[0, 4, 4, 0]} isAnimationActive animationDuration={800} animationBegin={250} />
                  </BarChart>
                </ResponsiveContainer>
              </div>
            </CardContent>
          </Card>
        </div>

        {/* Room Type Details Table */}
        <Card>
          <CardHeader>
            <CardTitle>Room Type Details</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="overflow-x-auto">
              <table className="w-full">
                <thead>
                  <tr className="border-b">
                    <th className="text-left py-3 px-4 font-medium text-muted-foreground">Room Type</th>
                    <th className="text-right py-3 px-4 font-medium text-muted-foreground">Rooms</th>
                    <th className="text-right py-3 px-4 font-medium text-muted-foreground">Revenue</th>
                    <th className="text-right py-3 px-4 font-medium text-muted-foreground">Occupancy</th>
                    <th className="text-right py-3 px-4 font-medium text-muted-foreground">ADR</th>
                  </tr>
                </thead>
                <tbody>
                  {roomTypes.map((room, index) => (
                    <tr key={index} className="border-b last:border-0 hover:bg-muted/50">
                      <td className="py-3 px-4 font-medium">{room.name}</td>
                      <td className="py-3 px-4 text-right">{room.rooms}</td>
                      <td className="py-3 px-4 text-right">{formatCurrency(room.revenue)}</td>
                      <td className="py-3 px-4 text-right">{formatPercent(room.occupancy)}</td>
                      <td className="py-3 px-4 text-right">{formatCurrency(room.adr)}</td>
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