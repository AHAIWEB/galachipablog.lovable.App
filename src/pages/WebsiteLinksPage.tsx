import { useState, useMemo } from "react";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import SiteHeader from "@/components/SiteHeader";
import SiteFooter from "@/components/SiteFooter";
import { ExternalLink, Search, Globe } from "lucide-react";

const BENGALI_LETTERS = ["অ","আ","ই","উ","এ","ও","ক","খ","গ","ঘ","চ","জ","ট","ড","ঢ","ত","দ","ন","প","ফ","ব","ভ","ম","য","র","ল","শ","স","হ"];
const ENGLISH_LETTERS = "ABCDEFGHIJKLMNOPQRSTUVWXYZ".split("");

export default function WebsiteLinksPage() {
  const [activeTab, setActiveTab] = useState<string>("all");
  const [search, setSearch] = useState("");
  const [letterFilter, setLetterFilter] = useState<string>("");

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

  // Group by category
  const tabs = useMemo(() => {
    const catMap = new Map<string, { name: string; count: number }>();
    links.forEach(l => {
      const catName = (l as any).categories?.name || "অন্যান্য";
      if (!catMap.has(catName)) catMap.set(catName, { name: catName, count: 0 });
      catMap.get(catName)!.count++;
    });
    return [{ name: "সকল", count: links.length }, ...Array.from(catMap.values())];
  }, [links]);

  // Available letters
  const availableLetters = useMemo(() => {
    const letters = new Set(links.map(l => l.letter).filter(Boolean));
    return [...BENGALI_LETTERS, ...ENGLISH_LETTERS].filter(l => letters.has(l));
  }, [links]);

  // Filter
  const filtered = useMemo(() => {
    let result = links;
    if (activeTab !== "all" && activeTab !== "সকল") {
      result = result.filter(l => (l as any).categories?.name === activeTab);
    }
    if (letterFilter) {
      result = result.filter(l => l.letter === letterFilter);
    }
    if (search) {
      const s = search.toLowerCase();
      result = result.filter(l => l.title.toLowerCase().includes(s) || l.url.toLowerCase().includes(s));
    }
    return result;
  }, [links, activeTab, letterFilter, search]);

  return (
    <div className="min-h-screen flex flex-col">
      <SiteHeader />

      <main className="flex-1 container mx-auto px-4 py-6">
        <div className="text-center mb-6">
          <h1 className="font-heading font-bold text-2xl md:text-3xl">🌐 ওয়েবসাইট ডিরেক্টরি</h1>
          <p className="text-muted-foreground text-sm mt-1">বাংলাদেশ ও বিশ্বের গুরুত্বপূর্ণ ওয়েবসাইট সমূহ</p>
        </div>

        {/* Search */}
        <div className="relative max-w-md mx-auto mb-6">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
          <input
            type="text"
            value={search}
            onChange={e => setSearch(e.target.value)}
            placeholder="ওয়েবসাইট খুঁজুন..."
            className="w-full pl-10 pr-4 py-2.5 rounded-xl border border-input bg-background text-sm focus:outline-none focus:ring-2 focus:ring-ring"
          />
        </div>

        {/* Category Tabs */}
        <div className="flex flex-wrap gap-1.5 justify-center mb-4">
          {tabs.map(tab => (
            <button
              key={tab.name}
              onClick={() => { setActiveTab(tab.name === "সকল" ? "all" : tab.name); setLetterFilter(""); }}
              className={`px-3 py-1.5 rounded-lg text-xs font-medium transition-colors ${
                (activeTab === "all" && tab.name === "সকল") || activeTab === tab.name
                  ? "bg-primary text-primary-foreground"
                  : "bg-muted text-muted-foreground hover:bg-muted/80"
              }`}
            >
              {tab.name} <span className="opacity-70">({tab.count})</span>
            </button>
          ))}
        </div>

        {/* Letter Filter */}
        {availableLetters.length > 0 && (
          <div className="flex flex-wrap gap-1 justify-center mb-6">
            <button
              onClick={() => setLetterFilter("")}
              className={`w-7 h-7 rounded text-xs font-bold transition-colors ${
                !letterFilter ? "bg-primary text-primary-foreground" : "bg-muted hover:bg-muted/80"
              }`}
            >
              সব
            </button>
            {availableLetters.map(l => (
              <button
                key={l}
                onClick={() => setLetterFilter(l === letterFilter ? "" : l)}
                className={`w-7 h-7 rounded text-xs font-bold transition-colors ${
                  letterFilter === l ? "bg-primary text-primary-foreground" : "bg-muted hover:bg-muted/80"
                }`}
              >
                {l}
              </button>
            ))}
          </div>
        )}

        {/* Links Grid with logos */}
        <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 xl:grid-cols-6 gap-3">
          {filtered.map(link => (
            <a
              key={link.id}
              href={link.url}
              target="_blank"
              rel="noopener noreferrer"
              className="flex flex-col items-center gap-2 p-4 rounded-xl border border-border bg-card hover:shadow-md hover:border-primary/30 transition-all group text-center"
            >
              {link.favicon_url ? (
                <img
                  src={link.favicon_url}
                  alt=""
                  className="w-10 h-10 rounded-lg object-contain"
                  onError={e => { (e.target as HTMLImageElement).src = ""; (e.target as HTMLImageElement).style.display = "none"; }}
                />
              ) : (
                <div className="w-10 h-10 rounded-lg bg-muted flex items-center justify-center">
                  <Globe className="h-5 w-5 text-muted-foreground" />
                </div>
              )}
              <span className="text-xs font-medium leading-snug group-hover:text-primary transition-colors line-clamp-2">
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

        <p className="text-center text-xs text-muted-foreground mt-8">
          মোট {filtered.length}টি ওয়েবসাইট
        </p>
      </main>

      <SiteFooter />
    </div>
  );
}
