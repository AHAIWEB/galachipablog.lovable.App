import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { Link } from "react-router-dom";
import { useState, useEffect } from "react";
import { CreditCard, ExternalLink, Calendar, ChevronLeft, ChevronRight } from "lucide-react";
import AdSlot from "@/components/AdSlot";
import { Link as RouterLink } from "react-router-dom";

type Widget = {
  id: string;
  title: string;
  widget_type: string;
  config: any;
  sidebar: string;
  sort_order: number;
  is_active: boolean;
};

function CategorySpecificPostsWidget({ config }: { config: any }) {
  const categoryId = config?.category_id;
  const limit = config?.limit || 5;
  const { data: posts = [] } = useQuery({
    queryKey: ["widget-cat-specific", categoryId, limit],
    queryFn: async () => {
      if (!categoryId) return [];
      const { data } = await supabase
        .from("posts")
        .select("id, title, slug, featured_image, categories(name)")
        .eq("status", "published")
        .eq("category_id", categoryId)
        .order("created_at", { ascending: false })
        .limit(limit);
      return data ?? [];
    },
    enabled: !!categoryId,
  });

  if (!categoryId) return <p className="p-3 text-xs text-muted-foreground">কনফিগে category_id দিন</p>;

  return (
    <div className="divide-y divide-border">
      {posts.map((p) => (
        <Link key={p.id} to={`/post/${p.slug}`} className="flex gap-2 p-2.5 hover:bg-muted/50 transition-colors group">
          {p.featured_image && (
            <img src={p.featured_image} alt="" className="w-14 h-10 object-cover rounded shrink-0" />
          )}
          <p className="text-xs font-heading font-medium leading-snug group-hover:text-primary transition-colors line-clamp-2 flex-1">{p.title}</p>
        </Link>
      ))}
      {posts.length === 0 && <p className="p-3 text-xs text-muted-foreground">পোস্ট নেই</p>}
    </div>
  );
}

function LatestPostsWidget({ config }: { config: any }) {
  const limit = config?.limit || 5;
  const { data: posts = [] } = useQuery({
    queryKey: ["widget-latest", limit],
    queryFn: async () => {
      const { data } = await supabase
        .from("posts")
        .select("id, title, slug, featured_image, categories(name, type)")
        .eq("status", "published")
        .order("created_at", { ascending: false })
        .limit(limit);
      return data ?? [];
    },
  });

  return (
    <div className="divide-y divide-border">
      {posts.map((p, i) => (
        <Link key={p.id} to={`/post/${p.slug}`} className="flex gap-2 p-2.5 hover:bg-muted/50 transition-colors group">
          {p.featured_image && (
            <img src={p.featured_image} alt="" className="w-14 h-10 object-cover rounded shrink-0" />
          )}
          <div className="flex-1 min-w-0">
            <h4 className="text-xs font-heading font-medium leading-snug group-hover:text-primary transition-colors line-clamp-2">{p.title}</h4>
            {(p as any).categories?.name && (
              <span className={`mt-0.5 inline-block text-[10px] px-1.5 py-0.5 rounded ${(p as any).categories?.type === 'news' ? 'bg-blue-100 text-blue-700 dark:bg-blue-900/30 dark:text-blue-300' : (p as any).categories?.type === 'blog' ? 'bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-300' : 'bg-purple-100 text-purple-700 dark:bg-purple-900/30 dark:text-purple-300'}`}>
                {(p as any).categories.name}
              </span>
            )}
          </div>
        </Link>
      ))}
      {posts.length === 0 && <p className="p-3 text-xs text-muted-foreground">কোনো পোস্ট নেই</p>}
    </div>
  );
}

function CategoryPostsWidget({ config, type }: { config: any; type: "news" | "blog" | "directory" }) {
  const limit = config?.limit || 5;
  const { data: posts = [] } = useQuery({
    queryKey: ["widget-cat-posts", type, limit],
    queryFn: async () => {
      const { data: cats } = await supabase.from("categories").select("id").eq("type", type);
      if (!cats || cats.length === 0) return [];
      const { data } = await supabase
        .from("posts")
        .select("id, title, slug, featured_image, categories(name)")
        .eq("status", "published")
        .in("category_id", cats.map(c => c.id))
        .order("created_at", { ascending: false })
        .limit(limit);
      return data ?? [];
    },
  });

  return (
    <div className="divide-y divide-border">
      {posts.map(p => (
        <Link key={p.id} to={`/post/${p.slug}`} className="flex gap-2 p-2.5 hover:bg-muted/50 transition-colors group">
          {p.featured_image && (
            <img src={p.featured_image} alt="" className="w-14 h-10 object-cover rounded shrink-0" />
          )}
          <p className="text-xs font-heading font-medium group-hover:text-primary transition-colors line-clamp-2 flex-1">{p.title}</p>
        </Link>
      ))}
      {posts.length === 0 && <p className="p-3 text-xs text-muted-foreground">পোস্ট নেই</p>}
    </div>
  );
}

function PhotoGalleryWidget({ config }: { config: any }) {
  const limit = config?.limit || 9;
  // source: "gallery" | "posts" | "mix" (default mix)
  const source = config?.source || "mix";
  const customLabel = config?.label;

  const { data: images = [] } = useQuery({
    queryKey: ["widget-gallery-mix", source, limit],
    queryFn: async () => {
      const results: { id: string; image_url: string; caption?: string | null; link?: string }[] = [];

      if (source === "gallery" || source === "mix") {
        const { data } = await supabase
          .from("post_images")
          .select("id, image_url, caption, post_id, posts(slug)")
          .order("created_at", { ascending: false })
          .limit(source === "mix" ? Math.ceil(limit / 2) : limit);
        (data || []).forEach((d: any) => results.push({
          id: `g-${d.id}`, image_url: d.image_url, caption: d.caption,
          link: d.posts?.slug ? `/post/${d.posts.slug}` : undefined,
        }));
      }

      if (source === "posts" || source === "mix") {
        const { data } = await supabase
          .from("posts")
          .select("id, slug, title, featured_image")
          .eq("status", "published")
          .not("featured_image", "is", null)
          .order("created_at", { ascending: false })
          .limit(source === "mix" ? Math.ceil(limit / 2) : limit);
        (data || []).forEach((p: any) => {
          if (p.featured_image) results.push({
            id: `p-${p.id}`, image_url: p.featured_image, caption: p.title,
            link: `/post/${p.slug}`,
          });
        });
      }

      // dedupe by image_url and trim
      const seen = new Set<string>();
      return results.filter(r => {
        if (seen.has(r.image_url)) return false;
        seen.add(r.image_url); return true;
      }).slice(0, limit);
    },
  });

  const [lightbox, setLightbox] = useState<string | null>(null);

  return (
    <>
      {customLabel && (
        <div className="px-3 py-1.5 text-[11px] text-muted-foreground border-b border-border bg-muted/30">{customLabel}</div>
      )}
      <div className="grid grid-cols-3 gap-1 p-2">
        {images.map(img => (
          img.link ? (
            <RouterLink key={img.id} to={img.link} className="aspect-square rounded overflow-hidden hover:opacity-80 transition-opacity relative group">
              <img src={img.image_url} alt={img.caption || ""} className="w-full h-full object-cover" loading="lazy" />
              {img.caption && (
                <div className="absolute inset-x-0 bottom-0 bg-gradient-to-t from-black/70 to-transparent p-1 opacity-0 group-hover:opacity-100 transition-opacity">
                  <p className="text-[9px] text-white line-clamp-2 leading-tight">{img.caption}</p>
                </div>
              )}
            </RouterLink>
          ) : (
            <button key={img.id} onClick={() => setLightbox(img.image_url)} className="aspect-square rounded overflow-hidden hover:opacity-80 transition-opacity">
              <img src={img.image_url} alt={img.caption || ""} className="w-full h-full object-cover" loading="lazy" />
            </button>
          )
        ))}
        {images.length === 0 && <p className="col-span-3 text-xs text-muted-foreground p-2">ছবি নেই</p>}
      </div>
      <RouterLink to="/gallery" className="block text-center text-xs text-primary hover:underline py-2 border-t border-border">
        সব ছবি দেখুন →
      </RouterLink>
      {lightbox && (
        <div className="fixed inset-0 z-50 bg-black/80 flex items-center justify-center p-4" onClick={() => setLightbox(null)}>
          <img src={lightbox} alt="" className="max-w-full max-h-full rounded-lg" />
        </div>
      )}
    </>
  );
}

function ThisDayWidget() {
  const today = new Date();
  const month = today.getMonth() + 1;
  const day = today.getDate();
  const [category, setCategory] = useState<string>("all");

  const { data: events = [] } = useQuery({
    queryKey: ["this-day-events", month, day],
    queryFn: async () => {
      const { data } = await supabase
        .from("this_day_events")
        .select("*")
        .eq("month", month)
        .eq("day", day)
        .order("year", { ascending: true })
        .limit(50);
      return (data ?? []) as any[];
    },
  });

  const bengaliMonths = ['জানুয়ারি', 'ফেব্রুয়ারি', 'মার্চ', 'এপ্রিল', 'মে', 'জুন', 'জুলাই', 'আগস্ট', 'সেপ্টেম্বর', 'অক্টোবর', 'নভেম্বর', 'ডিসেম্বর'];

  const categories = [...new Set(events.map((e: any) => e.category).filter(Boolean))];
  const filtered = category === "all" ? events : events.filter((e: any) => e.category === category);
  const categoryLabels: Record<string, string> = { historical: "ঘটনা", birth: "জন্ম", death: "মৃত্যু" };

  return (
    <div>
      <div className="px-3 py-2 bg-muted/50 border-b border-border flex items-center gap-2">
        <Calendar className="h-4 w-4 text-primary" />
        <span className="text-xs font-medium text-muted-foreground">
          {day} {bengaliMonths[month - 1]}
        </span>
        <span className="text-[10px] text-muted-foreground ml-auto">({events.length}টি)</span>
      </div>
      {categories.length > 1 && (
        <div className="flex gap-1 px-2 py-1.5 border-b border-border bg-muted/30">
          <button onClick={() => setCategory("all")} className={`px-2 py-0.5 rounded text-[10px] ${category === "all" ? "bg-primary text-primary-foreground" : "bg-muted"}`}>সব</button>
          {categories.map(c => (
            <button key={c} onClick={() => setCategory(c)} className={`px-2 py-0.5 rounded text-[10px] ${category === c ? "bg-primary text-primary-foreground" : "bg-muted"}`}>
              {categoryLabels[c] || c}
            </button>
          ))}
        </div>
      )}
      <div className="divide-y divide-border max-h-72 overflow-y-auto">
        {filtered.length > 0 ? filtered.slice(0, 15).map((ev: any, i: number) => (
          <div key={ev.id || i} className="px-3 py-2">
            <p className="text-xs leading-relaxed">
              {ev.year && <span className="font-bold text-primary mr-1">{ev.year}:</span>}
              {ev.title}
            </p>
            {ev.category && ev.category !== "historical" && (
              <span className={`text-[9px] px-1 py-0.5 rounded mt-0.5 inline-block ${ev.category === "birth" ? "bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-300" : "bg-red-100 text-red-700 dark:bg-red-900/30 dark:text-red-300"}`}>
                {categoryLabels[ev.category] || ev.category}
              </span>
            )}
          </div>
        )) : (
          <p className="p-3 text-xs text-muted-foreground">আজকের কোনো ঘটনা নেই</p>
        )}
      </div>
    </div>
  );
}

function WebsiteLinksWidget({ config }: { config: any }) {
  const limit = config?.limit || 10;
  const { data: links = [] } = useQuery({
    queryKey: ["widget-links", limit],
    queryFn: async () => {
      const { data } = await supabase
        .from("website_links")
        .select("id, title, url, favicon_url, letter")
        .eq("status", "active")
        .order("sort_order")
        .limit(limit);
      return data ?? [];
    },
  });

  return (
    <div className="divide-y divide-border max-h-64 overflow-y-auto">
      {links.map(link => (
        <a key={link.id} href={link.url} target="_blank" rel="noopener" className="flex items-center gap-2 p-2.5 hover:bg-muted/50 transition-colors group">
          {link.favicon_url ? <img src={link.favicon_url} alt="" className="w-4 h-4 rounded shrink-0" /> : <ExternalLink className="h-4 w-4 text-muted-foreground shrink-0" />}
          <span className="text-sm truncate group-hover:text-primary transition-colors">{link.title}</span>
        </a>
      ))}
      {links.length === 0 && <p className="p-3 text-xs text-muted-foreground">লিংক নেই</p>}
    </div>
  );
}

function BusinessCardsWidget({ config }: { config: any }) {
  const [cardIdx, setCardIdx] = useState(0);
  const { data: cards = [] } = useQuery({
    queryKey: ["widget-bcards"],
    queryFn: async () => {
      const { data } = await supabase
        .from("business_cards")
        .select("*")
        .eq("status", "approved")
        .order("created_at", { ascending: false })
        .limit(10);
      return data ?? [];
    },
  });

  useEffect(() => {
    if (cards.length <= 1) return;
    const timer = setInterval(() => setCardIdx(p => (p + 1) % cards.length), 4000);
    return () => clearInterval(timer);
  }, [cards.length]);

  if (cards.length === 0) return <p className="p-4 text-center text-xs text-muted-foreground">অনুমোদিত কার্ড নেই</p>;

  return (
    <div className="p-3">
      <div className="w-full aspect-[16/9] rounded-xl bg-gradient-to-br from-primary via-primary/80 to-accent p-4 text-primary-foreground shadow-lg relative overflow-hidden">
        <div className="absolute top-0 right-0 w-24 h-24 bg-primary-foreground/10 rounded-full -translate-y-8 translate-x-8" />
        <div className="relative z-10 h-full flex flex-col justify-between">
          <div>
            <h4 className="font-heading font-bold text-sm">{cards[cardIdx]?.name}</h4>
            {cards[cardIdx]?.title && <p className="text-[10px] opacity-80">{cards[cardIdx].title}</p>}
            {cards[cardIdx]?.organization && <p className="text-[10px] opacity-80 font-medium">{cards[cardIdx].organization}</p>}
          </div>
          <div className="text-[10px] opacity-80 space-y-0.5">
            <p>📞 {cards[cardIdx]?.phone}</p>
            {cards[cardIdx]?.email && <p>✉ {cards[cardIdx].email}</p>}
            {cards[cardIdx]?.address && <p>📍 {cards[cardIdx].address}</p>}
          </div>
        </div>
      </div>
      {cards.length > 1 && (
        <div className="flex justify-center gap-1.5 mt-2">
          {cards.map((_, i) => (
            <button key={i} onClick={() => setCardIdx(i)} className={`h-1.5 rounded-full transition-all duration-300 ${i === cardIdx ? "bg-primary w-4" : "bg-muted-foreground/30 w-1.5"}`} />
          ))}
        </div>
      )}
    </div>
  );
}

function AdsWidget({ config }: { config: any }) {
  return (
    <div className="p-2">
      <AdSlot placement="sidebar" limit={config?.limit || 3} />
    </div>
  );
}

function CustomHtmlWidget({ config }: { config: any }) {
  if (!config?.html) return <p className="p-3 text-xs text-muted-foreground">HTML কনফিগ করা হয়নি</p>;
  return <div className="p-3 prose prose-sm max-w-none dark:prose-invert" dangerouslySetInnerHTML={{ __html: config.html }} />;
}

function WidgetRenderer({ widget }: { widget: Widget }) {
  const emojiMap: Record<string, string> = {
    latest_posts: "📰", news: "📰", blog: "💡", directory: "📂",
    photo_gallery: "📷", website_links: "🔗", business_cards: "🗂",
    ads: "📢", custom_html: "📝", this_day: "📅", category_posts: "📂",
  };

  const renderContent = () => {
    switch (widget.widget_type) {
      case "latest_posts": return <LatestPostsWidget config={widget.config} />;
      case "news": return <CategoryPostsWidget config={widget.config} type="news" />;
      case "blog": return <CategoryPostsWidget config={widget.config} type="blog" />;
      case "directory": return <CategoryPostsWidget config={widget.config} type="directory" />;
      case "category_posts": return <CategorySpecificPostsWidget config={widget.config} />;
      case "photo_gallery": return <PhotoGalleryWidget config={widget.config} />;
      case "website_links": return <WebsiteLinksWidget config={widget.config} />;
      case "business_cards": return <BusinessCardsWidget config={widget.config} />;
      case "ads": return <AdsWidget config={widget.config} />;
      case "this_day": return <ThisDayWidget />;
      case "custom_html": return <CustomHtmlWidget config={widget.config} />;
      default: return <p className="p-3 text-xs text-muted-foreground">অজানা উইজেট টাইপ</p>;
    }
  };

  return (
    <div className="bg-card rounded-xl border border-border overflow-hidden shadow-sm">
      <div className="px-3 py-2.5 bg-accent text-accent-foreground border-b border-border">
        <h3 className="font-heading font-bold text-sm">{emojiMap[widget.widget_type] || "📌"} {widget.title}</h3>
      </div>
      {renderContent()}
    </div>
  );
}

export default function DynamicSidebar({ side }: { side: "left" | "right" }) {
  const { data: widgets = [] } = useQuery({
    queryKey: ["sidebar-widgets-active", side],
    queryFn: async () => {
      const { data } = await supabase
        .from("sidebar_widgets")
        .select("*")
        .eq("sidebar", side)
        .eq("is_active", true)
        .order("sort_order");
      return (data ?? []) as Widget[];
    },
    staleTime: 2 * 60 * 1000,
  });

  if (widgets.length === 0) return null;

  return (
    <div className="space-y-4">
      {widgets.map(w => (
        <WidgetRenderer key={w.id} widget={w} />
      ))}
    </div>
  );
}
