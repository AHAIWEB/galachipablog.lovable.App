import { createClient } from "https://esm.sh/@supabase/supabase-js@2.49.1";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response(null, { headers: corsHeaders });

  try {
    const { url } = await req.json();
    if (!url) {
      return new Response(JSON.stringify({ error: "URL required" }), { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } });
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
