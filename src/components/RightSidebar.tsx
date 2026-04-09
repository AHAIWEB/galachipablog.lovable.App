import { useState, useEffect } from "react";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { Link } from "react-router-dom";
import { CreditCard } from "lucide-react";
import AdSlot from "@/components/AdSlot";
import PhotoGalleryWidget from "@/components/PhotoGalleryWidget";
import WebsiteLinksWidget from "@/components/WebsiteLinksWidget";

function DirectoryWidget() {
  const { data: dirPosts = [] } = useQuery({
    queryKey: ["directory-sidebar"],
    queryFn: async () => {
      const { data: cats } = await supabase.from("categories").select("id").eq("type", "directory");
      if (!cats || cats.length === 0) return [];
      const { data } = await supabase
        .from("posts")
        .select("id, title, slug, categories(name)")
        .eq("status", "published")
        .in("category_id", cats.map(c => c.id))
        .order("created_at", { ascending: false })
        .limit(8);
      return data ?? [];
    },
  });

  return (
    <div className="bg-card rounded-xl border border-border overflow-hidden shadow-sm">
      <div className="px-3 py-2.5 bg-accent text-accent-foreground border-b border-border">
        <h3 className="font-heading font-bold text-sm">📂 ইনডেক্স লিস্ট</h3>
      </div>
      <div className="divide-y divide-border stagger-fade">
        {dirPosts.length === 0 ? (
          <p className="p-3 text-xs text-muted-foreground">ডিরেক্টরি পোস্ট নেই</p>
        ) : (
          dirPosts.map(entry => (
            <Link key={entry.id} to={`/post/${entry.slug}`} className="block p-3 hover:bg-muted/50 transition-all duration-200 group">
              <p className="text-sm font-medium font-heading group-hover:text-primary transition-colors">{entry.title}</p>
              {(entry as any).categories?.name && (
                <span className="tag-directory mt-1 inline-block">{(entry as any).categories.name}</span>
              )}
            </Link>
          ))
        )}
      </div>
    </div>
  );
}

function BusinessCardWidget() {
  const [cardIdx, setCardIdx] = useState(0);
  const { data: cards = [] } = useQuery({
    queryKey: ["approved-cards"],
    queryFn: async () => {
      const { data } = await supabase.from("business_cards").select("*").eq("status", "approved").order("created_at", { ascending: false }).limit(10);
      return data ?? [];
    },
  });

  useEffect(() => {
    if (cards.length <= 1) return;
    const timer = setInterval(() => setCardIdx(p => (p + 1) % cards.length), 4000);
    return () => clearInterval(timer);
  }, [cards.length]);

  return (
    <div className="bg-card rounded-xl border border-border overflow-hidden shadow-sm">
      <div className="px-3 py-2.5 bg-primary text-primary-foreground border-b border-border">
        <h3 className="font-heading font-bold text-sm">🗂 বিজনেস কার্ড</h3>
      </div>
      {cards.length > 0 ? (
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
      ) : (
        <div className="p-4 text-center">
          <p className="text-xs text-muted-foreground">অনুমোদিত কার্ড নেই</p>
        </div>
      )}
    </div>
  );
}

function AdWidget() {
  return (
    <div className="bg-card rounded-xl border border-border overflow-hidden shadow-sm">
      <div className="px-3 py-2 bg-muted/50 border-b border-border">
        <h3 className="font-heading font-bold text-xs text-muted-foreground">📢 বিজ্ঞাপন</h3>
      </div>
      <div className="p-2"><AdSlot placement="sidebar" limit={3} /></div>
    </div>
  );
}

function WidgetRenderer({ widget }: { widget: any }) {
  switch (widget.widget_type) {
    case "directory_index": return <DirectoryWidget />;
    case "business_cards": return <BusinessCardWidget />;
    case "photo_gallery": return <PhotoGalleryWidget />;
    case "website_links": return <WebsiteLinksWidget />;
    case "ad_slot": return <AdWidget />;
    default: return null;
  }
}

export default function RightSidebar() {
  const { data: widgets } = useQuery({
    queryKey: ["sidebar-widgets", "right"],
    queryFn: async () => {
      const { data } = await supabase
        .from("sidebar_widgets")
        .select("*")
        .eq("sidebar", "right")
        .eq("is_active", true)
        .order("sort_order");
      return data;
    },
  });

  // Default layout if no widgets configured
  if (!widgets || widgets.length === 0) {
    return (
      <div className="space-y-4">
        <AdWidget />
        <DirectoryWidget />
        <BusinessCardWidget />
        <PhotoGalleryWidget />
        <WebsiteLinksWidget />
        <div className="bg-card rounded-xl border border-border overflow-hidden shadow-sm">
          <div className="p-4 text-center space-y-2">
            <CreditCard className="h-8 w-8 mx-auto text-primary" />
            <h3 className="font-heading font-bold text-sm">🗂 ডিজিটাল বিজনেস কার্ড</h3>
            <p className="text-xs text-muted-foreground">আপনার বিজনেস কার্ড তৈরি করুন বিনামূল্যে!</p>
            <Link to="/profile" className="inline-flex items-center gap-1.5 px-4 py-2 rounded-lg bg-primary text-primary-foreground text-xs font-medium hover:bg-primary/90 transition-colors">
              <CreditCard className="h-3.5 w-3.5" /> কার্ড তৈরি করুন
            </Link>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-4">
      {widgets.map(w => (
        <WidgetRenderer key={w.id} widget={w} />
      ))}
    </div>
  );
}
