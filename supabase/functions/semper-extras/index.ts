// Estimates ancillary ("extras") income for a month from Semper bill lines.
// Partial by design: Semper only exposes bills for a subset of reservations,
// so the response always reports how much of the month it could actually read.
import { corsHeaders } from "npm:@supabase/supabase-js@2/cors";
import { createClient } from "npm:@supabase/supabase-js@2";

const SEMPER_BASE = "https://iis-prod.semper-services.com/IntegrationsAPI";
const LIVE_STATUSES = new Set(["in house", "active out", "checked out", "checked in", "confirmed"]);
const MAX_BILLS = 250;
// Semper bill lines are VAT-inclusive; the dashboard reports ex-VAT figures.
const VAT_RATE = 0.15;

// Lines that are room revenue, not extras.
const ACCOMMODATION_RE = /\bfor\s+\d+\s+night/i;

function semperHeaders() {
  return {
    Accept: "application/json",
    "Content-Type": "application/json",
    "x-api-key": Deno.env.get("SEMPER_X_API_KEY") ?? "",
    "x-token": Deno.env.get("SEMPER_X_TOKEN") ?? "",
    "x-channel": Deno.env.get("SEMPER_X_CHANNEL") ?? "",
  };
}

async function semperGet(path: string): Promise<unknown> {
  const res = await fetch(`${SEMPER_BASE}${path}`, { method: "GET", headers: semperHeaders() });
  const text = await res.text();
  if (!res.ok) throw new Error(`Semper ${res.status}: ${text.slice(0, 160)}`);
  try {
    return JSON.parse(text);
  } catch {
    return null;
  }
}

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response("ok", { headers: corsHeaders });

  const json = (body: unknown, status = 200) =>
    new Response(JSON.stringify(body), {
      status,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });

  try {
    // Any signed-in dashboard user may read this.
    const authHeader = req.headers.get("Authorization") ?? "";
    const token = authHeader.replace(/^Bearer\s+/i, "").trim();
    if (!token) return json({ error: "Unauthorized" }, 401);

    const authClient = createClient(
      Deno.env.get("SUPABASE_URL")!,
      Deno.env.get("SUPABASE_ANON_KEY")!,
      { global: { headers: { Authorization: authHeader } } },
    );
    const { data: claimsData } = await authClient.auth.getClaims(token);
    if (!claimsData?.claims?.sub) return json({ error: "Unauthorized" }, 401);

    const venueId = Deno.env.get("SEMPER_VENUE_ID") ?? "";
    if (!venueId || !Deno.env.get("SEMPER_X_API_KEY")) {
      return json({ error: "Semper credentials are not configured" }, 500);
    }

    let body: Record<string, unknown> = {};
    try {
      body = await req.json();
    } catch { /* empty body is fine */ }

    const monthKey = typeof body.month === "string" && /^\d{4}-\d{2}$/.test(body.month)
      ? body.month
      : new Date().toISOString().slice(0, 7);
    const [y, m] = monthKey.split("-").map(Number);
    const from = `${monthKey}-01`;
    const to = `${monthKey}-${String(new Date(Date.UTC(y, m, 0)).getUTCDate()).padStart(2, "0")}`;

    const resBody = await semperGet(
      `/OpenAPI/Reservations/PMSReservationsInPeriod?pVenueID=${venueId}&pStartDate=${from}&pEndDate=${to}`,
    );
    const reservations = Array.isArray(resBody) ? resBody as Record<string, unknown>[] : [];
    const live = reservations.filter((r) =>
      LIVE_STATUSES.has(String(r.Status ?? "").toLowerCase())
    );

    const totals = new Map<string, { revenue: number; count: number }>();
    let billsRead = 0;
    let billsAttempted = 0;

    for (const r of live.slice(0, MAX_BILLS)) {
      billsAttempted++;
      const guests = Array.isArray(r.Guests) ? r.Guests as Record<string, unknown>[] : [];
      const guestId = guests[0]?.ID ?? 0;
      try {
        const bill = await semperGet(
          `/OpenAPI/Reservations/PMSBill?pVenueID=${venueId}&pReservationID=${r.ReservationID}&pGuestID=${guestId}`,
        );
        const lines = Array.isArray(bill)
          ? bill as Record<string, unknown>[]
          : Array.isArray((bill as Record<string, unknown> | null)?.Items)
          ? (bill as Record<string, unknown>).Items as Record<string, unknown>[]
          : [];
        if (lines.length === 0) continue;
        billsRead++;
        for (const l of lines) {
          const amount = Number(l.Amount ?? l.Total ?? 0) / (1 + VAT_RATE);
          if (!(amount > 0)) continue; // negatives are payments
          const desc = String(l.Comments ?? l.Description ?? "").trim();
          if (!desc || ACCOMMODATION_RE.test(desc)) continue;
          const label = desc.replace(/\s*\d[\d.,/-]*\s*/g, " ").replace(/\s+/g, " ").trim() || "Other";
          const entry = totals.get(label) ?? { revenue: 0, count: 0 };
          entry.revenue += amount;
          entry.count++;
          totals.set(label, entry);
        }
      } catch { /* unreadable bill — counted as uncovered */ }
    }

    const items = [...totals.entries()]
      .map(([product_type, v]) => ({ product_type, revenue: Number(v.revenue.toFixed(2)), count: v.count }))
      .sort((a, b) => b.revenue - a.revenue);

    return json({
      month: monthKey,
      from,
      to,
      liveReservations: live.length,
      billsAttempted,
      billsRead,
      coverage: billsAttempted > 0 ? billsRead / billsAttempted : 0,
      total: Number(items.reduce((s, i) => s + i.revenue, 0).toFixed(2)),
      items,
    });
  } catch (e) {
    return json({ error: e instanceof Error ? e.message : String(e) }, 500);
  }
});
