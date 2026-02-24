import { useState, useEffect } from 'react';
import DashboardLayout from '@/components/layout/DashboardLayout';
import KPICard from '@/components/dashboard/KPICard';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { BedDouble, DollarSign, Percent, TrendingUp } from 'lucide-react';
import { formatCurrency, formatPercent } from '@/lib/format';
import { supabase } from '@/integrations/supabase/client';
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

// Sample data - will be populated from database
const sampleRoomData = [
  { name: 'Deluxe 1 Bedroom', revenue: 145000, occupancy: 78, adr: 1650, rooms: 8 },
  { name: 'Standard 1 Bedroom', revenue: 95000, occupancy: 72, adr: 1350, rooms: 6 },
  { name: 'Studio', revenue: 48000, occupancy: 85, adr: 950, rooms: 4 },
  { name: 'Penthouse', revenue: 62000, occupancy: 65, adr: 2800, rooms: 2 },
];

const COLORS = [
  'hsl(222, 47%, 20%)',
  'hsl(38, 92%, 50%)',
  'hsl(142, 76%, 36%)',
  'hsl(199, 89%, 48%)',
];

export default function RoomTypes() {
  const [roomTypes, setRoomTypes] = useState(sampleRoomData);

  useEffect(() => {
    const fetchRoomTypes = async () => {
      const { data } = await supabase
        .from('room_types')
        .select('*')
        .order('name');
      
      if (data && data.length > 0) {
        // For now, use sample data with room type names from DB
        // Real implementation would join with daily_revenue
      }
    };

    fetchRoomTypes();
  }, []);

  const totalRoomTypes = roomTypes.length;
  const totalRevenue = roomTypes.reduce((sum, r) => sum + r.revenue, 0);
  const weightedAdr = roomTypes.reduce((sum, r) => sum + (r.adr * r.rooms), 0) / 
                      roomTypes.reduce((sum, r) => sum + r.rooms, 0);
  const avgOccupancy = roomTypes.reduce((sum, r) => sum + r.occupancy, 0) / roomTypes.length;

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
        {/* Page title */}
        <div>
          <h2 className="text-2xl font-bold text-foreground">Room Types</h2>
          <p className="text-muted-foreground">Performance breakdown by room category</p>
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
            subtitle="Across all rooms"
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
              <div className="h-[300px]">
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
                    <Bar dataKey="occupancy" name="Occupancy %" fill="hsl(var(--primary))" radius={[0, 4, 4, 0]} />
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