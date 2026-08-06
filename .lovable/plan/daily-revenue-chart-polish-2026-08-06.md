# Daily Revenue chart polish

## What changes
The Daily Revenue chart currently draws flat green/red bars on a plain grid. This update gives it a more refined, readable look without changing any numbers:

- Bars get a subtle top-to-bottom gradient (stronger at the top, softer at the base) instead of flat fill, so the chart reads as depth rather than blocks.
- Hovering a day dims the other bars slightly so the day you're inspecting stands out, and the hover cursor highlight becomes a soft column tint instead of a hard grey block.
- Weekend days get a very light background band behind them, making week rhythm visible at a glance.
- The dashed "Target" reference line gets a small pill label so it stays legible against bars.
- The legend in the card header gains a third swatch for the target line so all three visual cues are explained.

Reduced-motion users keep the existing behaviour: no bar grow animation, and no hover dim transition.

## Technical details
- All work stays in `src/components/dashboard/RevenueChart.tsx`.
- Add two `<linearGradient>` defs (positive and negative) built from the existing `CHART_POSITIVE` / `CHART_NEGATIVE` tokens in `src/lib/chartTheme.ts`; `Cell` fills reference the gradient ids instead of the flat colour.
- Track the hovered bar index via `BarChart`'s `onMouseMove` / `onMouseLeave` and apply `fillOpacity` per `Cell` (1 for hovered or none hovered, ~0.45 otherwise). Skip the opacity change when `usePrefersReducedMotion()` is true.
- Replace the `barCursor` fill with a low-opacity `hsl(var(--muted))` rectangle.
- Weekend bands: derive weekend dates from the existing `data` entries and render `ReferenceArea` elements behind the bars.
- Target label: swap the plain `label` for a small `<Label>` with a rounded background rect.
- No new dependencies, no data/query changes, no changes to values, formatting, or the y-axis domain logic.

## Out of scope
Other charts, tables, and KPI cards are untouched.
