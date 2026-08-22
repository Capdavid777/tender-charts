# Instant page loads: hover prefetch for every tab

## What changes
Today only the Room Types tab warms its data when you hover its nav link. Every other tab (Overview, Historical, Analysis, Website) loads its chunk on hover but still starts fetching data only after you click, so you see a skeleton for a moment.

This update makes each tab warm its own data on hover/focus/tap-start, so by the time you click, the page usually renders fully populated.

- Overview, Historical, Analysis and Website tabs each get data warming.
- Warming uses the currently selected month, so you land on the right period.
- Cached data is reused (no duplicate network calls) and nothing refetches more often than today.

## Technical details
- `src/lib/routePreload.ts` already calls `mod.prefetchRouteData?.(queryClient, month)` after loading a route chunk. No change needed there.
- Add an exported `prefetchRouteData(queryClient, month?)` to:
  - `src/pages/Dashboard.tsx` — prefetch `['dashboard','core']` and `otherIncomeQueryKey(month)` with the same `staleTime: 5min`, reusing the existing fetch functions (extract the core query's `queryFn` into a module-level `fetchDashboardCore` so both the hook and the prefetch share it).
  - `src/pages/Historical.tsx` — prefetch `['historical-by-month', monthNum]` using the same extracted fetcher.
  - `src/pages/Analysis.tsx` — prefetch `['monthly-analysis', month]`.
  - `src/pages/WebsiteAnalytics.tsx` — prefetch its report query key.
- Each page keeps its existing query key/staleTime constants; the prefetch calls `queryClient.prefetchQuery` with identical options so the hook hits the warm cache.
- No changes to query shapes, so no cache-buster bump needed.

## Out of scope
No visual/layout changes, no business logic, no backend changes.
