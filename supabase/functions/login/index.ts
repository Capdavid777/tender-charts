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

    const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
    const serviceRoleKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;

    const supabase = createClient(supabaseUrl, serviceRoleKey);

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

    // Always compare both to prevent timing leakage
    const isAdmin = adminPwd.length > 0 && constantTimeCompare(password, adminPwd);
    const isStaff = staffPwd.length > 0 && constantTimeCompare(password, staffPwd);

    let role: string | null = null;
    if (isAdmin) role = "admin";
    else if (isStaff) role = "viewer";

    if (!role) {
      return new Response(
        JSON.stringify({ authenticated: false }),
        { status: 401, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    // Create or sign in a Supabase Auth user for this role
    const email = `${role}@internal.reserved-suites.app`;
    // Deterministic internal password derived from service role key + role
    const internalPassword = serviceRoleKey.slice(0, 32) + "_" + role;

    // Try to sign in first
    const anonClient = createClient(supabaseUrl, Deno.env.get("SUPABASE_ANON_KEY")!);
    let session = null;

    const { data: signInData, error: signInError } = await anonClient.auth.signInWithPassword({
      email,
      password: internalPassword,
    });

    if (signInData?.session) {
      session = signInData.session;
    } else {
      // User doesn't exist yet — create with admin API
      const { data: createData, error: createError } = await supabase.auth.admin.createUser({
        email,
        password: internalPassword,
        email_confirm: true,
        app_metadata: { app_role: role },
      });

      if (createError && !createError.message?.includes("already been registered")) {
        console.error("Create user error:", createError.message);
        return new Response(
          JSON.stringify({ error: "Server error" }),
          { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
        );
      }

      // Try sign in again
      const { data: retryData, error: retryError } = await anonClient.auth.signInWithPassword({
        email,
        password: internalPassword,
      });

      if (retryError || !retryData?.session) {
        console.error("Sign in retry error:", retryError?.message);
        return new Response(
          JSON.stringify({ error: "Server error" }),
          { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
        );
      }

      session = retryData.session;

      // Ensure app_metadata has the role
      if (createData?.user) {
        await supabase.auth.admin.updateUserById(createData.user.id, {
          app_metadata: { app_role: role },
        });
      }
    }

    return new Response(
      JSON.stringify({
        authenticated: true,
        role,
        access_token: session.access_token,
        refresh_token: session.refresh_token,
      }),
      { headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  } catch (e) {
    console.error("Login error:", e);
    return new Response(
      JSON.stringify({ error: "Invalid request" }),
      { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }
});
