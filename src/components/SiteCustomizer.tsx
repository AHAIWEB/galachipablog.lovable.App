import { useEffect } from "react";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";

/**
 * Fetches public site_settings and injects them as CSS variables
 * + document title/description so admin changes reflect live.
 */
export default function SiteCustomizer() {
  const { data } = useQuery({
    queryKey: ["public-site-settings"],
    queryFn: async () => {
      const { data } = await supabase.from("site_settings").select("key,value");
      const map: Record<string, string> = {};
      data?.forEach((s: any) => { if (s?.key) map[s.key] = s.value ?? ""; });
      return map;
    },
    staleTime: 60_000,
    refetchOnWindowFocus: true,
  });

  useEffect(() => {
    if (!data) return;
    const root = document.documentElement;
    const hexToHsl = (hex: string): string | null => {
      const m = hex?.trim().match(/^#?([a-f\d]{6})$/i);
      if (!m) return null;
      const n = parseInt(m[1], 16);
      const r = ((n >> 16) & 255) / 255, g = ((n >> 8) & 255) / 255, b = (n & 255) / 255;
      const max = Math.max(r, g, b), min = Math.min(r, g, b);
      let h = 0, s = 0; const l = (max + min) / 2;
      if (max !== min) {
        const d = max - min;
        s = l > 0.5 ? d / (2 - max - min) : d / (max + min);
        switch (max) {
          case r: h = (g - b) / d + (g < b ? 6 : 0); break;
          case g: h = (b - r) / d + 2; break;
          case b: h = (r - g) / d + 4; break;
        }
        h *= 60;
      }
      return `${Math.round(h)} ${Math.round(s * 100)}% ${Math.round(l * 100)}%`;
    };
    const setVar = (name: string, hex?: string) => {
      const hsl = hex ? hexToHsl(hex) : null;
      if (hsl) root.style.setProperty(name, hsl);
    };
    setVar("--primary", data.primary_color);
    setVar("--secondary", data.secondary_color);
    setVar("--accent", data.accent_color);
    setVar("--header-bg", data.header_bg_color);
    setVar("--footer-bg", data.footer_bg_color);

    if (data.heading_font) root.style.setProperty("--font-heading", `"${data.heading_font}", sans-serif`);
    if (data.body_font) root.style.setProperty("--font-body", `"${data.body_font}", sans-serif`);
    if (data.base_font_size) root.style.setProperty("font-size", `${parseInt(data.base_font_size) || 16}px`);

    if (data.site_name) document.title = data.site_tagline
      ? `${data.site_name} — ${data.site_tagline}`
      : data.site_name;
    if (data.site_description) {
      let m = document.querySelector('meta[name="description"]');
      if (!m) { m = document.createElement("meta"); m.setAttribute("name", "description"); document.head.appendChild(m); }
      m.setAttribute("content", data.site_description);
    }
    if (data.site_keywords) {
      let m = document.querySelector('meta[name="keywords"]');
      if (!m) { m = document.createElement("meta"); m.setAttribute("name", "keywords"); document.head.appendChild(m); }
      m.setAttribute("content", data.site_keywords);
    }
    if (data.favicon_url) {
      let l = document.querySelector('link[rel="icon"]') as HTMLLinkElement | null;
      if (!l) { l = document.createElement("link"); l.rel = "icon"; document.head.appendChild(l); }
      l.href = data.favicon_url;
    }
  }, [data]);

  return null;
}
