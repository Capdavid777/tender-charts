# Automatic nightly data sync from Semper

Goal: the dashboard fills itself overnight, and the Excel upload becomes a backup rather than a routine chore.

## What I confirmed

Your Reserved Suites website project already talks to Semper through two surfaces:

- The booking API (`apibook-prod`) for availability and rates — public, no credentials.
- The Semper Integrations OpenAPI (`iis-prod .../IntegrationsAPI`) using stored `SEMPER_API_URL`, `SEMPER_VENUE_ID`, `SEMPER_X_CHANNEL`, `SEMPER_X_API_KEY`, `SEMPER_X_TOKEN`. Endpoints used there: `Reservations/CRSNew`, `Reservations/GetBalance`, `Reservations/CheckIn`, `Reservations/CheckOut`, `rooms/AllRooms`, `Rooms/RoomTypes`, `Rates/...`.

So the credentials and the venue/channel IDs exist and work. What is **not** yet confirmed is whether your Semper licence exposes a reporting/reservations-list endpoint that returns rooms sold, revenue and rate per day — the website only ever creates and reads individual reservations. That is the one unknown, and step 1 below resolves it before anything else is built.

## Step 1 — Confirm the data source (short discovery)

Add a temporary admin-only "Semper connection test" action that calls the Integrations API with your existing credentials and probes for a per-day/per-reservation feed (a reservations-by-date-range or occupancy/revenue report endpoint). Outcomes:

- **A. A usable feed exists** → build the full automatic sync (step 2A).
- **B. No reporting endpoint on your licence** → ask Semper support to enable one; meanwhile build the zero-effort fallback (step 2B). I can draft the exact request to Semper.

## Step 2A — Nightly automatic sync (preferred)

- A `sync-semper-daily` backend function that pulls the previous day's (and the current month-to-date) reservation/revenue data, maps it to the same shape the Excel importer produces, and writes rooms sold, revenue, ADR and occupancy per day, plus per-room-type monthly rows.
- Runs on a schedule every night, with: a bounded window per run, a single-flight lock so two runs never overlap, idempotent upserts so a re-run corrects rather than duplicates, and a pause state if Semper repeatedly errors.
- Occupancy uses the real days-in-month and live room inventory, matching the fix already in the manual importer.
- Targets (revenue, occupancy, ADR, room cost) stay manual — those come from you, not Semper.

## Step 2B — Zero-touch fallback (if the API can't report)

- Connect a OneDrive/Google Drive folder. You save the Semper export into it; a nightly job picks up the newest file, runs it through the exact same parser and validation the Upload page uses today, and imports it. No clicking, no login.
- Same locking, idempotency and error handling as 2A.

## Step 3 — Visibility and safety (both paths)

- A **Data Sync** card on the Upload page: last successful sync, rows written, source (Semper / folder / manual), and any error with a "Run now" button for admins.
- The manual Excel upload stays exactly as-is as an override; a manual upload for a date always wins over the automatic one.
- Dashboard caches are invalidated after each sync so numbers are current the moment you open it.

## Technical notes

- Secrets `SEMPER_API_URL`, `SEMPER_VENUE_ID`, `SEMPER_X_CHANNEL`, `SEMPER_X_API_KEY`, `SEMPER_X_TOKEN` must be added to this project (they live in the website project, not here). I'll request them when we get there.
- New table `sync_runs` (source, status, window, rows written, error, lease expiry) drives both the lock and the status card; admin-read, service-role-write.
- Scheduling via pg_cron hitting the sync function; the function checks the pause/lock rows before doing any work.
- Writes reuse the existing delete-then-insert pattern per date/room-type so re-runs are safe.
