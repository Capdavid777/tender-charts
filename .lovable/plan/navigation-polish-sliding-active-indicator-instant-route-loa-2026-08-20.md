# Navigation polish: sliding active indicator + instant route loading

## What changes
The top navigation currently marks the active page with a plain filled button and loads each page's code only after you click, so the first visit to Room Types, Historical, Analysis or Website shows a skeleton for a moment.

- A single accent underline slides smoothly between tabs as you move from page to page, replacing the static filled state.
- Hovering (or focusing) a nav item quietly preloads that page's code in the background, so the click feels instant on the first visit too.
- The same hover warms the page's data query where one already exists, so charts appear filled rather than empty.
- The mobile nav strip gets the same underline treatment and auto-scrolls the active tab into view.
- Users who prefer reduced motion get an instant indicator jump, no slide.

No data, numbers, or page content change.

## Technical details
- Edit `src/components/layout/DashboardLayout.tsx`: render nav items inside a relatively-positioned container, measure the active item with a ref map + `ResizeObserver`, and animate a single absolutely-positioned indicator via `transform: translateX()` / `width` (GPU-friendly, no layout thrash). Skip the transition when `usePrefersReducedMotion()` is true.
- Preloading: attach `onMouseEnter` / `onFocus` handlers that call the same `import()` factories used by `React.lazy` in `src/App.tsx`. Extract those factories into a small `src/lib/routePreload.ts` map (`{ '/room-types': () => import('@/pages/RoomTypes'), ... }`) so `App.tsx` and the layout share one source and each chunk is fetched at most once.
- Data warming: on the same hover, call `queryClient.prefetchQuery` for routes whose query keys are already defined (`['dashboard','core']`, room types summary, months), reusing the existing fetch functions — no new queries or schema access.
- Mobile: `scrollIntoView({ inline: 'center', block: 'nearest' })` on the active item when the route changes.
- Buttons keep their current variants for accessibility; only the visual active emphasis moves to the indicator.

## Out of scope
No changes to page content, queries' shapes, auth, or backend.
