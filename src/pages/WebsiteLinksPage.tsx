import { useState, useMemo } from "react";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import SiteHeader from "@/components/SiteHeader";
import SiteFooter from "@/components/SiteFooter";
import { Search, Globe, Send } from "lucide-react";
import { toast } from "sonner";

export default function WebsiteLinksPage() {
  const [activeTab, setActiveTab] = useState<string>("all");
  const [search, setSearch] = useState("");
  const [submitUrl, setSubmitUrl] = useState("");
  const [submitTitle, setSubmitTitle] = useState("");
  const [submitting, setSubmitting] = useState(false);

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
  const grouped = useMemo(() => {
    const catMap = new Map<string, { name: string; links: typeof links }>();
    links.forEach(l => {
      const catName = (l as any).categories?.name || "অন্যান্য";
      if (!catMap.has(catName)) catMap.set(catName, { name: catName, links: [] });
      catMap.get(catName)!.links.push(l);
    });
    return Array.from(catMap.values());
  }, [links]);

  // Tabs
  const tabs = useMemo(() => {
    return [
      { name: "সকল", key: "all", count: links.length },
      ...grouped.map(g => ({ name: g.name, key: g.name, count: g.links.length })),
    ];
  }, [links, grouped]);

  // Filter
  const filteredGroups = useMemo(() => {
    let result = grouped;
    if (activeTab !== "all") {
      result = result.filter(g => g.name === activeTab);
    }
    if (search) {
      const s = search.toLowerCase();
      result = result.map(g => ({
        ...g,
        links: g.links.filter(l => l.title.toLowerCase().includes(s) || l.url.toLowerCase().includes(s)),
      })).filter(g => g.links.length > 0);
    }
    return result;
  }, [grouped, activeTab, search]);

  const totalFiltered = filteredGroups.reduce((sum, g) => sum + g.links.length, 0);

  const handleSubmitLink = async () => {
    if (!submitUrl || !submitTitle) {
      toast.error("লিংক এবং নাম দিন");
      return;
    }
    setSubmitting(true);
    try {
      let favicon_url = "";
      try {
        const domain = new URL(submitUrl).hostname;
        favicon_url = `https://www.google.com/s2/favicons?domain=${domain}&sz=64`;
      } catch {}
      const { error } = await supabase.from("website_links").insert({
        title: submitTitle,
        url: submitUrl,
        favicon_url,
        status: "active",
      });
      if (error) throw error;
      toast.success("লিংক সাবমিট হয়েছে!");
      setSubmitUrl("");
      setSubmitTitle("");
    } catch (e: any) {
      toast.error(e.message || "সাবমিট করা যায়নি");
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className="min-h-screen flex flex-col bg-background">
      <SiteHeader />

      <main className="flex-1 container mx-auto px-4 py-6">
        {/* Header */}
        <div className="mb-6 text-center">
          <h1 className="font-heading font-bold text-2xl md:text-3xl text-foreground">
            ওয়েবসাইট ডিরেক্টরি
          </h1>
          <p className="text-muted-foreground text-sm mt-1">বাংলাদেশের জনপ্রিয় ওয়েবসাইট সমূহ</p>
        </div>

        {/* Search + Submit */}
        <div className="flex flex-col sm:flex-row gap-3 mb-6 max-w-2xl mx-auto">
          <div className="relative flex-1">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
            <input
              type="text"
              value={search}
              onChange={e => setSearch(e.target.value)}
              placeholder="ওয়েবসাইট খুঁজুন..."
              className="w-full pl-10 pr-4 py-2.5 rounded-lg border border-input bg-background text-sm focus:outline-none focus:ring-2 focus:ring-ring"
            />
          </div>
        </div>

        {/* Category Tabs */}
        <div className="flex flex-wrap gap-1.5 mb-6 justify-center">
          {tabs.map(tab => (
            <button
              key={tab.key}
              onClick={() => setActiveTab(tab.key)}
              className={`px-3 py-1.5 rounded text-xs font-medium transition-colors ${
                activeTab === tab.key
                  ? "bg-primary text-primary-foreground"
                  : "bg-muted text-muted-foreground hover:bg-muted/80"
              }`}
            >
              {tab.name} ({tab.count})
            </button>
          ))}
        </div>

        {/* Links grouped by category - reference image style */}
        {filteredGroups.map(group => (
          <div key={group.name} className="mb-8">
            {/* Category Header */}
            <div className="bg-primary text-primary-foreground text-center py-2.5 px-4 rounded-t-lg">
              <h2 className="font-heading font-bold text-sm md:text-base">{group.name}</h2>
            </div>
            
            {/* Links Grid - 2 columns with logo cards */}
            <div className="grid grid-cols-1 sm:grid-cols-2 border-x border-b border-border rounded-b-lg overflow-hidden bg-card">
              {group.links.map((link, idx) => (
                <a
                  key={link.id}
                  href={link.url}
                  target="_blank"
                  rel="noopener noreferrer"
                  className={`flex flex-col items-center justify-center gap-3 p-5 border-b border-border hover:bg-muted/50 transition-colors group text-center ${
                    idx % 2 === 0 ? "sm:border-r" : ""
                  }`}
                >
                  {link.favicon_url ? (
                    <img
                      src={link.favicon_url}
                      alt={link.title}
                      className="h-10 max-w-[160px] object-contain"
                      onError={e => {
                        (e.target as HTMLImageElement).style.display = "none";
                      }}
                    />
                  ) : (
                    <Globe className="h-8 w-8 text-muted-foreground" />
                  )}
                  <span className="text-sm font-medium leading-tight group-hover:text-primary transition-colors">
                    {link.title}
                  </span>
                </a>
              ))}
            </div>
          </div>
        ))}

        {totalFiltered === 0 && (
          <div className="text-center py-16 text-muted-foreground">
            <Globe className="h-12 w-12 mx-auto mb-3 opacity-30" />
            <p className="text-sm">কোনো ওয়েবসাইট পাওয়া যায়নি</p>
          </div>
        )}

        <p className="text-center text-xs text-muted-foreground mt-4 mb-8">
          মোট {totalFiltered}টি ওয়েবসাইট
        </p>

        {/* Submit Link Form */}
        <div className="max-w-lg mx-auto bg-card border border-border rounded-xl p-5">
          <h3 className="font-heading font-bold text-base mb-3 text-center">🔗 ওয়েবসাইট লিংক সাবমিট করুন</h3>
          <div className="space-y-3">
            <input
              type="text"
              value={submitTitle}
              onChange={e => setSubmitTitle(e.target.value)}
              placeholder="ওয়েবসাইটের নাম"
              className="w-full px-4 py-2.5 rounded-lg border border-input bg-background text-sm focus:outline-none focus:ring-2 focus:ring-ring"
            />
            <input
              type="url"
              value={submitUrl}
              onChange={e => setSubmitUrl(e.target.value)}
              placeholder="https://example.com"
              className="w-full px-4 py-2.5 rounded-lg border border-input bg-background text-sm focus:outline-none focus:ring-2 focus:ring-ring"
            />
            <button
              onClick={handleSubmitLink}
              disabled={submitting}
              className="w-full flex items-center justify-center gap-2 px-4 py-2.5 bg-primary text-primary-foreground rounded-lg font-medium text-sm hover:bg-primary/90 transition-colors disabled:opacity-50"
            >
              <Send className="h-4 w-4" />
              {submitting ? "সাবমিট হচ্ছে..." : "সাবমিট করুন"}
            </button>
          </div>
        </div>
      </main>

      <SiteFooter />
    </div>
  );
}
