# Mobile-friendly Daily Breakdown

The Daily Breakdown table currently renders five columns regardless of screen size. On a phone that means horizontal scrolling and cramped numbers, which is the worst-looking part of the dashboard on mobile.

## What changes

- On screens narrower than `sm`, the table is replaced by a stacked card list — one card per day showing the date, revenue (large), and rooms sold / occupancy / ADR as a small three-up row underneath.
- Best and weakest revenue days keep their existing highlight treatment as a coloured left edge on the card.
- A totals card pins to the bottom of the list with the same month totals and averages the totals row shows today.
- Sorting stays available on mobile through a compact sort control (a small segmented row of the same sort keys) so the existing sort state drives both layouts.
- Desktop layout is unchanged.

## Technical notes

- All work stays in `src/components/dashboard/DailyDataTable.tsx`. Sorting, filtering, totals and best/worst calculations are already computed once above the render, so both layouts consume the same derived arrays — no logic duplication or data changes.
- Layout switch uses Tailwind responsive classes (`hidden sm:block` on the table wrapper, `sm:hidden` on the card list) rather than JS breakpoints, so there is no hydration flash or extra re-render.
- Entry animations and reduced-motion handling follow the existing `usePrefersReducedMotion` pattern.
