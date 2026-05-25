import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Skeleton } from '@/components/ui/skeleton';
import { formatCurrency, formatPercent } from '@/lib/format';
import { BarChart3, TrendingUp, TrendingDown, Minus } from 'lucide-react';
import { cn } from '@/lib/utils';

interface RawDailyData {
  date: string;
  revenue: number;
  rooms_sold: number | null;
  average_rate: number | null;
  occupancy: number | null;
}

interface MonthProjectionSummaryProps {
  actualData: RawDailyData[];
  forecastData: RawDailyData[];
  targetRevenue: number;
  targetOccupancy: number;
  availableRooms: number;
  otherIncomeTotal?: number;
}

export default function MonthProjectionSummary({
  actualData,
  forecastData,
  targetRevenue,
  targetOccupancy,
  availableRooms,
  otherIncomeTotal = 0,
}: MonthProjectionSummaryProps) {
  if (actualData.length === 0 && forecastData.length === 0) return null;

  const actualRoomRevenue = actualData.reduce((s, d) => s + Number(d.revenue), 0);
  const actualRevenue = actualRoomRevenue + otherIncomeTotal;
  const forecastRevenue = forecastData.reduce((s, d) => s + Number(d.revenue), 0);
  const projectedRevenue = actualRevenue + forecastRevenue;

  const actualRoomsSold = actualData.reduce((s, d) => s + (d.rooms_sold || 0), 0);
  const forecastRoomsSold = forecastData.reduce((s, d) => s + (d.rooms_sold || 0), 0);
  const projectedRoomsSold = actualRoomsSold + forecastRoomsSold;

  // Projected occupancy: weighted average across all days
  const allData = [...actualData, ...forecastData];
  const daysWithOcc = allData.filter(d => (d.occupancy ?? 0) > 0);
  const projectedOccupancy = daysWithOcc.length > 0
    ? (daysWithOcc.reduce((s, d) => s + (d.occupancy || 0), 0) / daysWithOcc.length) * 100
    : 0;

  // Projected ADR
  const daysWithRate = allData.filter(d => (d.average_rate ?? 0) > 0);
  const projectedAdr = daysWithRate.length > 0
    ? daysWithRate.reduce((s, d) => s + (d.average_rate || 0), 0) / daysWithRate.length
    : 0;

  const revenueVariance = targetRevenue > 0
    ? ((projectedRevenue - targetRevenue) / targetRevenue) * 100
    : 0;

  const revenueProgress = targetRevenue > 0
    ? Math.min((projectedRevenue / targetRevenue) * 100, 100)
    : 0;

  const metrics = [
    {
      label: 'Actual Revenue (MTD)',
      value: formatCurrency(actualRevenue),
      sublabel: `${actualData.length} days recorded`,
    },
    {
      label: 'Forecast Revenue',
      value: formatCurrency(forecastRevenue),
      sublabel: `${forecastData.length} days projected`,
    },
    {
      label: 'Projected Month Total',
      value: formatCurrency(projectedRevenue),
      sublabel: targetRevenue > 0
        ? `${revenueVariance >= 0 ? '+' : ''}${revenueVariance.toFixed(1)}% vs target`
        : undefined,
      highlight: true,
      variant: revenueVariance >= 0 ? 'success' : revenueVariance >= -10 ? 'warning' : 'danger',
    },
    {
      label: 'Projected Occupancy',
      value: formatPercent(projectedOccupancy),
      sublabel: `Target: ${formatPercent(targetOccupancy)}`,
      variant: projectedOccupancy >= targetOccupancy ? 'success' : 'warning',
    },
    {
      label: 'Projected ADR',
      value: formatCurrency(Math.round(projectedAdr)),
      sublabel: `${projectedRoomsSold} total rooms`,
    },
  ];

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <BarChart3 className="w-5 h-5 text-primary" />
          Month-End Projection
        </CardTitle>
      </CardHeader>
      <CardContent>
        {/* Progress bar toward target */}
        {targetRevenue > 0 && (
          <div className="mb-6">
            <div className="flex items-center justify-between text-sm mb-1.5">
              <span className="text-muted-foreground">Projected vs Target</span>
              <span className="font-medium">{formatCurrency(projectedRevenue)} / {formatCurrency(targetRevenue)}</span>
            </div>
            <div className="h-3 bg-secondary rounded-full overflow-hidden">
              {/* Actual portion */}
              <div className="h-full flex">
                <div
                  className="h-full bg-primary transition-all duration-500"
                  style={{ width: `${Math.min((actualRevenue / targetRevenue) * 100, 100)}%` }}
                />
                <div
                  className="h-full bg-primary/40 transition-all duration-500"
                  style={{ width: `${Math.min((forecastRevenue / targetRevenue) * 100, 100 - Math.min((actualRevenue / targetRevenue) * 100, 100))}%` }}
                />
              </div>
            </div>
            <div className="flex items-center gap-4 mt-1.5 text-xs text-muted-foreground">
              <span className="flex items-center gap-1">
                <span className="w-2.5 h-2.5 rounded-full bg-primary inline-block" />
                Actual
              </span>
              <span className="flex items-center gap-1">
                <span className="w-2.5 h-2.5 rounded-full bg-primary/40 inline-block" />
                Forecast
              </span>
            </div>
          </div>
        )}

        {/* Metric cards */}
        <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-5 gap-4">
          {metrics.map((m) => (
            <div
              key={m.label}
              className={cn(
                'rounded-lg border p-3 space-y-1',
                m.highlight && 'bg-muted/50 border-primary/20'
              )}
            >
              <p className="text-xs text-muted-foreground">{m.label}</p>
              <p className={cn(
                'text-lg font-bold',
                m.variant === 'success' && 'text-success',
                m.variant === 'danger' && 'text-destructive',
                m.variant === 'warning' && 'text-warning',
              )}>
                {m.value}
              </p>
              {m.sublabel && (
                <p className={cn(
                  'text-xs',
                  m.variant === 'success' ? 'text-success' : m.variant === 'danger' ? 'text-destructive' : 'text-muted-foreground'
                )}>
                  {m.sublabel}
                </p>
              )}
            </div>
          ))}
        </div>
      </CardContent>
    </Card>
  );
}
