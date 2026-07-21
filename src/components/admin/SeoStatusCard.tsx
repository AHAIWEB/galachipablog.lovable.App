import { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { Search, RefreshCw, ExternalLink, Loader2 } from "lucide-react";
import { toast } from "sonner";

/**
 * SEO status: sitemap URL count / last-modified, one-click reindex.
 * Talks to the `seo-reindex` edge function which pings sitemap
 * endpoints + (if the Search Console connector is linked) resubmits
 * the sitemap and inspects a URL.
 */
export default function SeoStatusCard() {
  const [busy, setBusy] = useState(false);
  const [inspectUrl, setInspectUrl] = useState("");

  const { data: sitemap, refetch } = useQuery({
    queryKey: ["sitemap-meta"],
    queryFn: async () => {
      const res = await fetch("/sitemap.xml", { cache: "no-store" });
      const text = await res.text();
      const count = (text.match(/<loc>/g) ?? []).length;
      const lastMod = res.headers.get("last-modified") || "";
      return { count, lastMod, size: text.length };
    },
    staleTime: 60_000,
  });

  const runReindex = async () => {
    setBusy(true);
    try {
      const { data, error } = await supabase.functions.invoke("seo-reindex", {
        body: inspectUrl ? { url: inspectUrl } : {},
      });
      if (error) throw error;
      toast.success("Sitemap resubmitted & search engines pinged");
      console.log("[seo-reindex]", data);
      refetch();
    } catch (e: any) {
      toast.error(e.message || "Reindex failed");
    }
    setBusy(false);
  };

  return (
    <div className="bg-card rounded-xl border border-border p-5 mb-6">
      <div className="flex items-center gap-2 mb-3">
        <Search className="h-4 w-4 text-primary" />
        <h2 className="font-heading font-bold text-base">SEO স্ট্যাটাস</h2>
      </div>

      <div className="grid grid-cols-3 gap-3 mb-4">
        <div className="p-3 rounded-lg bg-muted/50 border border-border">
          <p className="text-[10px] text-muted-foreground">Sitemap URLs</p>
          <p className="text-xl font-heading font-bold">{sitemap?.count ?? "…"}</p>
        </div>
        <div className="p-3 rounded-lg bg-muted/50 border border-border">
          <p className="text-[10px] text-muted-foreground">সাইজ (bytes)</p>
          <p className="text-xl font-heading font-bold">{sitemap?.size ?? "…"}</p>
        </div>
        <div className="p-3 rounded-lg bg-muted/50 border border-border">
          <p className="text-[10px] text-muted-foreground">Last-Modified</p>
          <p className="text-xs font-medium truncate">{sitemap?.lastMod || "—"}</p>
        </div>
      </div>

      <div className="flex flex-wrap gap-2 items-center">
        <input
          value={inspectUrl}
          onChange={e => setInspectUrl(e.target.value)}
          placeholder="Optional: URL to inspect (https://…/post/slug)"
          className="flex-1 min-w-[220px] px-3 py-2 rounded-lg border border-input bg-background text-xs"
        />
        <button
          onClick={runReindex}
          disabled={busy}
          className="inline-flex items-center gap-1.5 px-3 py-2 rounded-lg bg-primary text-primary-foreground text-xs font-medium hover:opacity-90 disabled:opacity-50"
        >
          {busy ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <RefreshCw className="h-3.5 w-3.5" />}
          Reindex / Resubmit sitemap
        </button>
        <a
          href="https://search.google.com/search-console"
          target="_blank" rel="noopener noreferrer"
          className="inline-flex items-center gap-1 px-3 py-2 rounded-lg bg-muted text-xs hover:bg-muted/70"
        >
          <ExternalLink className="h-3.5 w-3.5" /> Search Console
        </a>
        <a
          href="/sitemap.xml"
          target="_blank" rel="noopener noreferrer"
          className="inline-flex items-center gap-1 px-3 py-2 rounded-lg bg-muted text-xs hover:bg-muted/70"
        >
          <ExternalLink className="h-3.5 w-3.5" /> Sitemap
        </a>
      </div>
      <p className="text-[10px] text-muted-foreground mt-2">
        Note: Google's ping endpoint is deprecated — real reindex needs the Search Console connector (auto-used if linked).
      </p>
    </div>
  );
}
