import { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { Link } from "react-router-dom";
import PhotoGalleryWidget from "@/components/PhotoGalleryWidget";
import WebsiteLinksWidget from "@/components/WebsiteLinksWidget";
import AdSlot from "@/components/AdSlot";

const tabs = [
  { id: "latest", label: "সর্বশেষ" },
  { id: "news", label: "খবর" },
  { id: "blog", label: "ব্লগ" },
] as const;

function PostListWidget({ filterType }: { filterType?: string }) {
  const [activeTab, setActiveTab] = useState<string>(filterType || "latest");
  const shownTabs = filterType ? [] : tabs;

  const { data: posts = [] } = useQuery({
    queryKey: ["sidebar-posts", activeTab],
    queryFn: async () => {
      let query = supabase
        .from("posts")
        .select("id, title, slug, categories(name, type)")
        .eq("status", "published")
        .order("created_at", { ascending: false })
        .limit(10);

      if (activeTab !== "latest") {
        const { data: catIds } = await supabase
          .from("categories")
          .select("id")
          .eq("type", activeTab as "news" | "blog" | "directory");
        if (catIds && catIds.length > 0) {
          query = query.in("category_id", catIds.map(c => c.id));
        }
      }

      const { data } = await query;
      return data ?? [];
    },
  });

  return (
    <div className="bg-card rounded-xl border border-border overflow-hidden shadow-sm">
      {shownTabs.length > 0 && (
        <div className="flex border-b border-border">
          {shownTabs.map(tab => (
            <button
              key={tab.id}
              onClick={() => setActiveTab(tab.id)}
              className={`flex-1 py-2.5 text-sm font-heading font-semibold transition-all duration-200 ${
                activeTab === tab.id
                  ? "bg-primary text-primary-foreground"
                  : "text-muted-foreground hover:bg-muted hover:text-foreground"
              }`}
            >
              {tab.label}
            </button>
          ))}
        </div>
      )}
      <div className="divide-y divide-border stagger-fade">
        {posts.length === 0 ? (
          <p className="p-3 text-sm text-muted-foreground">কোনো পোস্ট নেই</p>
        ) : (
          posts.map((post, i) => {
            const catType = (post as any).categories?.type;
            const catName = (post as any).categories?.name;
            return (
              <Link key={post.id} to={`/post/${post.slug}`} className="block p-3 hover:bg-muted/50 transition-all duration-200 group">
                <div className="flex gap-2 items-start">
                  <span className="text-xs font-bold text-muted-foreground/50 mt-0.5 shrink-0 w-5">{String(i + 1).padStart(2, '0')}</span>
                  <div>
                    <h4 className="text-sm font-heading font-medium leading-snug group-hover:text-primary transition-colors">
                      {post.title}
                    </h4>
                    {catName && (
                      <span className={`${catType === "news" ? "tag-news" : catType === "blog" ? "tag-blog" : "tag-directory"} mt-1.5 inline-block`}>
                        {catName}
                      </span>
                    )}
                  </div>
                </div>
              </Link>
            );
          })
        )}
      </div>
    </div>
  );
}

function WidgetRenderer({ widget }: { widget: any }) {
  switch (widget.widget_type) {
    case "latest_posts":
      return <PostListWidget />;
    case "news_posts":
      return <PostListWidget filterType="news" />;
    case "blog_posts":
      return <PostListWidget filterType="blog" />;
    case "photo_gallery":
      return <PhotoGalleryWidget />;
    case "website_links":
      return <WebsiteLinksWidget />;
    case "ad_slot":
      return (
        <div className="bg-card rounded-xl border border-border overflow-hidden shadow-sm">
          <div className="px-3 py-2 bg-muted/50 border-b border-border">
            <h3 className="font-heading font-bold text-xs text-muted-foreground">📢 বিজ্ঞাপন</h3>
          </div>
          <div className="p-2"><AdSlot placement="sidebar" limit={3} /></div>
        </div>
      );
    default:
      return null;
  }
}

export default function LeftSidebar() {
  const { data: widgets } = useQuery({
    queryKey: ["sidebar-widgets", "left"],
    queryFn: async () => {
      const { data } = await supabase
        .from("sidebar_widgets")
        .select("*")
        .eq("sidebar", "left")
        .eq("is_active", true)
        .order("sort_order");
      return data;
    },
  });

  // If no widgets configured, show default
  if (!widgets || widgets.length === 0) {
    return <PostListWidget />;
  }

  return (
    <div className="space-y-4">
      {widgets.map(w => (
        <WidgetRenderer key={w.id} widget={w} />
      ))}
    </div>
  );
}
