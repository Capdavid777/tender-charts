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

    const bases = [
      apiUrl.replace(/\/Help$/i, ""),
      "https://iis-prod.semper-services.com/IntegrationsAPI",
    ].filter((v, i, a) => v && a.indexOf(v) === i);

    const candidates = [
      `/OpenAPI/Reservations/PMSReservationsInPeriod?pVenueID=${venueId}&pStartDate=${from}&pEndDate=${to}`,
      `/OpenAPI/Rooms/PMSRoomCount?pVenueID=${venueId}&pRoomTypeID=0`,
      `/OpenAPI/Rooms/CRSTypes?pVenueID=${venueId}`,
    ];

    const headers = {
      "Accept": "application/json",
      "Content-Type": "application/json",
      "x-api-key": xApiKey,
      "x-token": xToken,
      "x-channel": channelId,
    };

    const results: ProbeResult[] = [];
    for (const base of bases) {
    for (const path of candidates) {
      const url = `${base}${path}`;
      try {
        const controller = new AbortController();
        const timer = setTimeout(() => controller.abort(), 12000);
        const res = await fetch(url, { method: "GET", headers, signal: controller.signal });
        clearTimeout(timer);
        const text = await res.text();
        results.push({
          path: path.split("?")[0],
          url: url.split("?")[0],
          status: res.status,
          ok: res.ok,
          contentType: res.headers.get("content-type"),
          sample: text.slice(0, 600),
        });
      } catch (e) {
        results.push({
          path: path.split("?")[0],
          url: url.split("?")[0],
          status: null,
          ok: false,
          contentType: null,
          sample: "",
          error: e instanceof Error ? e.message : String(e),
        });
      }
    }
    }

    return new Response(
      JSON.stringify({ from, to, bases, venueId, results }, null, 2),
      { headers: { ...corsHeaders, "Content-Type": "application/json" } },
    );
  } catch (e) {
    return new Response(
      JSON.stringify({ error: e instanceof Error ? e.message : String(e) }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } },
    );
  }
});
