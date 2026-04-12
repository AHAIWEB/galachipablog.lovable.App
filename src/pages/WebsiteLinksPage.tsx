import { useState, useMemo } from "react";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import SiteHeader from "@/components/SiteHeader";
import SiteFooter from "@/components/SiteFooter";
import { Search, Globe, Send } from "lucide-react";
import { toast } from "sonner";

export default function WebsiteLinksPage() {
  const [search, setSearch] = useState("");
  const [submitUrl, setSubmitUrl] = useState("");
  const [submitTitle, setSubmitTitle] = useState("");
  const [submitLogo, setSubmitLogo] = useState("");
  const [submitting, setSubmitting] = useState(false);

  const { data: links = [] } = useQuery({
    queryKey: ["all-website-links"],
    queryFn: async () => {
      const { data } = await supabase
        .from("website_links")
        .select("*")
        .eq("status", "active")
        .order("sort_order")
        .order("title");
      return data ?? [];
    },
    staleTime: 5 * 60 * 1000,
  });

  const filtered = useMemo(() => {
    if (!search) return links;
    const s = search.toLowerCase();
    return links.filter(l => l.title.toLowerCase().includes(s) || l.url.toLowerCase().includes(s));
  }, [links, search]);

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
        <div className="mb-5 text-center">
          <h1 className="font-heading font-bold text-2xl md:text-3xl text-foreground">
            🌐 বাংলাদেশের সকল পত্রিকা ও ওয়েবসাইট
          </h1>
          <p className="text-muted-foreground text-sm mt-1">বাংলাদেশের জনপ্রিয় পত্রিকা, নিউজ পোর্টাল ও ওয়েবসাইট সমূহ</p>
        </div>

        {/* Search */}
        <div className="max-w-xl mx-auto mb-6">
          <div className="relative">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
            <input
              type="text"
              value={search}
              onChange={e => setSearch(e.target.value)}
              placeholder="পত্রিকা বা ওয়েবসাইট খুঁজুন..."
              className="w-full pl-10 pr-4 py-2.5 rounded-lg border border-input bg-background text-sm focus:outline-none focus:ring-2 focus:ring-ring"
            />
          </div>
        </div>

        {/* Logo Grid - like allbanglapaper.com */}
        <div className="bg-card border border-border rounded-xl overflow-hidden mb-8">
          <div className="bg-primary text-primary-foreground text-center py-2.5 px-4">
            <h2 className="font-heading font-bold text-sm">
              বাংলাদেশের পত্রিকা ও ওয়েবসাইট ({filtered.length})
            </h2>
          </div>

          {filtered.length > 0 ? (
            <div className="grid grid-cols-3 sm:grid-cols-4 md:grid-cols-5 lg:grid-cols-6 xl:grid-cols-7">
              {filtered.map((link) => (
                <a
                  key={link.id}
                  href={link.url}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="flex flex-col items-center justify-center gap-2 p-4 border border-border/50 hover:bg-muted/50 hover:shadow-md transition-all group"
                >
                  <div className="w-16 h-12 flex items-center justify-center">
                    {link.favicon_url ? (
                      <img
                        src={link.favicon_url}
                        alt={link.title}
                        className="max-w-full max-h-full object-contain"
                        onError={e => {
                          (e.target as HTMLImageElement).style.display = "none";
                          (e.target as HTMLImageElement).parentElement!.innerHTML =
                            '<div class="w-12 h-12 rounded-full bg-muted flex items-center justify-center text-muted-foreground"><svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><circle cx="12" cy="12" r="10"/><path d="M2 12h20"/><path d="M12 2a15.3 15.3 0 0 1 4 10 15.3 15.3 0 0 1-4 10 15.3 15.3 0 0 1-4-10 15.3 15.3 0 0 1 4-10z"/></svg></div>';
                        }}
                      />
                    ) : (
                      <Globe className="h-8 w-8 text-muted-foreground" />
                    )}
                  </div>
                  <span className="text-xs text-center font-medium text-foreground group-hover:text-primary transition-colors leading-tight line-clamp-2">
                    {link.title}
                  </span>
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
          <h3 className="font-heading font-bold text-base mb-3 text-center">🔗 আপনার ওয়েবসাইট/পত্রিকা সাবমিট করুন</h3>
          <div className="space-y-3">
            <input
              type="text"
              value={submitTitle}
              onChange={e => setSubmitTitle(e.target.value)}
              placeholder="ওয়েবসাইট/পত্রিকার নাম *"
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
