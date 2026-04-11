import { useState, useMemo } from "react";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import SiteHeader from "@/components/SiteHeader";
import SiteFooter from "@/components/SiteFooter";
import { Search, Globe } from "lucide-react";

export default function WebsiteLinksPage() {
  const [activeTab, setActiveTab] = useState<string>("all");
  const [search, setSearch] = useState("");

  const { data: links = [] } = useQuery({
    queryKey: ["all-website-links"],
    queryFn: async () => {
      const { data } = await supabase
        .from("website_links")
        .select("*, categories(name, type)")
        .eq("status", "active")
        .order("sort_order")
        .order("title");
      return data ?? [];
    },
    staleTime: 5 * 60 * 1000,
  });

  const { data: categories = [] } = useQuery({
    queryKey: ["link-categories"],
    queryFn: async () => {
      const { data } = await supabase
        .from("categories")
        .select("id, name, type")
        .eq("type", "directory")
        .is("deleted_at", null)
        .order("sort_order");
      return data ?? [];
    },
  });

  // Group by category for tabs
  const tabs = useMemo(() => {
    const catMap = new Map<string, { name: string; count: number }>();
    links.forEach(l => {
      const catName = (l as any).categories?.name || "অন্যান্য";
      if (!catMap.has(catName)) catMap.set(catName, { name: catName, count: 0 });
      catMap.get(catName)!.count++;
    });
    return [{ name: "সকল", count: links.length }, ...Array.from(catMap.values())];
  }, [links]);

  // Filter
  const filtered = useMemo(() => {
    let result = links;
    if (activeTab !== "all" && activeTab !== "সকল") {
      result = result.filter(l => (l as any).categories?.name === activeTab);
    }
    if (search) {
      const s = search.toLowerCase();
      result = result.filter(l => l.title.toLowerCase().includes(s) || l.url.toLowerCase().includes(s));
    }
    return result;
  }, [links, activeTab, search]);

  return (
    <div className="min-h-screen flex flex-col">
      <SiteHeader />

      <main className="flex-1 container mx-auto px-4 py-6">
        {/* Header */}
        <div className="mb-6">
          <h1 className="font-heading font-bold text-xl md:text-2xl">
            | <span className="text-primary">ওয়েবসাইট ডিরেক্টরি</span>
          </h1>
        </div>

        {/* Search */}
        <div className="relative max-w-sm mb-5">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
          <input
            type="text"
            value={search}
            onChange={e => setSearch(e.target.value)}
            placeholder="ওয়েবসাইট খুঁজুন..."
            className="w-full pl-10 pr-4 py-2 rounded-lg border border-input bg-background text-sm focus:outline-none focus:ring-2 focus:ring-ring"
          />
        </div>

        {/* Category Tabs */}
        <div className="flex flex-wrap gap-1.5 mb-5">
          {tabs.map(tab => (
            <button
              key={tab.name}
              onClick={() => setActiveTab(tab.name === "সকল" ? "all" : tab.name)}
              className={`px-3 py-1.5 rounded text-xs font-medium transition-colors ${
                (activeTab === "all" && tab.name === "সকল") || activeTab === tab.name
                  ? "bg-primary text-primary-foreground"
                  : "bg-muted text-muted-foreground hover:bg-muted/80"
              }`}
            >
              {tab.name} ({tab.count})
            </button>
          ))}
        </div>

        {/* Links Grid - bordered logo cards like allbanglapaper.com */}
        <div className="grid grid-cols-3 sm:grid-cols-4 md:grid-cols-5 lg:grid-cols-6 gap-0">
          {filtered.map(link => (
            <a
              key={link.id}
              href={link.url}
              target="_blank"
              rel="noopener noreferrer"
              className="flex flex-col items-center justify-center gap-2 p-3 border border-border hover:bg-muted/50 transition-colors group text-center min-h-[100px]"
            >
              {link.favicon_url ? (
                <img
                  src={link.favicon_url}
                  alt={link.title}
                  className="h-8 max-w-[100px] object-contain"
                  onError={e => {
                    (e.target as HTMLImageElement).style.display = "none";
                    (e.target as HTMLImageElement).nextElementSibling?.classList.remove("hidden");
                  }}
                />
              ) : (
                <Globe className="h-6 w-6 text-muted-foreground" />
              )}
              <span className="text-[11px] font-medium leading-tight group-hover:text-primary transition-colors line-clamp-2">
                {link.title}
              </span>
            </a>
          ))}
        </div>

        {filtered.length === 0 && (
          <div className="text-center py-16 text-muted-foreground">
            <Globe className="h-12 w-12 mx-auto mb-3 opacity-30" />
            <p className="text-sm">কোনো ওয়েবসাইট পাওয়া যায়নি</p>
          </div>
        )}

        <p className="text-center text-xs text-muted-foreground mt-6">
          মোট {filtered.length}টি ওয়েবসাইট
        </p>
      </main>

      <SiteFooter />
    </div>
  );
}
