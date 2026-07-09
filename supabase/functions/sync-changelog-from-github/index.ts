// Pulls new commits from a public GitHub repo, uses Lovable AI to summarize the
// actual code diff into a user-facing changelog entry, and skips commits that
// don't change anything end users would notice.

import { createClient } from "https://esm.sh/@supabase/supabase-js@2.45.0";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

const REPO = "Capdavid777/tender-charts";
const LAST_SHA_KEY = "changelog_last_sha";
const MAX_PAGES = 3;
const PER_PAGE = 30;
const MAX_COMMITS_PER_RUN = 25;
const MAX_DIFF_CHARS = 12000; // keep prompt small + cheap

interface GhCommit {
  sha: string;
  commit: { message: string; author: { name: string; date: string } };
  parents: { sha: string }[];
}

interface GhCommitDetail {
  sha: string;
  commit: { message: string; author: { name: string; date: string } };
  files?: { filename: string; status: string; additions: number; deletions: number; patch?: string }[];
}

// Hard skips before we even spend AI tokens
const HARD_SKIP = [
  /^merge\b/i,
  /^chore(\(.+\))?:/i,
  /^ci(\(.+\))?:/i,
  /^build(\(.+\))?:/i,
  /^bump\b/i,
  /version bump/i,
  /^update (package-lock|bun\.lock|yarn\.lock)/i,
  /^restored? to version/i,
  /^revert/i,
];

function hardSkip(commit: GhCommit): boolean {
  if (commit.parents.length > 1) return true;
  const title = (commit.commit.message.split("\n")[0] ?? "").trim();
  return HARD_SKIP.some((p) => p.test(title));
}

function buildDiffSummary(detail: GhCommitDetail): string {
  const files = detail.files ?? [];
  // Ignore noise files
  const meaningful = files.filter((f) =>
    !/(^|\/)(package-lock\.json|bun\.lock|yarn\.lock|pnpm-lock\.yaml)$/i.test(f.filename),
  );
  if (meaningful.length === 0) return "";
  const parts: string[] = [];
  parts.push(`Original commit message: ${detail.commit.message.split("\n")[0]}`);
  parts.push(`Files changed: ${meaningful.length}`);
  let budget = MAX_DIFF_CHARS;
  for (const f of meaningful) {
    const header = `\n--- ${f.filename} (+${f.additions}/-${f.deletions}, ${f.status}) ---\n`;
    if (budget - header.length <= 0) break;
    parts.push(header);
    budget -= header.length;
    const patch = (f.patch ?? "").slice(0, Math.min(2500, budget));
    if (patch) {
      parts.push(patch);
      budget -= patch.length;
    }
    if (budget <= 0) break;
  }
  return parts.join("");
}

interface AiSummary {
  skip: boolean;
  title?: string;
  body?: string;
  reason?: string;
}

async function summarizeWithAI(diffText: string): Promise<AiSummary> {
  const apiKey = Deno.env.get("LOVABLE_API_KEY");
  if (!apiKey) return { skip: true, reason: "no LOVABLE_API_KEY" };

  const system = `You write end-user release notes for a hotel revenue dashboard.
Given a single git commit (message + code diff), decide whether end users would notice the change.

Return STRICT JSON only, no prose, with this shape:
{"skip": boolean, "title": string, "body": string, "reason": string}

Rules:
- skip=true for: pure refactors, formatting, dependency bumps, internal logging, code comments, build/CI, tests-only, type-only changes, dead-code removal, things only developers care about.
- skip=false ONLY when there is a visible user-facing change: new feature, new UI element, changed behavior of a chart/KPI/table, bug fix users would notice, performance improvement, copy change, new page, new column, etc.
- title: <= 80 chars, plain English, no "feat:"/"fix:" prefixes, no emoji, sentence case. Describe what the user gets.
- body: 1-3 short sentences explaining what changed and why it matters to the user. No code, no file names, no commit SHAs.
- reason: short internal note explaining your skip decision.`;

  const res = await fetch("https://ai.gateway.lovable.dev/v1/chat/completions", {
    method: "POST",
    headers: { Authorization: `Bearer ${apiKey}`, "Content-Type": "application/json" },
    body: JSON.stringify({
      model: "google/gemini-2.5-flash",
      messages: [
        { role: "system", content: system },
        { role: "user", content: diffText },
      ],
      response_format: { type: "json_object" },
    }),
  });

  if (!res.ok) {
    const detail = await res.text();
    return { skip: true, reason: `AI ${res.status}: ${detail.slice(0, 200)}` };
  }
  const json = await res.json();
  const content = json?.choices?.[0]?.message?.content ?? "{}";
  try {
    const parsed = JSON.parse(content) as AiSummary;
    return parsed;
  } catch {
    return { skip: true, reason: "AI returned non-JSON" };
  }
}

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response("ok", { headers: corsHeaders });

  try {
    // AuthZ: require either an admin JWT (interactive "Sync" button) or a
    // shared cron secret. Prevents anonymous abuse of the AI gateway.
    const authHeader = req.headers.get("Authorization") ?? "";
    const cronSecretHeader = req.headers.get("x-changelog-sync-secret") ?? "";
    const cronSecret = Deno.env.get("CHANGELOG_SYNC_SECRET") ?? "";
    let authorized = false;

    if (cronSecret && cronSecretHeader && cronSecretHeader === cronSecret) {
      authorized = true;
    } else if (authHeader.startsWith("Bearer ")) {
      const authClient = createClient(
        Deno.env.get("SUPABASE_URL")!,
        Deno.env.get("SUPABASE_ANON_KEY")!,
        { global: { headers: { Authorization: authHeader } } },
      );
      const token = authHeader.replace("Bearer ", "");
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

    const supabase = createClient(
      Deno.env.get("SUPABASE_URL")!,
      Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!,
    );


    const { data: lastSetting } = await supabase
      .from("app_settings")
      .select("setting_value")
      .eq("setting_key", LAST_SHA_KEY)
      .maybeSingle();
    const lastSha = lastSetting?.setting_value ?? null;

    // 1) Collect new commits (newest -> oldest), stopping at lastSha
    const newCommits: GhCommit[] = [];
    let stopped = false;
    let newestSha: string | null = null;

    for (let page = 1; page <= MAX_PAGES && !stopped; page++) {
      const url = `https://api.github.com/repos/${REPO}/commits?per_page=${PER_PAGE}&page=${page}`;
      const res = await fetch(url, {
        headers: { accept: "application/vnd.github+json", "user-agent": "lovable-changelog-sync" },
      });
      if (!res.ok) {
        return new Response(
          JSON.stringify({ error: `GitHub API ${res.status}`, detail: await res.text() }),
          { status: 502, headers: { ...corsHeaders, "Content-Type": "application/json" } },
        );
      }
      const batch = (await res.json()) as GhCommit[];
      if (batch.length === 0) break;
      if (!newestSha) newestSha = batch[0].sha;

      for (const c of batch) {
        if (lastSha && c.sha === lastSha) { stopped = true; break; }
        newCommits.push(c);
        if (newCommits.length >= MAX_COMMITS_PER_RUN) { stopped = true; break; }
      }
      if (batch.length < PER_PAGE) break;
    }

    // 2) For each candidate, fetch diff + ask AI to summarize
    const entries: { title: string; body: string; published_at: string }[] = [];
    let aiSkipped = 0;
    let hardSkipped = 0;

    // Process oldest -> newest so display order matches commit order
    for (const c of [...newCommits].reverse()) {
      if (hardSkip(c)) { hardSkipped++; continue; }

      const detailRes = await fetch(`https://api.github.com/repos/${REPO}/commits/${c.sha}`, {
        headers: { accept: "application/vnd.github+json", "user-agent": "lovable-changelog-sync" },
      });
      if (!detailRes.ok) { hardSkipped++; continue; }
      const detail = (await detailRes.json()) as GhCommitDetail;
      const diffText = buildDiffSummary(detail);
      if (!diffText) { hardSkipped++; continue; }

      const summary = await summarizeWithAI(diffText);
      if (summary.skip || !summary.title || !summary.body) { aiSkipped++; continue; }

      entries.push({
        title: summary.title.slice(0, 200),
        body: summary.body,
        published_at: c.commit.author.date,
      });
    }

    let inserted = 0;
    if (entries.length > 0) {
      const { error: insertError } = await supabase.from("changelog_entries").insert(entries);
      if (insertError) {
        return new Response(
          JSON.stringify({ error: "Insert failed", detail: insertError.message }),
          { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } },
        );
      }
      inserted = entries.length;
    }

    if (newestSha) {
      await supabase
        .from("app_settings")
        .upsert(
          { setting_key: LAST_SHA_KEY, setting_value: newestSha },
          { onConflict: "setting_key" },
        );
    }

    return new Response(
      JSON.stringify({
        repo: REPO,
        scanned: newCommits.length,
        inserted,
        hardSkipped,
        aiSkipped,
        newestSha,
      }),
      { headers: { ...corsHeaders, "Content-Type": "application/json" } },
    );
  } catch (err) {
    const e = err as Error;
    console.error("sync-changelog failed:", e.message, e.stack);
    return new Response(
      JSON.stringify({ error: e.message, stack: e.stack?.split("\n").slice(0, 5) }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } },
    );
  }
});
