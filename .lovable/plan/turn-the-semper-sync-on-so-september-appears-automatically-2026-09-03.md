# Turn the Semper sync on so September appears automatically

## What's actually wrong

September 2026 is missing everywhere because nothing has written September data:

- `daily_revenue` has no rows after 31 August 2026, and the month dropdown is built from the months that exist in that table — so September never appears as an option.
- `monthly_targets` stops at August 2026, so even with data there would be no target line, variance or breakeven.
- The Website Analytics section still ends at July 2026 (August's report hasn't been loaded).

And to your question: the nightly sync was **built but never switched on**. The `sync_runs` table is completely empty — the sync function has never executed once, so no automatic import has ever happened. It also still points at the wrong stored base URL (`SEMPER_API_URL` holds the debug help address rather than the live API host the function actually uses).

## What gets done

1. **Switch the nightly sync on**
   - Correct the stored Semper API URL so it matches the live host the function calls.
   - Run the sync once manually, first in dry-run, against the last 7 days plus forward bookings, and check the numbers look sane before anything is written.
   - Then run it for real so September 2026 populates immediately.
   - Schedule it to run once every night (03:00 SAST). One run per day — the dashboard is a daily reporting tool, so nothing more frequent is needed and a nightly cadence keeps costs minimal. Worst case a booking made during the day shows up the next morning.

2. **Add a Data Sync status card on the Upload page**
   - Last run time, success/failure, the date window covered, rows written and any error message, plus a "Sync now" button for admins. This is how you'll see at a glance that automation is actually running, instead of discovering a gap weeks later.

3. **September 2026 targets**
   - Load revenue, occupancy, ADR and room cost per occupied room for September once you supply them. Without these the September dashboard shows data but no target comparison.

4. **August 2026 website analytics** (only if you want it now)
   - Send the August PDF and it gets parsed into the analytics section the same way June and July were.

## Technical notes

- `sync_runs` is the lock and status table; it stays empty until the function runs, which is the evidence the schedule was never created.
- Scheduling uses pg_cron calling the deployed `sync-semper-daily` function; the single-flight lease already in the function prevents overlapping runs.
- Manual Excel uploads keep winning: the sync skips any date (aggregate or room-type row) whose source isn't `semper`.
- Occupancy uses real days-in-month; all Semper amounts are stored excluding VAT.
- After a successful run the dashboard query caches are invalidated so the month list picks September up without a hard refresh.

## Open question

September targets — send the four figures (revenue, occupancy %, ADR, room cost per occupied room) and they go in with this work.
