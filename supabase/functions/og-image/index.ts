import { createClient } from "npm:@supabase/supabase-js@2";
import { corsHeaders } from "npm:@supabase/supabase-js@2/cors";

const decodeHtmlEntities = (s: string) =>
  s
    .replace(/&amp;/g, "&")
    .replace(/&quot;/g, '"')
    .replace(/&#39;|&apos;/g, "'")
    .replace(/&lt;/g, "<")
    .replace(/&gt;/g, ">");

const extractFirstImage = (html: string) => {
  const candidates: string[] = [];
  const imageTags = html.match(/<img[^>]*>/gi) ?? [];

  for (const tag of imageTags) {
    const srcset = tag.match(/srcset=["']([^"']+)["']/i)?.[1];
    if (srcset) {
      candidates.push(...srcset.split(",").map((item) => item.trim().split(/\s+/)[0]).filter(Boolean));
    }

    const src = tag.match(/src=["']([^"']+)["']/i)?.[1];
    if (src) candidates.push(src);
  }

  return candidates.find((src) => !/\.svg(?:[?#]|$)/i.test(src) && !/placeholder|avatar|logo/i.test(src)) ?? candidates[0] ?? "";
};

const normalizeImageUrl = (raw: string, siteOrigin: string) => {
  const image = decodeHtmlEntities(raw).trim();
  if (!image || image.startsWith("data:")) return "";
  if (image.startsWith("//")) return `https:${image}`;
  if (/^https?:\/\//i.test(image)) return image;
  if (image.startsWith("/")) return `${siteOrigin.replace(/\/$/, "")}${image}`;
  return "";
};

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response("ok", { headers: corsHeaders });

  const url = new URL(req.url);
  const slug = (url.searchParams.get("slug") ?? "").trim();
  const siteOverride = url.searchParams.get("site");

  if (!slug || slug.length > 220) {
    return new Response("Invalid image request", {
      status: 400,
      headers: { ...corsHeaders, "Content-Type": "text/plain; charset=utf-8" },
    });
  }

  const siteOrigin =
    (siteOverride && /^https?:\/\//i.test(siteOverride) ? siteOverride : null) ||
    "https://galachipablog.lovable.app";

  const supabase = createClient(
    Deno.env.get("SUPABASE_URL")!,
    Deno.env.get("SUPABASE_ANON_KEY")!,
  );

  const { data } = await supabase
    .from("posts")
    .select("featured_image, content")
    .eq("slug", slug)
    .eq("status", "published")
    .maybeSingle();

  const imageUrl = normalizeImageUrl(data?.featured_image || extractFirstImage(data?.content || ""), siteOrigin);

  if (!imageUrl) {
    return new Response("No image found", {
      status: 404,
      headers: { ...corsHeaders, "Content-Type": "text/plain; charset=utf-8" },
    });
  }

  const upstream = await fetch(imageUrl, {
    headers: {
      "User-Agent": "Mozilla/5.0 GalachipaBlogSocialPreview/1.0",
      Accept: "image/avif,image/webp,image/apng,image/svg+xml,image/*,*/*;q=0.8",
    },
  });

  if (!upstream.ok || !upstream.body) {
    return Response.redirect(imageUrl, 302);
  }

  return new Response(upstream.body, {
    status: 200,
    headers: {
      ...corsHeaders,
      "Content-Type": upstream.headers.get("content-type") || "image/jpeg",
      "Cache-Control": "public, max-age=86400, s-maxage=86400",
    },
  });
});