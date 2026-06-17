# Eliminate Revenue MTD flicker on Dashboard load

## The issue (visual + minor perf)

`Revenue MTD` briefly displays the rooms-only total, then jumps up once `OtherIncomeSummary` finishes its own separate query and calls `onTotalChange`. On slower connections this is a visible value flash (and a second re-render of all KPI cards).

Sequence today:
1. `Dashboard.fetchData()` runs 4 parallel queries → `loading = false`
2. KPIs render with `otherIncomeTotal = 0` → `Revenue MTD = roomRevenue`
3. `OtherIncomeSummary` mounts, fires its own `other_income` query
4. `onTotalChange(total)` fires → Dashboard re-renders → Revenue MTD jumps to `roomRevenue + otherIncomeTotal`

## The fix

Move the `other_income` query into Dashboard's existing `Promise.all` in `fetchData()`, store the aggregated total in Dashboard state, and pass the items down to `OtherIncomeSummary` as a prop instead of having it fetch its own data.

## Changes

**`src/pages/Dashboard.tsx`**
- Add `other_income` to the parallel `Promise.all` (5 queries instead of 4, same wall-clock time).
- Compute `otherIncomeTotal` from the result and seed it before first paint, so `Revenue MTD` is correct on the first render.
- Remove `onTotalChange` wiring; pass `items` down to `OtherIncomeSummary`.

**`src/components/dashboard/OtherIncomeSummary.tsx`**
- Accept `items` (and optionally `loading`) as props.
- Remove the internal `useEffect` + supabase fetch + `app:refresh-data` listener (Dashboard already owns that listener and will re-pass new items).
- Keep the existing card markup and skeleton state unchanged.

## Result

- No more Revenue MTD value flash on load.
- One fewer round-trip on the wire (folded into the existing parallel batch).
- One fewer Dashboard re-render after initial paint.
- Zero visual changes when data is settled — same cards, same skeletons, same layout.
