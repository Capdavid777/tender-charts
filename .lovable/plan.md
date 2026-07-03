## Website Analytics section

A new page under `/website-analytics` that presents the monthly Reserved Suites web + booking report the way the dashboard presents hotel data — real KPIs, charts, and drill-downs — not a PDF viewer. Each month you send me a new PDF, I add one row to the database and the page picks it up automatically.

### Data storage

New table `website_analytics_reports`:
- `month` (date, first of month, unique) — e.g. `2026-06-01`
- `generated_on` (date) — "Generated 02 Jul 2026"
- `summary` (jsonb) — headline KPIs (visitors, pageviews, avg session, bounce, bookings, gross/net revenue, avg booking value, discounts, conversion, avg length of stay)
- `daily_traffic` (jsonb) — array of `{day, visitors, pageviews, bounce, session_min}`
- `top_pages` (jsonb) — `[{path, pageviews}]`
- `traffic_sources` (jsonb) — `[{source, visitors}]`
- `device_mix` (jsonb) — `{desktop, mobile, tablet}`
- `visitor_countries` (jsonb) — `[{code, visitors}]`
- `revenue_by_room_type` (jsonb) — `[{room, bookings, revenue, share}]`
- `revenue_by_payment` (jsonb) — `[{method, bookings, revenue}]`
- `bookings_by_country` (jsonb) — `[{code, bookings}]`
- `daily_revenue` (jsonb) — `[{date, revenue}]`
- `promotions_note` (text)
- `insights` (jsonb) — array of strings
- `executive_summary` (text)

RLS: `authenticated` can `SELECT`; `service_role` full. GRANTs match. June 2026 seeded from the uploaded PDF as the first row.

### Page layout (top → bottom)

1. **Header** — "Website Analytics", month picker (populated from existing report months, defaults to newest), report generated date, animated fade-in.
2. **Headline KPI grid (8 cards)** — Visitors, Pageviews, Avg session, Bounce rate, Confirmed bookings, Gross revenue, Avg booking value, Visitor conversion. Uses existing `KPICard` for visual consistency; each card `fade-in-up` staggered.
3. **Executive summary** — Card with paragraph copy from the PDF.
4. **Daily traffic chart** — Interactive dual-line/area (Visitors + Pageviews) across the 30 days. Recharts `ComposedChart` with animation, hover tooltip showing both series, brush for zooming to a date range.
5. **Bounce & session chart** — Second Recharts chart: bounce % as bars, session minutes as line on secondary axis.
6. **Booking revenue block** — 6 mini stats (bookings, gross, net, avg value, avg LOS, discounts) + a daily revenue bar chart with animation.
7. **Two donut/bar row**:
   - **Device mix** — animated Recharts pie (desktop/mobile/tablet) with clickable legend to toggle slices.
   - **Revenue by room type** — animated horizontal bar, clickable rows highlight matching row in a table below.
8. **Top pages & Top traffic sources** — Two ranked lists side-by-side with proportional bars behind each row and hover elevation. Rows clickable to copy the URL/source.
9. **Geography row** — Visitor countries table + Bookings by country table, each with animated bar visualisation of share.
10. **Payment methods** — Small card showing the two payment methods, revenue and count.
11. **Promotions callout** — Highlighted card with the promotions note.
12. **Insights list** — Numbered animated list (`fade-in-up` staggered) of the six team insights, each in its own card with an icon and hover elevation.

All charts respect the existing `usePrefersReducedMotion` hook and reuse the app's semantic tokens (navy/gold), no hardcoded colours.

### Navigation

- Add "Analytics" link to `DashboardLayout` sidebar/topbar between existing pages, visible to all authenticated users (viewer + admin).
- Add `<Route path="/website-analytics">` in `App.tsx` guarded by `ProtectedRoute`.

### Monthly update workflow

When you send next month's PDF I run one SQL insert into `website_analytics_reports` — no code changes, no redeploy. The page's month picker automatically shows the new option and defaults to the newest month.

### Files touched

- `supabase/migrations/…_website_analytics.sql` — table, RLS, GRANTs, June 2026 seed row.
- `src/pages/WebsiteAnalytics.tsx` — new page.
- `src/components/analytics/*` — `TrafficChart.tsx`, `BounceSessionChart.tsx`, `DeviceMixChart.tsx`, `RevenueByRoomChart.tsx`, `RankedList.tsx`, `InsightCard.tsx`.
- `src/App.tsx` — new route.
- `src/components/layout/DashboardLayout.tsx` — new nav link.
- `src/integrations/supabase/types.ts` — regenerated automatically.

### Out of scope

- No PDF parsing/upload UI (you asked for the layout, not an ingestion pipeline). Data is seeded per month by me via a migration.
- No changes to existing hotel dashboard, targets, or auth.
