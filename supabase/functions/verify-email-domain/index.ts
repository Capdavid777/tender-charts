// Verifies sending subdomain DNS for Lovable Emails: NS delegation, MX, SPF (TXT)
// Public read-only endpoint — uses Cloudflare DNS-over-HTTPS.

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type",
};

const DOH = "https://cloudflare-dns.com/dnsQueryRequest"; // placeholder, real below
const DOH_URL = "https://cloudflare-dns.com/dns-query";

const EXPECTED_NS = ["ns3.lovable.cloud", "ns4.lovable.cloud"];

async function dnsQuery(name: string, type: string): Promise<string[]> {
  const res = await fetch(`${DOH_URL}?name=${encodeURIComponent(name)}&type=${type}`, {
    headers: { accept: "application/dns-json" },
  });
  if (!res.ok) return [];
  const json = await res.json();
  const answers: Array<{ data: string; type: number }> = json.Answer ?? json.Authority ?? [];
  return answers.map((a) => a.data);
}

function normalizeNs(s: string): string {
  return s.replace(/\.$/, "").toLowerCase();
}

function stripQuotes(s: string): string {
  return s.replace(/^"|"$/g, "").replace(/" "/g, "");
}

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response("ok", { headers: corsHeaders });

  try {
    const url = new URL(req.url);
    const domain = (url.searchParams.get("domain") || "").trim().toLowerCase();
    if (!domain || !/^[a-z0-9.-]+\.[a-z]{2,}$/i.test(domain)) {
      return new Response(JSON.stringify({ error: "Invalid domain" }), {
        status: 400,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const [nsRecords, mxRecords, txtRecords] = await Promise.all([
      dnsQuery(domain, "NS"),
      dnsQuery(domain, "MX"),
      dnsQuery(domain, "TXT"),
    ]);

    const ns = nsRecords.map(normalizeNs);
    const nsExpected = EXPECTED_NS.map((n) => n.toLowerCase());
    const nsPass =
      ns.length > 0 && nsExpected.every((e) => ns.some((n) => n === e || n.endsWith("." + e) || n === e));
    // simpler: every expected appears in ns
    const nsExactPass = nsExpected.every((e) => ns.includes(e));

    const mxPass = mxRecords.length > 0;

    const txts = txtRecords.map(stripQuotes);
    const spfRecord = txts.find((t) => t.toLowerCase().startsWith("v=spf1"));
    const spfPass = !!spfRecord;

    const allPass = nsExactPass && mxPass && spfPass;

    return new Response(
      JSON.stringify({
        domain,
        checkedAt: new Date().toISOString(),
        overall: allPass ? "verified" : "incomplete",
        checks: {
          ns: {
            label: "NS delegation",
            description: "Subdomain delegated to Lovable nameservers",
            pass: nsExactPass,
            expected: EXPECTED_NS,
            found: ns,
          },
          mx: {
            label: "MX records",
            description: "Mail exchanger records for the sending subdomain",
            pass: mxPass,
            found: mxRecords,
          },
          spf: {
            label: "SPF (TXT)",
            description: "Sender Policy Framework record",
            pass: spfPass,
            found: spfRecord ? [spfRecord] : [],
          },
        },
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
