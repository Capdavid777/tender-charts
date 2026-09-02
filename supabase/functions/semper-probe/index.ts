// Discovery helper: probes the Semper Integrations API for an endpoint that can
// return per-day rooms-sold / revenue data, so the dashboard can sync itself.
// Admin-only. Read-only: it performs GET requests and never writes to Semper.

import { createClient } from "npm:@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

interface ProbeResult {
  path: string;
  url: string;
  status: number | null;
  ok: boolean;
  contentType: string | null;
  sample: string;
  error?: string;
}

function fmt(d: Date): string {
  return d.toISOString().slice(0, 10);
}

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response("ok", { headers: corsHeaders });

  try {
    // AuthZ: admin JWT or service-role key.
    const authHeader = req.headers.get("Authorization") ?? "";
    const token = authHeader.replace("Bearer ", "").trim();
    const serviceKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY") ?? "";
    let authorized = Boolean(token) && token === serviceKey;




    if (!authorized && token) {
      const authClient = createClient(
        Deno.env.get("SUPABASE_URL")!,
        Deno.env.get("SUPABASE_ANON_KEY")!,
        { global: { headers: { Authorization: `Bearer ${token}` } } },
      );
      const { data: claimsData, error: claimsError } = await authClient.auth.getClaims(token);
      const claims = claimsData?.claims as Record<string, unknown> | undefined;
      const appMetadata = (claims?.app_metadata ?? {}) as Record<string, unknown>;
      if (!claimsError && claims?.sub && appMetadata.app_role === "admin") authorized = true;
    }


    if (!authorized) {
      return new Response(JSON.stringify({ error: "Unauthorized" }), {
        status: 401,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const apiUrl = (Deno.env.get("SEMPER_API_URL") ?? "").replace(/\/+$/, "");
    const venueId = Deno.env.get("SEMPER_VENUE_ID") ?? "";
    const channelId = Deno.env.get("SEMPER_X_CHANNEL") ?? "";
    const xApiKey = Deno.env.get("SEMPER_X_API_KEY") ?? "";
    const xToken = Deno.env.get("SEMPER_X_TOKEN") ?? "";

    if (!apiUrl || !venueId || !xApiKey || !xToken) {
      return new Response(
        JSON.stringify({ error: "Semper credentials are not fully configured" }),
        { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } },
      );
    }

    let body: Record<string, unknown> = {};
    try {
      body = await req.json();
    } catch {
      body = {};
    }

    const today = new Date();
    const from = typeof body.from === "string" ? body.from : fmt(new Date(today.getTime() - 7 * 86400000));
    const to = typeof body.to === "string" ? body.to : fmt(today);

    const base = "https://iis-prod.semper-services.com/IntegrationsAPI";
    const headers = {
      "Accept": "application/json",
      "Content-Type": "application/json",
      "x-api-key": xApiKey,
      "x-token": xToken,
      "x-channel": channelId,
    };

    async function get(path: string): Promise<{ status: number; body: unknown }> {
      const res = await fetch(`${base}${path}`, { method: "GET", headers });
      const text = await res.text();
      try {
        return { status: res.status, body: JSON.parse(text) };
      } catch {
        return { status: res.status, body: text.slice(0, 500) };
      }
    }

    // ---- Extras discovery: what non-accommodation bill lines does Semper expose?
    const out: Record<string, unknown> = { from, to };

    const resResp = await get(
      `/OpenAPI/Reservations/PMSReservationsInPeriod?pVenueID=${venueId}&pStartDate=${from}&pEndDate=${to}`,
    );
    const reservations = Array.isArray(resResp.body) ? resResp.body as Record<string, unknown>[] : [];
    out.reservationCount = reservations.length;

    const live = reservations.filter((r) =>
      ["in house", "active out", "checked out", "checked in", "confirmed"].includes(
        String(r.Status ?? "").toLowerCase(),
      )
    );
    out.liveCount = live.length;

    // Aggregate every bill line we can read, grouped by product description.
    const lineTotals: Record<string, { count: number; total: number; productIds: number[] }> = {};
    let billsRead = 0;
    let billErrors = 0;
    let sampleBill: unknown = null;

    for (const r of live.slice(0, 60)) {
      const guests = Array.isArray(r.Guests) ? r.Guests as Record<string, unknown>[] : [];
      const guestId = guests[0]?.ID ?? 0;
      try {
        const bill = await get(
          `/OpenAPI/Reservations/PMSBill?pVenueID=${venueId}&pReservationID=${r.ReservationID}&pGuestID=${guestId}`,
        );
        const lines = Array.isArray(bill.body)
          ? bill.body as Record<string, unknown>[]
          : Array.isArray((bill.body as Record<string, unknown>)?.Items)
          ? (bill.body as Record<string, unknown>).Items as Record<string, unknown>[]
          : [];
        if (lines.length === 0) continue;
        billsRead++;
        if (!sampleBill) sampleBill = bill.body;
        for (const l of lines) {
          const desc = String(l.Comments ?? l.Description ?? "(none)").trim();
          const amount = Number(l.Amount ?? l.Total ?? 0);
          if (!(amount > 0)) continue;
          const key = desc.replace(/\d+/g, "#").slice(0, 80);
          const entry = lineTotals[key] ?? { count: 0, total: 0, productIds: [] };
          entry.count++;
          entry.total += amount;
          const pid = Number(l.ProductID ?? 0);
          if (pid && !entry.productIds.includes(pid)) entry.productIds.push(pid);
          lineTotals[key] = entry;
        }
      } catch {
        billErrors++;
      }
    }

    out.billsRead = billsRead;
    out.billErrors = billErrors;
    out.lineTotals = lineTotals;
    out.sampleBill = sampleBill;


    return new Response(JSON.stringify(out, null, 2).slice(0, 12000),
      { headers: { ...corsHeaders, "Content-Type": "application/json" } });
  } catch (e) {
    return new Response(
      JSON.stringify({ error: e instanceof Error ? e.message : String(e) }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } },
    );
  }
});
