// Nightly sync of daily occupancy/revenue figures from the Semper PMS.
// Builds per-date and per-room-type aggregates from reservations + their nightly charges.
import { corsHeaders } from "npm:@supabase/supabase-js@2/cors";
import { createClient } from "npm:@supabase/supabase-js@2";

const SEMPER_BASE = "https://iis-prod.semper-services.com/IntegrationsAPI";

// Semper room-type names -> canonical dashboard room types.
const ROOM_TYPE_MAP: Record<string, string> = {
  "deluxe studio": "Deluxe Studio",
  "queen room": "Queen Room",
  "one bedroom apartment": "1 Bed Apartment",
  "one bedroom apartment with view": "1 Bed Apartment",
  "queen room with balcony": "Queen Room",
  "executive two bedroom apartment": "2 Bed Apartment",
  "two bedroom apartment": "2 Bed Apartment",
  "two bedroom apartment with view": "2 Bed Apartment",
};

// Reservation statuses that represent a real, occupied room-night.
const LIVE_STATUSES = new Set(["in house", "active out", "checked out", "checked in", "confirmed"]);

const MAX_RESERVATIONS_PER_RUN = 800;
// South African VAT; Semper amounts are VAT-inclusive, all stored figures are ex-VAT.
const VAT_RATE = 0.15;
const LEASE_MINUTES = 20;

interface SemperGuest { ID?: number }
interface SemperReservation {
  ReservationID: number;
  Status: string;
  CheckInDate: string;
  CheckOutDate: string;
  RoomName?: string;
  Guests?: SemperGuest[];
  RoomType?: { Name?: string };
}

const fmt = (d: Date) => d.toISOString().slice(0, 10);
const addDays = (iso: string, n: number) => {
  const d = new Date(`${iso}T00:00:00Z`);
  d.setUTCDate(d.getUTCDate() + n);
  return fmt(d);
};
const daysInMonthOf = (iso: string) => {
  const [y, m] = iso.split("-").map(Number);
  return new Date(Date.UTC(y, m, 0)).getUTCDate();
};

function admin() {
  return createClient(
    Deno.env.get("SUPABASE_URL")!,
    Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!,
  );
}

async function isAuthorised(req: Request): Promise<boolean> {
  // Scheduled cron job: shared secret header.
  const cronSecret = Deno.env.get("SEMPER_SYNC_SECRET") ?? "";
  const provided = req.headers.get("x-sync-secret") ?? "";
  if (cronSecret && provided && provided === cronSecret) return true;

  const authHeader = req.headers.get("Authorization") ?? "";
  const token = authHeader.replace(/^Bearer\s+/i, "").trim();
  if (!token) return false;

  // Service-role key: exact secret match.
  const serviceKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY") ?? "";
  if (serviceKey && token === serviceKey) return true;


  // Otherwise require a cryptographically verified user JWT with the admin role.
  try {
    const authClient = createClient(
      Deno.env.get("SUPABASE_URL")!,
      Deno.env.get("SUPABASE_ANON_KEY")!,
      { global: { headers: { Authorization: `Bearer ${token}` } } },
    );
    const { data, error } = await authClient.auth.getClaims(token);
    if (error || !data?.claims?.sub) return false;
    const claims = data.claims as Record<string, unknown>;
    const appMetadata = (claims.app_metadata ?? {}) as Record<string, unknown>;
    return appMetadata.app_role === "admin";
  } catch {
    return false;
  }
}


function semperHeaders() {
  return {
    Accept: "application/json",
    "Content-Type": "application/json",
    "x-api-key": Deno.env.get("SEMPER_X_API_KEY") ?? "",
    "x-token": Deno.env.get("SEMPER_X_TOKEN") ?? "",
    "x-channel": Deno.env.get("SEMPER_X_CHANNEL") ?? "",
  };
}

async function semperGet<T>(path: string): Promise<T> {
  const res = await fetch(`${SEMPER_BASE}${path}`, { method: "GET", headers: semperHeaders() });
  const text = await res.text();
  if (!res.ok) throw new Error(`Semper ${res.status} on ${path.split("?")[0]}: ${text.slice(0, 200)}`);
  return JSON.parse(text) as T;
}

interface DayBucket {
  rooms: Set<string>;
  revenue: number;
  perType: Map<string, { rooms: Set<string>; revenue: number }>;
}

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response("ok", { headers: corsHeaders });

  const json = (body: unknown, status = 200) =>
    new Response(JSON.stringify(body, null, 2), {
      status,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });

  if (!(await isAuthorised(req))) return json({ error: "Unauthorized" }, 401);

  const venueId = Deno.env.get("SEMPER_VENUE_ID") ?? "";
  if (!venueId || !Deno.env.get("SEMPER_X_API_KEY")) {
    return json({ error: "Semper credentials are not configured" }, 500);
  }

  let body: Record<string, unknown> = {};
  try {
    body = await req.json();
  } catch { /* empty body is fine */ }

  const dryRun = body.dryRun === true;
  const today = fmt(new Date());
  const from = typeof body.from === "string" ? body.from : addDays(today, -7);
  const to = typeof body.to === "string" ? body.to : addDays(today, 60);

  const db = admin();

  // ---- circuit breaker: stay paused until an operator or a later run clears it
  const { data: lastRuns } = await db
    .from("sync_runs")
    .select("id, status, lease_expires_at, started_at")
    .eq("source", "semper")
    .order("started_at", { ascending: false })
    .limit(3);

  if (!dryRun) {
    const paused = (lastRuns ?? []).find((r) => r.status === "paused");
    if (paused && body.force !== true) {
      return json({ skipped: true, reason: "sync is paused after repeated failures" }, 200);
    }
    // ---- single-flight lock
    const running = (lastRuns ?? []).find(
      (r) => r.status === "running" && r.lease_expires_at && new Date(r.lease_expires_at) > new Date(),
    );
    if (running) return json({ skipped: true, reason: "another sync is already running" }, 200);
  }

  let runId: string | null = null;
  if (!dryRun) {
    const { data: run, error } = await db
      .from("sync_runs")
      .insert({
        source: "semper",
        status: "running",
        window_start: from,
        window_end: to,
        lease_expires_at: new Date(Date.now() + LEASE_MINUTES * 60_000).toISOString(),
      })
      .select("id")
      .single();
    if (error) return json({ error: error.message }, 500);
    runId = run.id;
  }

  try {
    // ---- pull reservations overlapping the window
    const reservations = await semperGet<SemperReservation[]>(
      `/OpenAPI/Reservations/PMSReservationsInPeriod?pVenueID=${venueId}&pStartDate=${from}&pEndDate=${to}`,
    );

    const nameCounts: Record<string, number> = {};
    const statusCounts: Record<string, number> = {};
    for (const r of reservations) {
      const n = r.RoomType?.Name ?? "(none)";
      nameCounts[n] = (nameCounts[n] ?? 0) + 1;
      statusCounts[String(r.Status)] = (statusCounts[String(r.Status)] ?? 0) + 1;
    }

    const live = reservations
      .filter((r) => LIVE_STATUSES.has(String(r.Status).toLowerCase()))
      .filter((r) => {
        const name = (r.RoomType?.Name ?? "").toLowerCase();
        return !!ROOM_TYPE_MAP[name];
      })
      .slice(0, MAX_RESERVATIONS_PER_RUN);

    // ---- per-date buckets
    const buckets = new Map<string, DayBucket>();
    const bucketFor = (date: string) => {
      let b = buckets.get(date);
      if (!b) {
        b = { rooms: new Set(), revenue: 0, perType: new Map() };
        buckets.set(date, b);
      }
      return b;
    };

    let detailErrors = 0;
    for (const r of live) {
      const canonical = ROOM_TYPE_MAP[(r.RoomType?.Name ?? "").toLowerCase()];
      const roomKey = r.RoomName || `res-${r.ReservationID}`;

      // occupied nights = check-in .. day before check-out, clipped to the window
      const start = r.CheckInDate.slice(0, 10);
      const end = r.CheckOutDate.slice(0, 10);
      for (let d = start > from ? start : from; d < end && d <= to; d = addDays(d, 1)) {
        const b = bucketFor(d);
        b.rooms.add(roomKey);
        let t = b.perType.get(canonical);
        if (!t) {
          t = { rooms: new Set(), revenue: 0 };
          b.perType.set(canonical, t);
        }
        t.rooms.add(roomKey);
      }

      // Accommodation revenue: the reservation total spread evenly over its nights.
      // (PMSBill nightly lines exist only for a minority of reservations.)
      // Semper returns VAT-inclusive amounts; the dashboard reports ex-VAT.
      let nights = 0;
      for (let d = start; d < end; d = addDays(d, 1)) nights++;
      let total = 0;
      try {
        const detail = await semperGet<{ AccommodationTotal?: number }>(
          `/OpenAPI/Reservations/PMSReservation?pVenueID=${venueId}&pReservationID=${r.ReservationID}`,
        );
        total = Number(detail.AccommodationTotal ?? 0) / (1 + VAT_RATE);
      } catch {
        detailErrors++;
      }

      if (nights > 0 && total > 0) {
        const perNight = total / nights;
        for (let d = start > from ? start : from; d < end && d <= to; d = addDays(d, 1)) {
          const b = bucketFor(d);
          b.revenue += perNight;
          const t = b.perType.get(canonical)!;
          t.revenue += perNight;
        }
      }
    }

    // ---- inventory
    const { data: roomTypeRows } = await db.from("room_types").select("id, name, total_rooms");
    const typeByName = new Map((roomTypeRows ?? []).map((t) => [t.name, t]));
    const totalRooms = (roomTypeRows ?? []).reduce((s, t) => s + (t.total_rooms ?? 0), 0) || 1;

    // ---- dates already owned by a manual upload are left untouched
    const allDates = [...buckets.keys()].sort();
    const { data: manualRows } = await db
      .from("daily_revenue")
      .select("date")
      .is("room_type_id", null)
      .eq("source", "manual")
      .gte("date", from)
      .lte("date", to);
    const manualDates = new Set((manualRows ?? []).map((r) => r.date as string));

    // A dry run reports every date so its figures can be reconciled against manual uploads.
    const writable = dryRun ? allDates : allDates.filter((d) => !manualDates.has(d));

    const dailyRecords = writable.map((d) => {
      const b = buckets.get(d)!;
      const roomsSold = b.rooms.size;
      return {
        date: d,
        room_type_id: null as string | null,
        rooms_sold: roomsSold,
        revenue: Number(b.revenue.toFixed(2)),
        average_rate: roomsSold > 0 ? Number((b.revenue / roomsSold).toFixed(2)) : 0,
        occupancy: Math.min(roomsSold / totalRooms, 1),
        source: "semper",
      };
    });

    // ---- per-room-type monthly aggregates (stored on the 1st of the month)
    const monthly = new Map<string, Map<string, { rooms: number; revenue: number }>>();
    for (const d of writable) {
      const monthStart = `${d.slice(0, 7)}-01`;
      let m = monthly.get(monthStart);
      if (!m) {
        m = new Map();
        monthly.set(monthStart, m);
      }
      for (const [typeName, t] of buckets.get(d)!.perType) {
        const cur = m.get(typeName) ?? { rooms: 0, revenue: 0 };
        cur.rooms += t.rooms.size;
        cur.revenue += t.revenue;
        m.set(typeName, cur);
      }
    }

    const roomTypeRecords: Record<string, unknown>[] = [];
    for (const [monthStart, m] of monthly) {
      const dim = daysInMonthOf(monthStart);
      for (const [typeName, agg] of m) {
        const rt = typeByName.get(typeName);
        if (!rt) continue;
        roomTypeRecords.push({
          date: monthStart,
          room_type_id: rt.id,
          rooms_sold: agg.rooms,
          revenue: Number(agg.revenue.toFixed(2)),
          average_rate: agg.rooms > 0 ? Number((agg.revenue / agg.rooms).toFixed(2)) : 0,
          occupancy: rt.total_rooms > 0 ? Math.min(agg.rooms / (rt.total_rooms * dim), 1) : 0,
          source: "semper",
        });
      }
    }

    if (dryRun) {
      await db.from("sync_runs").update({}).eq("id", runId ?? "00000000-0000-0000-0000-000000000000");
      return json({
        dryRun: true,
        from,
        to,
        reservationsConsidered: live.length,
        detailErrors,
        skippedManualDates: [...manualDates].length,
        nameCounts,
        statusCounts,
        daily: dailyRecords,
        roomTypes: roomTypeRecords,
      });
    }

    // ---- write: delete-then-insert per date (never touches manual rows)
    if (writable.length > 0) {
      const { error: delErr } = await db
        .from("daily_revenue")
        .delete()
        .is("room_type_id", null)
        .eq("source", "semper")
        .in("date", writable);
      if (delErr) throw delErr;

      const { error: insErr } = await db.from("daily_revenue").insert(dailyRecords);
      if (insErr) throw insErr;
    }

    // Manual uploads own their room-type rows: never overwrite them.
    const monthStarts = [...new Set(roomTypeRecords.map((r) => r.date as string))];
    const manualTypeKeys = new Set<string>();
    if (monthStarts.length > 0) {
      const { data: manualTypeRows } = await db
        .from("daily_revenue")
        .select("date, room_type_id, source")
        .not("room_type_id", "is", null)
        .in("date", monthStarts);
      for (const r of manualTypeRows ?? []) {
        if ((r.source ?? "manual") !== "semper") {
          manualTypeKeys.add(`${r.date}|${r.room_type_id}`);
        }
      }
    }

    let roomTypeWritten = 0;
    for (const rec of roomTypeRecords) {
      if (manualTypeKeys.has(`${rec.date}|${rec.room_type_id}`)) continue;
      const { error: upErr } = await db
        .from("daily_revenue")
        .upsert(rec, { onConflict: "date,room_type_id" });
      if (upErr) throw upErr;
      roomTypeWritten++;
    }

    await db
      .from("sync_runs")
      .update({
        status: "success",
        rows_written: dailyRecords.length + roomTypeWritten,
        dates_skipped: manualDates.size,
        finished_at: new Date().toISOString(),
        lease_expires_at: null,
      })
      .eq("id", runId!);

    return json({
      ok: true,
      from,
      to,
      reservationsConsidered: live.length,
      rowsWritten: dailyRecords.length + roomTypeRecords.length,
      datesSkipped: manualDates.size,
      detailErrors,
    });
  } catch (e) {
    const message = e instanceof Error ? e.message : String(e);
    if (runId) {
      // pause the job when the two previous runs also failed
      const recentFailures = (lastRuns ?? []).filter((r) => r.status === "failed").length;
      await db
        .from("sync_runs")
        .update({
          status: recentFailures >= 2 ? "paused" : "failed",
          error_message: message.slice(0, 500),
          finished_at: new Date().toISOString(),
          lease_expires_at: null,
        })
        .eq("id", runId);
    }
    return json({ error: message }, 500);
  }
});
