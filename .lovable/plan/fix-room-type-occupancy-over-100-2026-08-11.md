# Fix room-type occupancy over 100%

## What's happening

The 2 Bed Apartment shows 103.33% because room-type occupancy is calculated with a hardcoded 30-day month.

Confirmed in the data: the August room-type row stores 31 rooms sold for a room type with 1 room, and occupancy is stored as 1.0333 = 31 / (1 x 30). August has 31 days, so the true figure is 31 / (1 x 31) = 100%.

The hardcoded divisor is in the upload processing (`src/pages/Upload.tsx:428`):
`occupancy: roomsSold / (totalRooms * 30)`

Every month that isn't 30 days is wrong: 31-day months are overstated by ~3.3%, February understated by ~7%.

## The fix

1. Replace the fixed `30` with the actual number of days in the month being uploaded (computed from the upload's year/month).
2. Recompute and correct the already-stored room-type occupancy values for existing months so historical figures line up.
3. Optional safety: clamp displayed room-type occupancy at 100% on the Room Types page so a bad value can never read as impossible again.

## Technical notes

- Days in month: `new Date(year, monthIdx + 1, 0).getDate()`.
- Only the per-room-type rows (`daily_revenue.room_type_id IS NOT NULL`, dated to the first of the month) are affected; the aggregate rows with `room_type_id IS NULL` keep their own daily occupancy and are untouched.
- Historical correction runs as a one-off data update: `occupancy = rooms_sold / (total_rooms * days_in_that_month)`.
- Room Types page reads these values directly, so no calculation change is needed there beyond the optional clamp.
