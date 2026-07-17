// Public edge function that returns a lightweight HTML shell with proper
// Open Graph / Twitter Card meta tags for a single post, then redirects real
// browsers to the SPA route. Social crawlers (Facebook, Twitter, WhatsApp,
// LinkedIn, Slack, Telegram, etc.) do NOT execute JS, so they read the meta
// tags below and produce a correct preview card. Regular users are
// immediately redirected to /post/:slug.
//
// URL: https://<project>.supabase.co/functions/v1/og-post?slug=<slug>
// Optional: &site=https://your-site.com  (overrides Referer / origin)

import { createClient } from "npm:@supabase/supabase-js@2";
import { corsHeaders } from "npm:@supabase/supabase-js@2/cors";

const escapeHtml = (s: string) =>
  s.replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;").replace(/"/g, "&quot;").replace(/'/g, "&#39;");

const stripHtml = (s: string) => s.replace(/<[^>]*>/g, " ").replace(/\s+/g, " ").trim();

const decodeHtmlEntities = (s: string) =>
  s
    .replace(/&amp;/g, "&")
    .replace(/&quot;/g, '"')
    .replace(/&#39;|&apos;/g, "'")
    .replace(/&lt;/g, "<")
    .replace(/&gt;/g, ">");

const extractFirstImage = (html: string) => {
  const srcsetMatch = html.match(/<img[^>]+srcset=["']([^"']+)["'][^>]*>/i);
  if (srcsetMatch?.[1]) {
    const firstSrc = srcsetMatch[1].split(",")[0]?.trim().split(/\s+/)[0];
    if (firstSrc) return firstSrc;
  }

  return html.match(/<img[^>]+src=["']([^"']+)["'][^>]*>/i)?.[1] ?? "";
};

const normalizeImageUrl = (raw: string, siteOrigin: string) => {
  const image = decodeHtmlEntities(raw).trim();
  if (!image) return "";
  if (image.startsWith("//")) return `https:${image}`;
  if (/^https?:\/\//i.test(image)) return image;
  if (image.startsWith("/")) return `${siteOrigin.replace(/\/$/, "")}${image}`;
  return "";
};

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response("ok", { headers: corsHeaders });

  const url = new URL(req.url);
  const slug = (url.searchParams.get("slug") ?? url.pathname.split("/").filter(Boolean).pop() ?? "").trim();
  const siteOverride = url.searchParams.get("site");

  if (!slug || slug.length > 220) {
    return new Response(JSON.stringify({ error: "Invalid slug" }), {
      status: 400,
      headers: { ...corsHeaders, "content-type": "application/json" },
    });
  }

  // Derive the public site origin to redirect users to.
  const siteOrigin =
    (siteOverride && /^https?:\/\//i.test(siteOverride) ? siteOverride : null) ||
    (req.headers.get("referer") ? new URL(req.headers.get("referer")!).origin : null) ||
    "https://galachipablog.lovable.app";

  const targetUrl = `${siteOrigin.replace(/\/$/, "")}/post/${encodeURIComponent(slug)}`;

  const supabase = createClient(
    Deno.env.get("SUPABASE_URL")!,
    Deno.env.get("SUPABASE_ANON_KEY")!,
  );

  let title = "গালাচিপা ব্লগ";
  let description = "বাংলা ব্লগ ও সংবাদ পোর্টাল";
  let image = "";

  if (slug) {
    const { data } = await supabase
      .from("posts")
      .select("title, excerpt, content, featured_image")
      .eq("slug", slug)
      .eq("status", "published")
      .maybeSingle();
    if (data) {
      title = data.title || title;
      description = (data.excerpt || stripHtml(data.content || "").slice(0, 200) || description).slice(0, 300);
      image = normalizeImageUrl(data.featured_image || extractFirstImage(data.content || ""), siteOrigin);
    }
  }

  const html = `<!DOCTYPE html>
<html lang="bn" prefix="og: https://ogp.me/ns#">
<head>
<meta charset="utf-8" />
<meta name="viewport" content="width=device-width,initial-scale=1" />
<title>${escapeHtml(title)}</title>
<meta name="description" content="${escapeHtml(description)}" />
<link rel="canonical" href="${escapeHtml(targetUrl)}" />

<meta property="og:type" content="article" />
<meta property="og:site_name" content="গালাচিপা ব্লগ" />
<meta property="og:title" content="${escapeHtml(title)}" />
<meta property="og:description" content="${escapeHtml(description)}" />
<meta property="og:url" content="${escapeHtml(targetUrl)}" />
${image ? `<meta property="og:image" content="${escapeHtml(image)}" />
<meta property="og:image:secure_url" content="${escapeHtml(image)}" />
<meta property="og:image:width" content="1200" />
<meta property="og:image:height" content="630" />
<meta property="og:image:alt" content="${escapeHtml(title)}" />` : ""}

<meta name="twitter:card" content="${image ? "summary_large_image" : "summary"}" />
<meta name="twitter:title" content="${escapeHtml(title)}" />
<meta name="twitter:description" content="${escapeHtml(description)}" />
${image ? `<meta name="twitter:image" content="${escapeHtml(image)}" />` : ""}

<meta http-equiv="refresh" content="0; url=${escapeHtml(targetUrl)}" />
<script>window.location.replace(${JSON.stringify(targetUrl)});</script>
</head>
<body>
<p>Redirecting to <a href="${escapeHtml(targetUrl)}">${escapeHtml(title)}</a>...</p>
</body>
</html>`;

  return new Response(html, {
    headers: {
      ...corsHeaders,
      "content-type": "text/html; charset=utf-8",
      "cache-control": "public, max-age=300",
    },
  });
});
