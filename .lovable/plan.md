# Performance Update: Memoize Dashboard Derived Data

## Why
`src/pages/Dashboard.tsx` recomputes several expensive derivations on every render — splitting actual vs forecast rows, summing revenue/rooms, computing weighted occupancy & ADR, building chart series, and deriving alert thresholds. These run again every time the MonthSelector, refresh, or any unrelated state nudges the component, even when the underlying Supabase data hasn't changed.

## What changes
- Wrap each derived value in `useMemo`, keyed on its real inputs (`dailyData`, `targets`, `otherIncomeTotal`, `today`).
- Wrap the actual/forecast split into a single memo that returns `{ actual, forecast }` so downstream memos share it.
- Memoize the chart-ready array passed to `RevenueChart` so Recharts skips re-renders when data is identical.
- Wrap stable callbacks (refresh handler, month change) in `useCallback` so memoized child components (KPICard, charts) don't re-render on parent state changes.

## Scope
- Single file: `src/pages/Dashboard.tsx`.
- No business-logic changes — pure refactor. Outputs and target values stay identical.
- No DB or schema changes.

## Verification
- Visual: dashboard renders identically; KPIs, chart, projection bar, alerts unchanged.
- Perf: fewer recomputations during loading-skeleton swap, month change, and refresh cycles — noticeably smoother on lower-end devices.
