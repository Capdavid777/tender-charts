# Mobile-friendly Historical and Room Types tables

The Daily Breakdown already switches to stacked cards on phones. The two remaining data tables — the Year-by-Year summary on Historical and the Room Type Details table on Room Types — still render full-width tables inside a horizontal scroller, so on a phone they need sideways scrolling and the numbers get cramped.

## What changes

- Below the `sm` breakpoint, each of these tables is replaced by a stacked card list, one card per row:
  - Historical: year as the card title, revenue large, with rooms sold / occupancy / avg rate in a three-up row beneath.
  - Room Types: room type name as the title, revenue large, with rooms sold / occupancy / ADR beneath.
- Sorting stays available on mobile via the same compact pill row used on the Daily Breakdown, driving the existing sort state so both layouts stay in sync.
- Any existing highlighting (best/worst, clamped occupancy) is preserved as a coloured left edge on the card.
- Desktop layouts are unchanged.

## Technical notes

- Work stays in `src/pages/Historical.tsx` and `src/pages/RoomTypes.tsx`. Both already compute their sorted/derived rows above the render, so both layouts consume the same arrays — no duplicated logic and no data or query changes.
- Layout switch uses Tailwind responsive classes (`hidden sm:block` on the table wrapper, `sm:hidden` on the card list) so there is no JS breakpoint or extra re-render.
- Entry animations follow the existing `usePrefersReducedMotion` pattern used by `DailyDataTable`.

## Out of scope

No business logic, formatting, or backend changes.
