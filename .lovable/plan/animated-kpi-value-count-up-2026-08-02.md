# Animated KPI value count-up

## What changes
The KPI cards on the Overview page currently snap their big numbers into place the moment data arrives. This update makes each value roll up from zero to its final figure over a short, smooth animation, so the dashboard feels alive when data loads or when you switch months.

Applies to all KPI cards (revenue, occupancy, ADR, etc.) — currency symbols, percent signs and decimal formatting stay exactly as they are today.

Respects the reduced-motion setting: users who prefer reduced motion see the final number immediately, no animation.

## Technical details
- Add `src/hooks/useCountUp.ts`: takes the already-formatted display string (e.g. `R1,377,267.86`, `68.0%`), splits it into prefix / numeric / suffix, and animates the numeric part with `requestAnimationFrame` using an ease-out curve (~700ms), re-formatting with the same decimal count and thousands separators each frame.
- Returns the original string unchanged when the value has no parseable number, or when `usePrefersReducedMotion()` (already in the project) is true.
- Wire it into `src/components/dashboard/KPICard.tsx` only — replace `{value}` with the animated string. No prop signature change, so no call-site edits in `src/pages/Dashboard.tsx`.
- Animation restarts whenever the incoming `value` prop changes (month switch, refresh).

## Out of scope
No data, query, or layout changes.
