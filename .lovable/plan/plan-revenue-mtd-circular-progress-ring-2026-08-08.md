# Plan: Revenue MTD Circular Progress Ring

## Goal
Give the top "Revenue MTD" KPI card a more premium, glanceable visual by replacing its linear progress bar with a compact SVG ring that sits beside the main value.

## What will change
1. **New component** `src/components/ui/circular-progress.tsx`
   - Small SVG ring built with theme tokens (`--primary`, `--secondary`, `--success`, `--destructive`, `--accent`).
   - Accepts `value` (0-100), `size`, `strokeWidth`, and optional `variant`.
   - Respects reduced motion: no animated stroke when the user prefers reduced motion.

2. **Update** `src/components/dashboard/KPICard.tsx`
   - Add an optional `progressStyle?: 'bar' | 'ring'` prop (defaults to `bar`).
   - When `progressStyle="ring"`, render the new `CircularProgress` inline next to the value/icon area instead of the bottom bar.
   - Keep existing bar behaviour untouched for all other cards.

3. **Update** `src/pages/Dashboard.tsx`
   - Pass `progressStyle="ring"` to the Revenue MTD `KPICard` only.
   - Keep the same `progress` value already being computed.

4. **Skeleton** `src/components/ui/skeleton-variants.tsx`
   - Add a small ring-shaped skeleton placeholder to `KPICardSkeleton` so the loading state matches the new layout and avoids layout shift.

## Out of scope
- No new data fetching or business-logic changes.
- No changes to other KPI cards unless required for alignment.
- No backend or auth changes.

## Verification
- Production build passes (`bun run build`).
- TypeScript check passes (`tsgo` or `bunx tsc --noEmit`).
- Preview shows the Revenue MTD card with a circular ring that reflects progress to target.
