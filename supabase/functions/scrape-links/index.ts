import { createClient } from "https://esm.sh/@supabase/supabase-js@2.49.1";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response(null, { headers: corsHeaders });

  try {
    // Require admin auth
    const authHeader = req.headers.get("Authorization");
    if (!authHeader?.startsWith("Bearer ")) {
      return new Response(JSON.stringify({ error: "Unauthorized" }), { status: 401, headers: { ...corsHeaders, "Content-Type": "application/json" } });
    }
    const supabaseAuth = createClient(Deno.env.get("SUPABASE_URL")!, Deno.env.get("SUPABASE_ANON_KEY")!, {
      global: { headers: { Authorization: authHeader } },
    });
    const token = authHeader.replace("Bearer ", "");
    const { data: claims, error: claimsErr } = await supabaseAuth.auth.getClaims(token);
    if (claimsErr || !claims?.claims) {
      return new Response(JSON.stringify({ error: "Unauthorized" }), { status: 401, headers: { ...corsHeaders, "Content-Type": "application/json" } });
    }
    const { data: roleRow } = await supabaseAuth.from("user_roles").select("role").eq("user_id", claims.claims.sub).eq("role", "admin").maybeSingle();
    if (!roleRow) {
      return new Response(JSON.stringify({ error: "Admin access required" }), { status: 403, headers: { ...corsHeaders, "Content-Type": "application/json" } });
    }

    let { url } = await req.json();
    if (!url) {
      return new Response(JSON.stringify({ error: "URL required" }), { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } });
    }


    // Ensure URL has a scheme
    url = url.trim();
    if (!url.startsWith("http://") && !url.startsWith("https://")) {
      url = "https://" + url;
    }

    console.log("Scraping links from:", url);

    const res = await fetch(url, {
      headers: { "User-Agent": "Mozilla/5.0 (compatible; GalachipaScraper/1.0)" },
    });
    const html = await res.text();

    // Extract all anchor links with their text and href
    const linkRegex = /<a[^>]*href=["']([^"']+)["'][^>]*>([\s\S]*?)<\/a>/gi;
    const links: { title: string; url: string; favicon_url: string }[] = [];
    const seen = new Set<string>();
    let match;

    while ((match = linkRegex.exec(html)) !== null) {
      let href = match[1].trim();
      let title = match[2].replace(/<[^>]*>/g, "").trim();

      // Skip anchors, javascript, mailto, empty
      if (!href || href.startsWith("#") || href.startsWith("javascript:") || href.startsWith("mailto:")) continue;

      // Make absolute URL
      if (href.startsWith("//")) href = "https:" + href;
      else if (href.startsWith("/")) {
        try { href = new URL(href, url).href; } catch { continue; }
      }

      if (!href.startsWith("http")) continue;
      if (!title || title.length < 2) continue;
      if (seen.has(href)) continue;
      seen.add(href);

      let favicon_url = "";
      try {
        const domain = new URL(href).hostname;
        favicon_url = `https://www.google.com/s2/favicons?domain=${domain}&sz=64`;
      } catch {}

      // Extract logo img if present in the anchor
      const imgMatch = match[0].match(/<img[^>]*src=["']([^"']+)["']/i);

      links.push({ title: title.substring(0, 200), url: href, favicon_url });
    }

    console.log(`Found ${links.length} links`);

    return new Response(JSON.stringify({ links }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  } catch (error) {
    console.error("Scrape error:", error);
    return new Response(JSON.stringify({ error: error.message }), {
      status: 500,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});
