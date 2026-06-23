// Pulls new commits from a public GitHub repo and inserts them as changelog entries.
// Triggered on-demand by an admin via the UI, or by a scheduled pg_cron job.

import { createClient } from "https://esm.sh/@supabase/supabase-js@2.45.0";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

const REPO = "Capdavid777/tender-charts";
const LAST_SHA_KEY = "changelog_last_sha";
const MAX_PAGES = 5;
const PER_PAGE = 50;

interface GhCommit {
  sha: string;
  commit: {
    message: string;
    author: { name: string; date: string };
  };
  parents: { sha: string }[];
}

// Subjects we don't want to surface to end users
const SKIP_PATTERNS = [
  /^merge\b/i,
  /^chore(\(.+\))?:/i,
  /^style(\(.+\))?:/i,
  /^ci(\(.+\))?:/i,
  /^build(\(.+\))?:/i,
  /^bump\b/i,
  /version bump/i,
  /^update (package-lock|bun\.lock|yarn\.lock)/i,
  /^restored? to version/i,
  /^revert/i,
  /lovable-edit-id/i,
];

function cleanMessage(raw: string): { title: string; body: string } {
  // Strip metadata lines Lovable/GitHub append
  const lines = raw
    .split("\n")
    .filter((l) => !/^(X-Lovable-Edit-ID|Co-authored-by|Signed-off-by):/i.test(l.trim()));
  const title = (lines[0] ?? "").trim();
  const body = lines.slice(1).join("\n").trim();
  return { title, body };
}

function shouldSkip(title: string, commit: GhCommit): boolean {
  if (commit.parents.length > 1) return true; // merge commit
  if (!title) return true;
  return SKIP_PATTERNS.some((p) => p.test(title));
}

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response("ok", { headers: corsHeaders });

  try {
    const supabase = createClient(
      Deno.env.get("SUPABASE_URL")!,
      Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!,
    );

    // Read last synced SHA
    const { data: lastSetting } = await supabase
      .from("app_settings")
      .select("setting_value")
      .eq("setting_key", LAST_SHA_KEY)
      .maybeSingle();
    const lastSha = lastSetting?.setting_value ?? null;

    // Walk commits newest -> oldest, stop at lastSha
    const newCommits: GhCommit[] = [];
    let stopped = false;
    let newestSha: string | null = null;

    for (let page = 1; page <= MAX_PAGES && !stopped; page++) {
      const url = `https://api.github.com/repos/${REPO}/commits?per_page=${PER_PAGE}&page=${page}`;
      const res = await fetch(url, {
        headers: {
          accept: "application/vnd.github+json",
          "user-agent": "lovable-changelog-sync",
        },
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
        if (lastSha && c.sha === lastSha) {
          stopped = true;
          break;
        }
        newCommits.push(c);
      }
      if (batch.length < PER_PAGE) break;
    }

    // Filter and shape
    const entries = newCommits
      .map((c) => {
        const { title, body } = cleanMessage(c.commit.message);
        return { c, title, body };
      })
      .filter(({ c, title }) => !shouldSkip(title, c))
      .map(({ c, title, body }) => ({
        title: title.length > 200 ? title.slice(0, 197) + "…" : title,
        body: body || title,
        published_at: c.commit.author.date,
      }));

    let inserted = 0;
    if (entries.length > 0) {
      // newest first in array; insert oldest first so display order matches commit order
      const { error: insertError } = await supabase
        .from("changelog_entries")
        .insert(entries.reverse());
      if (insertError) {
        return new Response(
          JSON.stringify({ error: "Insert failed", detail: insertError.message }),
          { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } },
        );
      }
      inserted = entries.length;
    }

    // Always advance the cursor to the newest commit we saw, even if everything was filtered.
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
        skipped: newCommits.length - inserted,
        newestSha,
      }),
      { headers: { ...corsHeaders, "Content-Type": "application/json" } },
    );
  } catch (err) {
    return new Response(JSON.stringify({ error: (err as Error).message }), {
      status: 500,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});
