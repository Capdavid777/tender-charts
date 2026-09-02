# Automatic nightly data sync from Semper — confirmed feasible

## What the connection test found

The earlier probe failed because it was pointed at the debug/help host. Against the live Semper host, with the same credentials the website project uses, the API answers correctly and gives everything the dashboard needs:

- Reservations for any date range: check-in/out dates, status (In House, Active Out, Checked Out, Cancelled, Blocked), room name and room type.
- Per-reservation bill: one line per night with the exact amount, the room type in the description, and the date it applies to. Payments appear as negative lines and are ignored.
- Room types list for the property.

Verified on real August 2026 data (335 reservations in the month; nightly charges such as "Deluxe Studio for 1 night @ 2030.00").

There is no ready-made occupancy/revenue report endpoint, so the sync builds the daily figures itself from reservations plus their nightly charges — which is exactly what the Excel sheet does by hand today.

## What gets built

1. **Nightly sync job** (`sync-semper-daily`)
   - Runs overnight, covering a rolling window: the last 7 days of actuals plus the next 60 days of forward bookings.
   - Pulls reservations overlapping the window, then each reservation's nightly charges.
   - Skips Cancelled and Blocked/out-of-service rows so maintenance blocks never count as sold.
   - For each date it computes: rooms sold, revenue, ADR, and occupancy against the real room count for that month's length — per room type and in total.
   - Writes with the same delete-then-insert-per-date pattern the manual upload uses, so re-runs never duplicate.
   - Bounded work per run, a single-flight lock so two runs can never overlap, and a pause-on-repeated-failure state.

2. **Manual upload always wins**
   - Any date already covered by a manual Excel upload is left untouched by the sync, so your uploaded numbers are never overwritten.

3. **Data Sync card on the Upload page**
   - Last run time, status, date window covered, rows written, and any error.
   - "Sync now" button for admins.

4. **Reconciliation check before going live**
   - Run the sync into a staging comparison for a month you already uploaded (August 2026) and compare revenue, rooms sold and ADR per day against the Excel figures. Only after they line up does the nightly job start writing.

## Technical notes

- Base URL is the live Semper Integrations API; the `SEMPER_API_URL` secret currently holds the debug help URL and will be corrected.
- Endpoints: `OpenAPI/Reservations/PMSReservationsInPeriod`, `OpenAPI/Reservations/PMSBill` (needs the reservation's guest ID; group reservations are walked guest by guest), `OpenAPI/Rooms/CRSTypes`.
- Revenue lines are those with a positive amount and a real product ID; negative lines are payments and are excluded.
- Room type names from Semper are mapped to the dashboard's canonical four types using the existing normalisation mapping.
- New `sync_runs` table (source, status, window, rows written, error, lease expiry) drives the lock and the status card; scheduled with pg_cron.
- After a successful run the dashboard caches are invalidated so numbers refresh without a manual reload.
- The temporary `semper-probe` function is removed once the sync is in place.
