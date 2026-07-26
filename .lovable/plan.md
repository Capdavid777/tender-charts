## Smooth route transitions with the View Transitions API

### What
Add cross-fade + subtle slide animations when navigating between dashboard pages (Overview → Room Types → Historical, etc.), using the browser's native View Transitions API. Falls back silently to instant navigation on browsers that don't support it (Safari < 18).

### Why this one
- Not already implemented — current route changes are an abrupt swap between skeleton and content.
- Pure presentation layer, no business logic touched.
- Native API — no bundle cost, GPU-accelerated, respects `prefers-reduced-motion` automatically via the CSS we already have.
- Pairs well with the existing lazy-loading + skeleton work: the transition masks the tiny gap between skeleton unmount and real content mount.

### Files touched
- `src/App.tsx` — wrap the `navigate` calls (or add a small `useViewTransitionRouter` hook) so route changes run inside `document.startViewTransition(...)`. Since we use `react-router-dom`, the cleanest hook point is a custom `<Router>`-level effect that intercepts `location` changes and defers the React render into a view transition.
- `src/index.css` — add ~15 lines defining `::view-transition-old(root)` and `::view-transition-new(root)` keyframes (200ms cross-fade + 4px upward slide on the incoming view). Wrap in `@media (prefers-reduced-motion: no-preference)` so reduced-motion users get an instant swap.

### Out of scope
- No changes to individual pages, data fetching, or components.
- No new dependencies.
- No named view-transitions (shared element morphs) — just the root cross-fade for this pass.

### Verification
- Click through Overview → Room Types → Historical → Analysis in the preview; confirm a smooth 200ms cross-fade.
- Toggle "Reduce motion" in OS settings; confirm transitions disappear.
- Confirm Safari (which lacks the API) still navigates normally with no console errors.
