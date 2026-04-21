import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { FileText, Users, CreditCard, Eye, Layout, Link2, Rss, Archive, ExternalLink, Download, Code2 } from "lucide-react";

export default function AdminDashboard() {
  const { data: postCount } = useQuery({
    queryKey: ["admin-post-count"],
    queryFn: async () => {
      const { count } = await supabase.from("posts").select("*", { count: "exact", head: true });
      return count ?? 0;
    },
  });

  const { data: cardCount } = useQuery({
    queryKey: ["admin-card-count"],
    queryFn: async () => {
      const { count } = await supabase.from("business_cards").select("*", { count: "exact", head: true });
      return count ?? 0;
    },
  });

  const { data: categoryCount } = useQuery({
    queryKey: ["admin-category-count"],
    queryFn: async () => {
      const { count } = await supabase.from("categories").select("*", { count: "exact", head: true });
      return count ?? 0;
    },
  });

  const { data: widgetCount } = useQuery({
    queryKey: ["admin-widget-count"],
    queryFn: async () => {
      const { count } = await supabase.from("sidebar_widgets").select("*", { count: "exact", head: true });
      return count ?? 0;
    },
  });

  const { data: linkCount } = useQuery({
    queryKey: ["admin-link-count"],
    queryFn: async () => {
      const { count } = await supabase.from("website_links").select("*", { count: "exact", head: true });
      return count ?? 0;
    },
  });

  const { data: feedCount } = useQuery({
    queryKey: ["admin-feed-count"],
    queryFn: async () => {
      const { count } = await supabase.from("feed_sources").select("*", { count: "exact", head: true }).eq("is_active", true);
      return count ?? 0;
    },
  });

  const { data: archiveCount } = useQuery({
    queryKey: ["admin-archive-count"],
    queryFn: async () => {
      const { count } = await supabase.from("archived_contents").select("*", { count: "exact", head: true });
      return count ?? 0;
    },
  });

  const { data: widgets = [] } = useQuery({
    queryKey: ["admin-widgets-summary"],
    queryFn: async () => {
      const { data } = await supabase.from("sidebar_widgets").select("title, widget_type, sidebar, is_active").order("sidebar").order("sort_order");
      return data ?? [];
    },
  });

  const { data: recentActivity } = useQuery({
    queryKey: ["admin-recent-activity"],
    queryFn: async () => {
      const { data } = await supabase
        .from("activity_log")
        .select("*")
        .order("created_at", { ascending: false })
        .limit(10);
      return data ?? [];
    },
  });

  const { data: fetchedArticles = [] } = useQuery({
    queryKey: ["admin-fetched-articles-dash"],
    queryFn: async () => {
      const { data } = await supabase
        .from("fetched_articles")
        .select("id, title, status, created_at, featured_image, feed_sources(name)")
        .order("created_at", { ascending: false })
        .limit(10);
      return data ?? [];
    },
  });

  const stats = [
    { label: "মোট পোস্ট", value: postCount ?? 0, icon: FileText, color: "bg-primary" },
    { label: "ক্যাটাগরি", value: categoryCount ?? 0, icon: Users, color: "bg-secondary" },
    { label: "বিজনেস কার্ড", value: cardCount ?? 0, icon: CreditCard, color: "bg-accent" },
    { label: "সাইডবার উইজেট", value: widgetCount ?? 0, icon: Layout, color: "bg-primary" },
    { label: "ওয়েবসাইট লিংক", value: linkCount ?? 0, icon: Link2, color: "bg-secondary" },
    { label: "ফিড সোর্স", value: feedCount ?? 0, icon: Rss, color: "bg-accent" },
    { label: "আর্কাইভ কন্টেন্ট", value: archiveCount ?? 0, icon: Archive, color: "bg-muted" },
    { label: "ভিজিটর", value: "—", icon: Eye, color: "bg-muted" },
  ];

  const leftWidgets = widgets.filter(w => w.sidebar === "left");
  const rightWidgets = widgets.filter(w => w.sidebar === "right");

  return (
    <div>
      <h1 className="font-heading font-bold text-2xl mb-6">📊 ড্যাশবোর্ড</h1>

      {/* Blogger Theme Download Card */}
      <div className="bg-gradient-to-r from-orange-500 to-red-500 text-white rounded-xl p-5 mb-6 shadow-lg">
        <div className="flex items-start justify-between gap-4 flex-wrap">
          <div className="flex-1 min-w-[240px]">
            <h2 className="font-heading font-bold text-lg flex items-center gap-2 mb-1">
              <Code2 className="h-5 w-5" /> Blogger.com Theme (.xml)
            </h2>
            <p className="text-sm opacity-95 leading-relaxed">
              এই সাইটের পুরো ডিজাইন (header, masonry grid, sidebar widgets, this-day, gallery) সহ Blogger XML থিম ডাউনলোড করুন। Blogger Dashboard → Theme → Backup/Restore → Upload করুন। সব ডাটা Supabase API থেকে লাইভ লোড হবে।
            </p>
          </div>
          <div className="flex flex-col gap-2">
            <a
              href="/galachipa-blogger-theme.xml"
              download="galachipa-blogger-theme.xml"
              className="inline-flex items-center gap-2 px-4 py-2.5 bg-white text-orange-600 rounded-lg font-heading font-bold text-sm hover:bg-orange-50 transition-colors shadow"
            >
              <Download className="h-4 w-4" /> XML ডাউনলোড
            </a>
            <a
              href="https://www.blogger.com/"
              target="_blank"
              rel="noopener noreferrer"
              className="inline-flex items-center justify-center gap-1.5 px-4 py-2 bg-white/15 hover:bg-white/25 backdrop-blur rounded-lg text-xs transition-colors"
            >
              <ExternalLink className="h-3.5 w-3.5" /> Blogger খুলুন
            </a>
          </div>
        </div>
        <div className="mt-3 pt-3 border-t border-white/20 grid grid-cols-2 sm:grid-cols-4 gap-2 text-xs">
          <span className="bg-white/15 rounded px-2 py-1 text-center">✓ Masonry Grid</span>
          <span className="bg-white/15 rounded px-2 py-1 text-center">✓ Mega Menu</span>
          <span className="bg-white/15 rounded px-2 py-1 text-center">✓ This-Day Widget</span>
          <span className="bg-white/15 rounded px-2 py-1 text-center">✓ Photo Gallery</span>
        </div>
      </div>

      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4 mb-8">
        {stats.map(s => (
          <div key={s.label} className="bg-card rounded-xl border border-border p-4">
            <div className={`inline-flex p-2 rounded-lg ${s.color} text-primary-foreground mb-2`}>
              <s.icon className="h-4 w-4" />
            </div>
            <p className="text-2xl font-heading font-bold">{s.value}</p>
            <p className="text-xs text-muted-foreground">{s.label}</p>
          </div>
        ))}
      </div>

      {/* Sidebar Widgets Summary */}
      <div className="grid md:grid-cols-2 gap-4 mb-8">
        {(["left", "right"] as const).map(side => {
          const list = side === "left" ? leftWidgets : rightWidgets;
          return (
            <div key={side} className="bg-card rounded-xl border border-border">
              <div className="px-4 py-2.5 border-b border-border bg-muted">
                <h3 className="font-heading font-semibold text-sm">
                  {side === "left" ? "📰 বাম সাইডবার" : "📂 ডান সাইডবার"} ({list.length})
                </h3>
              </div>
              <div className="divide-y divide-border">
                {list.length > 0 ? list.map((w, i) => (
                  <div key={i} className={`px-4 py-2 flex items-center justify-between text-sm ${!w.is_active ? "opacity-40" : ""}`}>
                    <span>{w.title}</span>
                    <span className={`text-[10px] px-1.5 py-0.5 rounded ${w.is_active ? "bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-300" : "bg-muted text-muted-foreground"}`}>
                      {w.is_active ? "সক্রিয়" : "নিষ্ক্রিয়"}
                    </span>
                  </div>
                )) : (
                  <p className="p-4 text-xs text-muted-foreground">কোনো উইজেট নেই</p>
                )}
              </div>
            </div>
          );
        })}
      </div>

      {/* Fetched Articles */}
      <div className="bg-card rounded-xl border border-border mb-8">
        <div className="px-4 py-2.5 border-b border-border bg-muted">
          <h3 className="font-heading font-semibold text-sm">⚡ সর্বশেষ ফেচ করা পোস্ট ({fetchedArticles.length})</h3>
        </div>
        <div className="divide-y divide-border">
          {fetchedArticles.length > 0 ? fetchedArticles.map(a => (
            <div key={a.id} className="px-4 py-2.5 flex items-center gap-3">
              {a.featured_image && (
                <img src={a.featured_image} alt="" className="w-10 h-8 object-cover rounded shrink-0" />
              )}
              <div className="flex-1 min-w-0">
                <p className="text-sm font-medium truncate">{a.title}</p>
                <p className="text-[10px] text-muted-foreground">
                  {(a as any).feed_sources?.name} • {a.status} • {new Date(a.created_at).toLocaleString("bn-BD")}
                </p>
              </div>
              <span className={`text-[10px] px-1.5 py-0.5 rounded shrink-0 ${a.status === 'published' ? 'bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-300' : 'bg-yellow-100 text-yellow-700 dark:bg-yellow-900/30 dark:text-yellow-300'}`}>
                {a.status === 'published' ? 'প্রকাশিত' : 'অপেক্ষায়'}
              </span>
            </div>
          )) : (
            <p className="p-4 text-xs text-muted-foreground">কোনো ফেচ করা আর্টিকেল নেই</p>
          )}
        </div>
      </div>

      <div className="bg-card rounded-xl border border-border">
        <div className="px-4 py-3 border-b border-border">
          <h2 className="font-heading font-semibold">সর্বশেষ অ্যাক্টিভিটি</h2>
        </div>
        <div className="divide-y divide-border">
          {recentActivity && recentActivity.length > 0 ? (
            recentActivity.map(a => (
              <div key={a.id} className="px-4 py-3 text-sm">
                <span className="font-medium">{a.action}</span>
                {a.entity_type && (
                  <span className="text-muted-foreground"> — {a.entity_type}</span>
                )}
                <span className="text-xs text-muted-foreground block mt-0.5">
                  {new Date(a.created_at).toLocaleString("bn-BD")}
                </span>
              </div>
            ))
          ) : (
            <p className="p-4 text-sm text-muted-foreground">এখনো কোনো অ্যাক্টিভিটি নেই</p>
          )}
        </div>
      </div>
    </div>
  );
}
