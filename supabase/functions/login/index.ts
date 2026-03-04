import { createClient } from "https://esm.sh/@supabase/supabase-js@2";
import { timingSafeEqual } from "https://deno.land/std@0.208.0/crypto/timing_safe_equal.ts";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version",
};

function constantTimeCompare(a: string, b: string): boolean {
  const encoder = new TextEncoder();
  const aBuf = encoder.encode(a.padEnd(200, "\0"));
  const bBuf = encoder.encode(b.padEnd(200, "\0"));
  return timingSafeEqual(aBuf, bBuf);
}

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const { password } = await req.json();

    if (!password || typeof password !== "string" || password.length < 6 || password.length > 200) {
      return new Response(
        JSON.stringify({ error: "Invalid input" }),
        { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    const supabase = createClient(
      Deno.env.get("SUPABASE_URL")!,
      Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!
    );

    const { data: settings, error } = await supabase
      .from("app_settings")
      .select("setting_key, setting_value")
      .in("setting_key", ["shared_password", "staff_password"]);

    if (error) {
      return new Response(
        JSON.stringify({ error: "Server error" }),
        { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    const adminPwd = settings?.find((s: any) => s.setting_key === "shared_password")?.setting_value || "";
    const staffPwd = settings?.find((s: any) => s.setting_key === "staff_password")?.setting_value || "";

    // Always compare both to prevent timing leakage of which role exists
    const isAdmin = adminPwd.length > 0 && constantTimeCompare(password, adminPwd);
    const isStaff = staffPwd.length > 0 && constantTimeCompare(password, staffPwd);

    if (isAdmin) {
      return new Response(
        JSON.stringify({ authenticated: true, role: "admin" }),
        { headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    if (isStaff) {
      return new Response(
        JSON.stringify({ authenticated: true, role: "viewer" }),
        { headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    return new Response(
      JSON.stringify({ authenticated: false }),
      { status: 401, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  } catch {
    return new Response(
      JSON.stringify({ error: "Invalid request" }),
      { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }
});
