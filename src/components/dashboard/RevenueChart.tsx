import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { formatCurrency } from '@/lib/format';
import { 
  BarChart, 
  Bar, 
  XAxis, 
  YAxis, 
  CartesianGrid, 
  Tooltip, 
  ResponsiveContainer,
  ReferenceLine,
  Cell
} from 'recharts';

interface DailyData {
  date: string;
  revenue: number;
  target: number;
}

interface RevenueChartProps {
  data: DailyData[];
  dailyTarget: number;
}

// Ensure Y-axis includes the target line
function getYDomain(data: DailyData[], dailyTarget: number): [number, number] {
  const maxRevenue = Math.max(...data.map(d => d.revenue), 0);
  const upper = Math.max(maxRevenue, dailyTarget) * 1.1; // 10% padding
  return [0, upper];
}

export default function RevenueChart({ data, dailyTarget }: RevenueChartProps) {

  const CustomTooltip = ({ active, payload, label }: any) => {
    if (active && payload && payload.length) {
      const revenue = payload[0].value;
      const variance = revenue - dailyTarget;
      const isAboveTarget = variance >= 0;
      
      return (
        <div className="bg-card border rounded-lg shadow-lg p-3">
          <p className="font-medium text-foreground">{label}</p>
          <p className="text-sm text-muted-foreground">
            Revenue: <span className="font-semibold">{formatCurrency(revenue)}</span>
          </p>
          <p className="text-sm text-muted-foreground">
            Target: <span className="font-semibold">{formatCurrency(dailyTarget)}</span>
          </p>
          <p className={`text-sm font-medium ${isAboveTarget ? 'text-success' : 'text-destructive'}`}>
            {isAboveTarget ? '+' : ''}{formatCurrency(variance)} ({isAboveTarget ? 'above' : 'below'} target)
          </p>
        </div>
      );
    }
    return null;
  };

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center justify-between">
          <span>Daily Revenue</span>
          <div className="flex items-center gap-4 text-sm font-normal">
            <div className="flex items-center gap-2">
              <div className="w-3 h-3 rounded bg-success" />
              <span className="text-muted-foreground">Above target</span>
            </div>
            <div className="flex items-center gap-2">
              <div className="w-3 h-3 rounded bg-destructive" />
              <span className="text-muted-foreground">Below target</span>
            </div>
          </div>
        </CardTitle>
      </CardHeader>
      <CardContent>
        <div className="h-[300px]">
          <ResponsiveContainer width="100%" height="100%">
            <BarChart data={data} margin={{ top: 10, right: 10, left: 10, bottom: 20 }}>
              <CartesianGrid strokeDasharray="3 3" className="stroke-border" />
              <XAxis 
                dataKey="date" 
                tick={{ fontSize: 12 }}
                tickLine={false}
                axisLine={false}
                className="text-muted-foreground"
              />
              <YAxis 
                domain={dailyTarget > 0 ? getYDomain(data, dailyTarget) : undefined}
                tickFormatter={(value) => `R${(value / 1000).toFixed(0)}k`}
                tick={{ fontSize: 12 }}
                tickLine={false}
                axisLine={false}
                className="text-muted-foreground"
              />
              <Tooltip content={<CustomTooltip />} />
              <ReferenceLine 
                y={dailyTarget} 
                stroke="hsl(var(--accent))" 
                strokeDasharray="5 5"
                label={{ 
                  value: 'Target', 
                  position: 'right',
                  className: 'text-xs fill-accent'
                }}
              />
              <Bar
                dataKey="revenue"
                radius={[4, 4, 0, 0]}
                isAnimationActive
                animationDuration={900}
                animationBegin={100}
              >
                {data.map((entry, index) => (
                  <Cell
                    key={`cell-${index}`}
                    fill={entry.revenue >= dailyTarget
                      ? 'hsl(var(--success))'
                      : 'hsl(var(--destructive))'
                    }
                  />
                ))}
              </Bar>
            </BarChart>
          </ResponsiveContainer>
        </div>
      </CardContent>
    </Card>
  );
}