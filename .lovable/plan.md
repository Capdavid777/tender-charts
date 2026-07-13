# Performance: Lazy-load routes to speed up initial load

## Problem
`src/App.tsx` currently imports every page (Dashboard, RoomTypes, Historical, Analysis, WebsiteAnalytics, Upload, Changelog, Login, NotFound) statically. That means the first paint on `/` has to download and parse code for heavy pages the user may never visit — Recharts (Dashboard/Historical/WebsiteAnalytics), TipTap editor (Analysis), and xlsx (Upload) all end up in the main bundle.

For a dashboard that most users open to the Overview page, this is the single biggest win available without touching any visual design or business logic.

## Change
Convert each page import in `src/App.tsx` to `React.lazy(() => import(...))` and wrap the `<Routes>` block in a single `<Suspense>` with a lightweight fallback (a centered spinner or a skeleton that matches `DashboardLayout`).

Keep `Login` and `Index` eager (they're on the critical auth path and tiny) — lazy-load the rest.

## Expected impact
- Initial JS for `/` drops by roughly the weight of Recharts + TipTap + xlsx chunks (typically 300–600 KB gzipped combined).
- Each page becomes its own chunk fetched on navigation, cached thereafter.
- No visual change, no behavior change, no backend change.

## Technical details
- File touched: `src/App.tsx` only.
- Add `import { lazy, Suspense } from 'react'`.
- Replace top-level page imports with `const Dashboard = lazy(() => import('./pages/Dashboard'))` etc.
- Wrap the existing `<Routes>` in `<Suspense fallback={<PageFallback />}>` where `PageFallback` is a small inline component rendering a centered `Loader2` spinner on `min-h-screen bg-background`.
- Vite handles the chunk splitting automatically; no config changes needed.

## Out of scope
- No design changes.
- No changes to any page's internals, data fetching, or business logic.
- No dependency additions or removals.
