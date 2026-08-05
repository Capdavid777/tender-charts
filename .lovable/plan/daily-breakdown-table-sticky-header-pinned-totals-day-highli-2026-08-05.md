# Daily Breakdown table: sticky header, pinned totals, day highlights

## What changes
The Daily Breakdown tables (actuals and forecast) scroll inside a fixed-height box, so once you scroll past the first few days you lose the column labels and can't see the Total / Avg row without scrolling to the bottom. This update makes the table readable at any scroll position and makes strong/weak days visible at a glance.

- Column header row sticks to the top of the scroll area.
- The Total / Avg row pins to the bottom of the scroll area so totals are always visible.
- The best revenue day and the weakest revenue day of the month get a subtle accent tint plus a small "Best" / "Lowest" tag, so patterns stand out without reading every number.
- Today's row (when it is in range) gets a soft highlight ring.
- Rows fade in with a short stagger on load, disabled for users who prefer reduced motion.

No number, formula, or data change — same values, same currency and percent formatting.

## Technical details
- Edit `src/components/dashboard/DailyDataTable.tsx` only.
- Add `sticky top-0 z-10 bg-card` to the `TableHeader` row cells, and `sticky bottom-0 z-10` with a solid token background to the summary row so it doesn't blend with scrolling rows.
- Compute `maxRevenueDate` / `minRevenueDate` from the already-sorted rows in the existing pass; tint via semantic tokens (`bg-success/10`, `bg-destructive/10`) — no hardcoded colors.
- Today's row detected against the local date string; highlight with `ring-1 ring-primary/40`.
- Stagger: `animate-fade-in` with an inline `animationDelay` capped at ~300ms total, skipped when `usePrefersReducedMotion()` is true.

## Out of scope
No query, aggregation, or Dashboard page changes.
