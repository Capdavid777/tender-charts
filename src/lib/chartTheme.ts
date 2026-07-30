/**
 * Shared Recharts theming so every chart reads from semantic design tokens
 * and stays readable in both light and dark mode.
 */

export const CHART_COLORS = [
  'hsl(var(--chart-1))',
  'hsl(var(--chart-2))',
  'hsl(var(--chart-3))',
  'hsl(var(--chart-4))',
  'hsl(var(--chart-5))',
];

export const CHART_POSITIVE = 'hsl(var(--chart-positive))';
export const CHART_NEGATIVE = 'hsl(var(--chart-negative))';

/** Grid lines: visible but never louder than the data. */
export const gridProps = {
  strokeDasharray: '3 3',
  stroke: 'hsl(var(--chart-grid))',
  strokeOpacity: 1,
} as const;

/** Axis ticks/labels with explicit fill (Recharts defaults to a hardcoded grey). */
export const axisProps = {
  tick: { fontSize: 12, fill: 'hsl(var(--chart-axis))' },
  tickLine: false,
  axisLine: false,
  stroke: 'hsl(var(--chart-axis))',
} as const;

/** Card-surface tooltip that inverts correctly with the theme. */
export const tooltipStyle: React.CSSProperties = {
  backgroundColor: 'hsl(var(--popover))',
  border: '1px solid hsl(var(--border))',
  borderRadius: 8,
  boxShadow: '0 8px 24px -8px hsl(var(--foreground) / 0.25)',
  color: 'hsl(var(--popover-foreground))',
  fontSize: 12,
};

export const tooltipLabelStyle: React.CSSProperties = {
  color: 'hsl(var(--foreground))',
  fontWeight: 600,
  marginBottom: 2,
};

export const tooltipItemStyle: React.CSSProperties = {
  color: 'hsl(var(--muted-foreground))',
};

/** Hover highlight behind bars — subtle in both themes. */
export const barCursor = { fill: 'hsl(var(--muted-foreground) / 0.12)' };
export const lineCursor = { stroke: 'hsl(var(--chart-axis))', strokeOpacity: 0.4 };

export const tooltipProps = {
  contentStyle: tooltipStyle,
  labelStyle: tooltipLabelStyle,
  itemStyle: tooltipItemStyle,
  cursor: barCursor,
} as const;
