import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version",
};

const MAX_ATTEMPTS = 10;
const WINDOW_MINUTES = 15;

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

    // Rate limiting: check recent attempts from this IP
    const clientIp = req.headers.get("x-forwarded-for")?.split(",")[0]?.trim() || "unknown";

    const { data: recentAttempts, error: attemptsError } = await supabase
      .from("login_attempts")
      .select("id")
      .eq("ip_address", clientIp)
      .gte("attempted_at", new Date(Date.now() - WINDOW_MINUTES * 60 * 1000).toISOString());

    if (!attemptsError && recentAttempts && recentAttempts.length >= MAX_ATTEMPTS) {
      return new Response(
        JSON.stringify({ error: "Too many login attempts. Please try again later." }),
        { status: 429, headers: { ...corsHeaders, "Content-Type": "application/json", "Retry-After": "900" } }
      );
    }

    // Record this attempt
    await supabase.from("login_attempts").insert({ ip_address: clientIp });

    // Fetch hashed passwords from app_settings
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

    const adminHash = settings?.find((s: any) => s.setting_key === "shared_password")?.setting_value || "";
    const staffHash = settings?.find((s: any) => s.setting_key === "staff_password")?.setting_value || "";

    // Compare using pgcrypto's crypt function via RPC
    let role: string | null = null;

    if (adminHash) {
      const { data: adminMatch } = await supabase.rpc("verify_password", {
        input_password: password,
        stored_hash: adminHash,
      });
      if (adminMatch) role = "admin";
    }

    if (!role && staffHash) {
      const { data: staffMatch } = await supabase.rpc("verify_password", {
        input_password: password,
        stored_hash: staffHash,
      });
      if (staffMatch) role = "viewer";
    }

    if (!role) {
      return new Response(
        JSON.stringify({ authenticated: false }),
        { status: 401, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    // Create or sign in a Supabase Auth user for this role
    const email = `${role}@internal.reserved-suites.app`;
    const internalPassword = serviceRoleKey.slice(0, 32) + "_" + role;

    const anonClient = createClient(supabaseUrl, Deno.env.get("SUPABASE_ANON_KEY")!);
    let session = null;

    const { data: signInData } = await anonClient.auth.signInWithPassword({
      email,
      password: internalPassword,
    });

    if (signInData?.session) {
      session = signInData.session;
    } else {
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

      if (createData?.user) {
        await supabase.auth.admin.updateUserById(createData.user.id, {
          app_metadata: { app_role: role },
        });
      }
    }

    // Clean up attempts on successful login
    await supabase.from("login_attempts").delete().eq("ip_address", clientIp);

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
