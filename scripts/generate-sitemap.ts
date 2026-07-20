// Runs before `vite dev` and `vite build`; writes public/sitemap.xml.
import { writeFileSync } from "fs";
import { resolve } from "path";
import { createClient } from "@supabase/supabase-js";

const BASE_URL = "https://galachipablog.lovable.app";

interface Entry { path: string; lastmod?: string; changefreq?: string; priority?: string; }

const staticEntries: Entry[] = [
  { path: "/", changefreq: "daily", priority: "1.0" },
  { path: "/about", changefreq: "monthly", priority: "0.5" },
  { path: "/privacy", changefreq: "yearly", priority: "0.3" },
  { path: "/terms", changefreq: "yearly", priority: "0.3" },
  { path: "/gallery", changefreq: "weekly", priority: "0.6" },
  { path: "/website-links", changefreq: "monthly", priority: "0.5" },
  { path: "/worldcup", changefreq: "weekly", priority: "0.6" },
];

async function main() {
  const entries: Entry[] = [...staticEntries];
  const url = process.env.SUPABASE_URL || process.env.VITE_SUPABASE_URL;
  const key = process.env.SUPABASE_PUBLISHABLE_KEY || process.env.VITE_SUPABASE_PUBLISHABLE_KEY;
  if (url && key) {
    try {
      const sb = createClient(url, key);
      const { data: posts } = await sb.from("posts").select("slug,updated_at").eq("status", "published").limit(5000);
      posts?.forEach((p: any) => p?.slug && entries.push({
        path: `/post/${p.slug}`,
        lastmod: p.updated_at?.split("T")[0],
        changefreq: "weekly",
        priority: "0.8",
      }));
      const { data: cats } = await sb.from("categories").select("slug").limit(500);
      cats?.forEach((c: any) => c?.slug && entries.push({
        path: `/category/${c.slug}`, changefreq: "weekly", priority: "0.7",
      }));
    } catch (e) { console.warn("sitemap: DB fetch failed", (e as Error).message); }
  }

  const urls = entries.map(e => [
    "  <url>",
    `    <loc>${BASE_URL}${e.path}</loc>`,
    e.lastmod && `    <lastmod>${e.lastmod}</lastmod>`,
    e.changefreq && `    <changefreq>${e.changefreq}</changefreq>`,
    e.priority && `    <priority>${e.priority}</priority>`,
    "  </url>",
  ].filter(Boolean).join("\n"));

  const xml = [
    `<?xml version="1.0" encoding="UTF-8"?>`,
    `<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">`,
    ...urls,
    `</urlset>`,
  ].join("\n");
  writeFileSync(resolve("public/sitemap.xml"), xml);
  console.log(`sitemap.xml written (${entries.length} entries)`);
}

main().catch(err => { console.error(err); process.exit(0); });
