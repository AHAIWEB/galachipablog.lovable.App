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

    const { url } = await req.json().catch(() => ({}));

    // --- Ping public sitemap endpoints (Bing still honors this; Google deprecated but harmless)
    const pingResults: Record<string, number | string> = {};
    for (const endpoint of [
      `https://www.google.com/ping?sitemap=${encodeURIComponent(SITEMAP)}`,
      `https://www.bing.com/ping?sitemap=${encodeURIComponent(SITEMAP)}`,
    ]) {
      try {
        const r = await fetch(endpoint, { method: "GET" });
        pingResults[new URL(endpoint).host] = r.status;
      } catch (e) {
        pingResults[endpoint] = (e as Error).message;
      }
    }

    // --- Optional: URL inspection & sitemap resubmit via Search Console connector
    const gscKey = Deno.env.get("GOOGLE_SEARCH_CONSOLE_API_KEY");
    const lovableKey = Deno.env.get("LOVABLE_API_KEY");
    let inspection: unknown = null;
    let sitemap: unknown = null;
    if (gscKey && lovableKey) {
      const gwHeaders = {
        Authorization: `Bearer ${lovableKey}`,
        "X-Connection-Api-Key": gscKey,
        "Content-Type": "application/json",
      };
      try {
        const smRes = await fetch(
          `https://connector-gateway.lovable.dev/google_search_console/webmasters/v3/sites/${encodeURIComponent(SITE + "/")}/sitemaps/${encodeURIComponent(SITEMAP)}`,
          { method: "PUT", headers: gwHeaders },
        );
        sitemap = { status: smRes.status, body: await smRes.text() };
      } catch (e) {
        sitemap = { error: (e as Error).message };
      }
      if (url) {
        try {
          const insRes = await fetch(
            `https://connector-gateway.lovable.dev/google_search_console/v1/urlInspection/index:inspect`,
            { method: "POST", headers: gwHeaders, body: JSON.stringify({ inspectionUrl: url, siteUrl: SITE + "/" }) },
          );
          inspection = { status: insRes.status, body: await insRes.json().catch(() => null) };
        } catch (e) {
          inspection = { error: (e as Error).message };
        }
      }
    }

    return json({ ok: true, sitemap_url: SITEMAP, pinged: pingResults, inspection, sitemap });
  } catch (e) {
    return json({ error: (e as Error).message }, 500);
  }
});
