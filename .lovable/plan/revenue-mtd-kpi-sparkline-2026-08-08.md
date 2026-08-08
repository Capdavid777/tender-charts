# Revenue MTD KPI sparkline

## What changes
The Revenue MTD KPI card currently shows a single total and a progress bar. This update adds a tiny trend sparkline below the value so staff can see at a glance whether revenue is rising, flat, or falling through the month — without needing to scroll to the full chart.

- A smooth area sparkline renders the daily revenue sequence for the current month.
- The line/area color matches the card's status (success/warning/danger) so it reinforces the KPI's meaning.
- Hovering the sparkline shows a small tooltip with the exact revenue for that day.
- Reduced-motion users see the sparkline rendered without the entry animation.
- The KPI skeleton is updated to include a sparkline placeholder so loading cards keep the same height.

## Technical details
- Create `src/components/dashboard/Sparkline.tsx`: a tiny Recharts `AreaChart` (height ~44px) with no axes, no grid, and a gradient fill. Accepts `{ data: number[]; colorClass?: string; }`.
- Extend `KPICardProps` in `src/components/dashboard/KPICard.tsx` with an optional `sparklineData?: number[]` prop. Render the sparkline between the value/subtitle block and the progress bar.
- Pass `dailyData.map(d => d.revenue)` to the Revenue MTD card in `src/pages/Dashboard.tsx`.
- Update `src/components/ui/skeleton-variants.tsx` (`KPICardSkeleton`) to add a sparkline-shaped skeleton bar so the loading layout matches the loaded layout.
- Use `usePrefersReducedMotion()` to disable the sparkline's `isAnimationActive` when the user prefers reduced motion.

## Out of scope
- No changes to data queries, calculations, or other KPI cards.
- No changes to the full RevenueChart or DailyDataTable.
