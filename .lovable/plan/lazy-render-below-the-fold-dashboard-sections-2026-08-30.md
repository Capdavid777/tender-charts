# Lazy-render below-the-fold Dashboard sections

## What changes
The Dashboard renders everything up front — including the Daily Breakdown table and lower chart sections that are off-screen on load. This update defers rendering of below-the-fold sections until they scroll near the viewport, so the initial paint and month-switch updates are faster and feel snappier.

- Sections above the fold (KPI cards, revenue chart) render immediately as today.
- Sections below the fold (daily breakdown table, projection/other-income panels) mount only when they approach the viewport, with a correctly-sized skeleton in their place so there is no layout jump when they swap in.
- Once revealed, a section stays mounted (no re-hiding when scrolling back up).
- Respects `prefers-reduced-motion`: reveal happens with no animation for those users.
- Applies to the Overview dashboard only; other pages unchanged.

## Technical details
- New `src/hooks/useInViewOnce.ts`: small `IntersectionObserver` hook (rootMargin ~200px) that flips to `true` the first time the target nears the viewport and then disconnects.
- New `src/components/dashboard/LazySection.tsx`: wrapper that renders the existing skeleton-variants (`TableSkeleton` / `ChartSkeleton`) until `useInViewOnce` triggers, then swaps in children with a subtle `animate-fade-in-up`.
- Also add CSS `content-visibility: auto` (with `contain-intrinsic-size` fallback heights) to lower sections in `src/pages/Dashboard.tsx` so the browser skips off-screen layout/paint work even after mount.
- No data-fetching changes: queries still run immediately, only rendering is deferred.

## Out of scope
- No changes to data, queries, other pages, or the above-the-fold sections.
