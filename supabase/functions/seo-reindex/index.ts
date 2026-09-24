// Admin-only endpoint that pings Google + Bing sitemap and (optionally)
// resubmits the sitemap through the Google Search Console connector.
//
// POST body: { url?: string }  // optional single URL to inspect
// Response: { pinged: {...}, inspection?: {...}, sitemap?: {...} }

import { createClient } from "npm:@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

const SITE = "https://galachipablog.lovable.app";
const SITEMAP = `${SITE}/sitemap.xml`;

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response(null, { headers: corsHeaders });
  const json = (b: unknown, s = 200) => new Response(JSON.stringify(b), { status: s, headers: { ...corsHeaders, "Content-Type": "application/json" } });

  try {
    // --- admin gate
    const authHeader = req.headers.get("Authorization") || "";
    if (!authHeader.startsWith("Bearer ")) return json({ error: "Unauthorized" }, 401);
    const supabase = createClient(Deno.env.get("SUPABASE_URL")!, Deno.env.get("SUPABASE_ANON_KEY")!, {
      global: { headers: { Authorization: authHeader } },
    });
    const { data: claims } = await supabase.auth.getClaims(authHeader.replace("Bearer ", ""));
    const uid = claims?.claims?.sub;
    if (!uid) return json({ error: "Unauthorized" }, 401);
    const { data: role } = await supabase.from("user_roles").select("role").eq("user_id", uid).eq("role", "admin").maybeSingle();
    if (!role) return json({ error: "Admin required" }, 403);

    const body = await req.json().catch(() => ({}));
    const url: string | undefined = body?.url;
    const urls: string[] = Array.isArray(body?.urls) ? body.urls.filter((u: any) => typeof u === "string") : [];

    const started = Date.now();
    const DEADLINE_MS = 100_000; // stay well under the 150s gateway limit
    const tfetch = (input: string, init: RequestInit = {}, ms = 12_000) =>
      fetch(input, { ...init, signal: AbortSignal.timeout(ms) });

    // --- Ping public sitemap endpoints (parallel, short timeout)
    const pingResults: Record<string, number | string> = {};
    await Promise.all([
      `https://www.google.com/ping?sitemap=${encodeURIComponent(SITEMAP)}`,
      `https://www.bing.com/ping?sitemap=${encodeURIComponent(SITEMAP)}`,
    ].map(async (endpoint) => {
      const host = new URL(endpoint).host;
      try {
        const r = await tfetch(endpoint, { method: "GET" }, 6_000);
        pingResults[host] = r.status;
        await r.body?.cancel();
      } catch (e) {
        pingResults[host] = (e as Error).message;
      }
    }));

    // --- Google Search Console: sitemap resubmit + per-URL inspection
    const gscKey = Deno.env.get("GOOGLE_SEARCH_CONSOLE_API_KEY");
    const lovableKey = Deno.env.get("LOVABLE_API_KEY");
    let inspection: unknown = null;
    let sitemap: unknown = null;
    const inspections: Array<{ url: string; verdict?: string; coverageState?: string; lastCrawlTime?: string; userCanonical?: string; googleCanonical?: string; canonicalMatch?: boolean; error?: string; status?: number }> = [];
    let skipped: string[] = [];

    if (gscKey && lovableKey) {
      const gwHeaders = {
        Authorization: `Bearer ${lovableKey}`,
        "X-Connection-Api-Key": gscKey,
        "Content-Type": "application/json",
      };
      try {
        const smRes = await tfetch(
          `https://connector-gateway.lovable.dev/google_search_console/webmasters/v3/sites/${encodeURIComponent(SITE + "/")}/sitemaps/${encodeURIComponent(SITEMAP)}`,
          { method: "PUT", headers: gwHeaders },
          15_000,
        );
        sitemap = { status: smRes.status, body: (await smRes.text()).slice(0, 500) };
      } catch (e) {
        sitemap = { error: (e as Error).message };
      }

      const inspectOne = async (u: string) => {
        try {
          const insRes = await tfetch(
            `https://connector-gateway.lovable.dev/google_search_console/v1/urlInspection/index:inspect`,
            { method: "POST", headers: gwHeaders, body: JSON.stringify({ inspectionUrl: u, siteUrl: SITE + "/" }) },
            15_000,
          );

      if (url && inspections.length > 0) inspection = inspections[0];
    }

    return json({ ok: true, sitemap_url: SITEMAP, pinged: pingResults, inspection, inspections, sitemap });
  } catch (e) {
    return json({ error: (e as Error).message }, 500);
  }
});
