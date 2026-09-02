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

    // Also accept any service-role JWT (keys rotate; compare the role claim).
    if (!authorized && token.split(".").length === 3) {
      try {
        const payload = JSON.parse(atob(token.split(".")[1].replace(/-/g, "+").replace(/_/g, "/")));
        if (payload?.role === "service_role") authorized = true;
      } catch { /* not a decodable JWT */ }
    }


    if (!authorized && token) {
      const authClient = createClient(
        Deno.env.get("SUPABASE_URL")!,
        Deno.env.get("SUPABASE_ANON_KEY")!,
        { global: { headers: { Authorization: authHeader } } },
      );
      const { data: claimsData } = await authClient.auth.getClaims(token);
      const claims = claimsData?.claims as Record<string, unknown> | undefined;
      const appMetadata = (claims?.app_metadata ?? {}) as Record<string, unknown>;
      if (appMetadata.app_role === "admin") authorized = true;
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

    const roomCount = await get(`/OpenAPI/Rooms/PMSRoomCount?pVenueID=${venueId}&pRoomTypeID=0`);
    const roomTypes = await get(`/OpenAPI/Rooms/CRSTypes?pVenueID=${venueId}`);
    const inPeriod = await get(
      `/OpenAPI/Reservations/PMSReservationsInPeriod?pVenueID=${venueId}&pStartDate=${from}&pEndDate=${to}`,
    );

    const list = Array.isArray(inPeriod.body) ? (inPeriod.body as Record<string, unknown>[]) : [];
    const statuses = [...new Set(list.map((r) => String(r.Status)))];
    const live = list.find((r) => ["Checked Out", "Checked In", "Confirmed"].includes(String(r.Status)));
    let bill: unknown = null;
    if (live) {
      const guestId = ((live.Guests as Record<string, unknown>[]) ?? [])[0]?.ID ?? 0;
      bill = await get(
        `/OpenAPI/Reservations/PMSBill?pVenueID=${venueId}&pReservationID=${live.ReservationID}&pGuestID=${guestId}`,
      );
    }

    return new Response(
      JSON.stringify(
        {
          from,
          to,
          roomCount,
          roomTypes,
          reservationCount: list.length,
          statuses,
          sampleReservation: live ?? list[0] ?? null,
          bill,
        },
        null,
        2,
      ),
      { headers: { ...corsHeaders, "Content-Type": "application/json" } },
    );
  } catch (e) {
    return new Response(
      JSON.stringify({ error: e instanceof Error ? e.message : String(e) }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } },
    );
  }
});
