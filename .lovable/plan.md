## Performance: Preload the Dashboard chunk after login paint

### Problem
Route-level code splitting is in place, so the Dashboard chunk (Recharts + KPI components) is no longer in the initial bundle. Great for `/`, but it means every login now pays a visible skeleton-then-content flash on `/dashboard` while that chunk downloads on a cold cache.

Since ~100% of authenticated users land on `/dashboard` immediately after login, we can hide that latency entirely by prefetching the chunk in the background while the login page is idle.

### Change
In `src/pages/Login.tsx`, kick off `import('./Dashboard')` inside a `useEffect` after mount (wrapped in `requestIdleCallback` with a `setTimeout` fallback). The dynamic import is fire-and-forget — Vite will fetch and cache the chunk, and when the user submits credentials and navigates to `/dashboard`, `React.lazy` resolves instantly from cache.

Same pattern for `RoomTypes` as a secondary prefetch (most common second click), triggered after Dashboard's prefetch resolves.

### Expected impact
- Post-login navigation to `/dashboard` feels instant on cold loads — no skeleton flash for users on decent connections.
- Zero cost to the initial `/` paint (prefetch runs during idle time, after Login is interactive).
- No change to bundle size, no new dependencies, no visual changes.

### Technical details
- File touched: `src/pages/Login.tsx` only.
- Add a `useEffect(() => { ... }, [])` that schedules `import('./Dashboard').then(() => import('./RoomTypes'))` via `requestIdleCallback` (fallback: `setTimeout(..., 200)`).
- Swallow errors silently — a failed prefetch just means the normal lazy path runs on navigation.

### Out of scope
- No changes to Dashboard, RoomTypes, or any other page internals.
- No changes to routing, auth, or data fetching.
- No design/visual changes.
