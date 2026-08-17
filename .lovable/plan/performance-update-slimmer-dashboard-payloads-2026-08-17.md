# Performance update: slimmer dashboard payloads

The dashboard currently downloads more data than it uses on every load, and the month list is fetched a second time separately. This trims both.

## What changes for you

- Faster first paint and faster refreshes on the Overview page, especially on mobile data.
- Smaller cached payload in the browser, so the offline/instant-reload cache stays well under its size limit as more months of data accumulate.
- No visual or behavioural change: same numbers, same charts, same month switching.

## What gets done

1. **Stop fetching unused columns.** The dashboard reads every column of `daily_revenue` (`select('*')`) for all history, but only uses date, revenue, rooms sold, average rate and occupancy. Narrow the select to those five columns.
2. **Reuse one month list.** The month selector context runs its own full-history query of `daily_revenue` dates on every app load. Derive the available months from the dashboard query result instead of issuing a second network round trip, keeping a lightweight fallback query for pages loaded without the dashboard.
3. **Give the core dashboard query a stale time** so navigating away and back doesn't trigger an immediate refetch of the full history.

## Technical notes

- `src/pages/Dashboard.tsx`: change the `daily_revenue` select in the `['dashboard','core']` query to `date, revenue, rooms_sold, average_rate, occupancy`; add `staleTime` (5 min) to the query options.
- `src/contexts/MonthContext.tsx`: convert `fetchMonths` into a TanStack Query keyed `['months']` selecting only `date`, with the same stale time, so it deduplicates and persists like the rest; keep `selectedMonth` session-storage behaviour and the `refetchMonths` API unchanged.
- No schema, RLS, or business-logic changes; aggregate rows are still filtered with `room_type_id IS NULL`.
