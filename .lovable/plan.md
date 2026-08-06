# Instant navigation: prefetch pages on hover

## What changes
Each page in the dashboard (Room Types, Historical, Upload, Analysis, Website Analytics, Changelog) is loaded on demand the first time you open it, so the first click on a tab shows a loading skeleton for a moment.

This update starts loading a page in the background the instant your pointer hovers over its nav tab (or focuses it via keyboard). By the time the click lands, the page is usually already in memory and appears immediately, with no skeleton flash.

Only the first hover per page does any work — after that the page is cached for the session. Nothing downloads until you actually show intent by hovering, so it does not slow down the initial load.

Today only Room Types and Dashboard get prefetched, and only from the login screen; this extends the benefit to every page and to navigation between pages.

## Technical details
- Add `src/lib/routePrefetch.ts`: a map of route path to its dynamic `import()` thunk (matching the `lazy()` imports in `src/App.tsx`), plus a `prefetchRoute(path)` helper that runs each thunk at most once and swallows errors.
- In `src/components/layout/DashboardLayout.tsx`, attach `onMouseEnter`, `onFocus`, and `onTouchStart` handlers to the desktop and mobile nav `Link`s, calling `prefetchRoute(item.href)`.
- Reuse the same helper in `src/pages/Login.tsx` so the existing idle-time prefetch and the hover prefetch share one dedupe cache.

## Out of scope
No layout, styling, data, or query changes.
