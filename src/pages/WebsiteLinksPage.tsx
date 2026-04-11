import { useState, useMemo } from "react";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import SiteHeader from "@/components/SiteHeader";
import SiteFooter from "@/components/SiteFooter";
import { Search, Globe, Send, ExternalLink } from "lucide-react";
import { toast } from "sonner";

export default function WebsiteLinksPage() {
  const [search, setSearch] = useState("");
  const [letterFilter, setLetterFilter] = useState("");
  const [submitUrl, setSubmitUrl] = useState("");
  const [submitTitle, setSubmitTitle] = useState("");
  const [submitLogo, setSubmitLogo] = useState("");
  const [submitting, setSubmitting] = useState(false);

  const { data: links = [] } = useQuery({
    queryKey: ["all-website-links"],
    queryFn: async () => {
      const { data } = await supabase
        .from("website_links")
        .select("*, categories(name)")
        .eq("status", "active")
        .order("title");
      return data ?? [];
    },
    staleTime: 5 * 60 * 1000,
  });

  // Letter filters from data
  const letters = useMemo(() => {
    return [...new Set(links.map(l => l.letter).filter(Boolean))].sort();
  }, [links]);

  // Filtered links
  const filtered = useMemo(() => {
    let items = links;
    if (letterFilter) items = items.filter(l => l.letter === letterFilter);
    if (search) {
      const s = search.toLowerCase();
      items = items.filter(l => l.title.toLowerCase().includes(s) || l.url.toLowerCase().includes(s));
    }
    return items;
  }, [links, letterFilter, search]);

  const handleSubmitLink = async () => {
    if (!submitUrl || !submitTitle) {
      toast.error("লিংক এবং নাম দিন");
      return;
    }
    setSubmitting(true);
    try {
      let favicon_url = submitLogo.trim();
      if (!favicon_url) {
        try {
          let url = submitUrl.trim();
          if (!url.startsWith("http")) url = "https://" + url;
          const domain = new URL(url).hostname;
          favicon_url = `https://www.google.com/s2/favicons?domain=${domain}&sz=64`;
        } catch {}
      }
      const { error } = await supabase.from("website_links").insert({
        title: submitTitle,
        url: submitUrl.startsWith("http") ? submitUrl : `https://${submitUrl}`,
        favicon_url,
        status: "pending",
      });
      if (error) throw error;
      toast.success("লিংক সাবমিট হয়েছে! অ্যাডমিন অনুমোদনের পর দেখা যাবে।");
      setSubmitUrl("");
      setSubmitTitle("");
      setSubmitLogo("");
    } catch (e: any) {
      toast.error(e.message || "সাবমিট করা যায়নি");
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className="min-h-screen flex flex-col bg-background">
      <SiteHeader />

      <main className="flex-1 container mx-auto px-3 py-6">
        {/* Header */}
        <div className="mb-5 text-center">
          <h1 className="font-heading font-bold text-2xl md:text-3xl text-foreground">
            🌐 ওয়েবসাইট ডিরেক্টরি
          </h1>
          <p className="text-muted-foreground text-sm mt-1">বাংলাদেশের জনপ্রিয় ওয়েবসাইট সমূহ</p>
        </div>

        {/* Search */}
        <div className="max-w-xl mx-auto mb-4">
          <div className="relative">
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

        {/* Letter Filter */}
        {letters.length > 0 && (
          <div className="flex flex-wrap gap-1 mb-5 justify-center">
            <button
              onClick={() => setLetterFilter("")}
              className={`px-2.5 py-1 rounded text-xs font-medium ${
                !letterFilter ? "bg-primary text-primary-foreground" : "bg-muted text-muted-foreground hover:bg-muted/80"
              }`}
            >
              সব
            </button>
            {letters.map(l => (
              <button
                key={l}
                onClick={() => setLetterFilter(l)}
                className={`px-2.5 py-1 rounded text-xs font-medium ${
                  letterFilter === l ? "bg-primary text-primary-foreground" : "bg-muted text-muted-foreground hover:bg-muted/80"
                }`}
              >
                {l}
              </button>
            ))}
          </div>
        )}

        {/* Links Table */}
        <div className="bg-card border border-border rounded-xl overflow-hidden mb-8">
          <div className="bg-primary text-primary-foreground text-center py-2.5 px-4">
            <h2 className="font-heading font-bold text-sm">
              ওয়েবসাইট তালিকা ({filtered.length})
            </h2>
          </div>

          {filtered.length > 0 ? (
            <div className="grid grid-cols-1 sm:grid-cols-2">
              {filtered.map((link, idx) => (
                <a
                  key={link.id}
                  href={link.url}
                  target="_blank"
                  rel="noopener noreferrer"
                  className={`flex items-center gap-3 px-4 py-3 border-b border-border hover:bg-muted/50 transition-colors group ${
                    idx % 2 === 0 ? "sm:border-r" : ""
                  }`}
                >
                  {/* Logo */}
                  <div className="w-8 h-8 shrink-0 flex items-center justify-center">
                    {link.favicon_url ? (
                      <img
                        src={link.favicon_url}
                        alt=""
                        className="w-8 h-8 rounded object-contain"
                        onError={e => {
                          (e.target as HTMLImageElement).src = "";
                          (e.target as HTMLImageElement).style.display = "none";
                          (e.target as HTMLImageElement).parentElement!.innerHTML =
                            '<svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" class="text-muted-foreground"><circle cx="12" cy="12" r="10"/><path d="M2 12h20"/><path d="M12 2a15.3 15.3 0 0 1 4 10 15.3 15.3 0 0 1-4 10 15.3 15.3 0 0 1-4-10 15.3 15.3 0 0 1 4-10z"/></svg>';
                        }}
                      />
                    ) : (
                      <Globe className="h-5 w-5 text-muted-foreground" />
                    )}
                  </div>

                  {/* Title & URL */}
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-medium truncate group-hover:text-primary transition-colors">
                      {link.title}
                    </p>
                    <p className="text-xs text-muted-foreground truncate">{link.url}</p>
                  </div>

                  <ExternalLink className="h-3.5 w-3.5 text-muted-foreground shrink-0 opacity-0 group-hover:opacity-100 transition-opacity" />
                </a>
              ))}
            </div>
          ) : (
            <div className="text-center py-12 text-muted-foreground">
              <Globe className="h-10 w-10 mx-auto mb-2 opacity-30" />
              <p className="text-sm">কোনো ওয়েবসাইট পাওয়া যায়নি</p>
            </div>
          )}
        </div>

        {/* Submit Link Form */}
        <div className="max-w-lg mx-auto bg-card border border-border rounded-xl p-5 mb-8">
          <h3 className="font-heading font-bold text-base mb-3 text-center">🔗 আপনার ওয়েবসাইট সাবমিট করুন</h3>
          <div className="space-y-3">
            <input
              type="text"
              value={submitTitle}
              onChange={e => setSubmitTitle(e.target.value)}
              placeholder="ওয়েবসাইটের নাম *"
              className="w-full px-4 py-2.5 rounded-lg border border-input bg-background text-sm focus:outline-none focus:ring-2 focus:ring-ring"
            />
            <input
              type="url"
              value={submitUrl}
              onChange={e => setSubmitUrl(e.target.value)}
              placeholder="https://example.com *"
              className="w-full px-4 py-2.5 rounded-lg border border-input bg-background text-sm focus:outline-none focus:ring-2 focus:ring-ring"
            />
            <input
              type="url"
              value={submitLogo}
              onChange={e => setSubmitLogo(e.target.value)}
              placeholder="লোগো URL (ঐচ্ছিক) — https://example.com/logo.png"
              className="w-full px-4 py-2.5 rounded-lg border border-input bg-background text-sm focus:outline-none focus:ring-2 focus:ring-ring"
            />
            <button
              onClick={handleSubmitLink}
              disabled={submitting || !submitTitle || !submitUrl}
              className="w-full flex items-center justify-center gap-2 px-4 py-2.5 bg-primary text-primary-foreground rounded-lg font-medium text-sm hover:bg-primary/90 transition-colors disabled:opacity-50"
            >
              <Send className="h-4 w-4" />
              {submitting ? "সাবমিট হচ্ছে..." : "সাবমিট করুন"}
            </button>
            <p className="text-xs text-muted-foreground text-center">
              সাবমিট করা লিংক অ্যাডমিন অনুমোদনের পর দেখা যাবে
            </p>
          </div>
        </div>
      </main>

      <SiteFooter />
    </div>
  );
}
