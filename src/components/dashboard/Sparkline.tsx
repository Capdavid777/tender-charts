import { usePrefersReducedMotion } from '@/hooks/usePrefersReducedMotion';
import { formatCurrency } from '@/lib/format';
import { cn } from '@/lib/utils';
import {
  Area,
  AreaChart,
  ResponsiveContainer,
  Tooltip,
} from 'recharts';

interface SparklineProps {
  data: number[];
  color?: string;
  className?: string;
}

export default function Sparkline({ data, color, className }: SparklineProps) {
  const prefersReducedMotion = usePrefersReducedMotion();

  if (!data || data.length < 2) return null;

  const chartData = data.map((value, index) => ({ index, value }));
  const strokeColor = color || 'hsl(var(--primary))';
  const gradientId = `sparkline-gradient-${Math.random().toString(36).slice(2, 9)}`;

  return (
    <div className={cn('w-full', className)}>
      <ResponsiveContainer width="100%" height={44}>
        <AreaChart data={chartData} margin={{ top: 4, right: 0, left: 0, bottom: 0 }}>
          <defs>
            <linearGradient id={gradientId} x1="0" y1="0" x2="0" y2="1">
              <stop offset="0%" stopColor={strokeColor} stopOpacity={0.35} />
              <stop offset="100%" stopColor={strokeColor} stopOpacity={0.02} />
            </linearGradient>
          </defs>
          <Tooltip
            content={({ active, payload }) => {
              if (active && payload && payload.length) {
                return (
                  <div className="bg-popover text-popover-foreground border border-border rounded-md shadow-md px-2 py-1 text-xs">
                    <span className="font-medium">{formatCurrency(payload[0].value as number)}</span>
                  </div>
                );
              }
              return null;
            }}
            cursor={{ stroke: 'hsl(var(--chart-axis))', strokeOpacity: 0.3, strokeWidth: 1 }}
          />
          <Area
            type="monotone"
            dataKey="value"
            stroke={strokeColor}
            strokeWidth={2}
            fill={`url(#${gradientId})`}
            isAnimationActive={!prefersReducedMotion}
            animationDuration={900}
            animationBegin={100}
          />
        </AreaChart>
      </ResponsiveContainer>
    </div>
  );
}
