import { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { Link } from "react-router-dom";

const tabs = [
  { id: "latest", label: "সর্বশেষ" },
  { id: "news", label: "খবর" },
  { id: "blog", label: "ব্লগ" },
] as const;

export default function LeftSidebar() {
  const [activeTab, setActiveTab] = useState<string>("latest");

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
    <div className="widget-card widget-tone-default">
      <div className="widget-header">
        <span className="widget-icon">📌</span>
        <div className="flex-1 min-w-0">
          <h3 className="widget-title">পোস্ট সমূহ</h3>
          <div className="widget-title-bar" />
        </div>
      </div>
      <div className="flex border-b border-border bg-muted/30">
        {tabs.map(tab => (
          <button
            key={tab.id}
            onClick={() => setActiveTab(tab.id)}
            className={`flex-1 py-2 text-xs font-heading font-semibold transition-all duration-200 relative ${
              activeTab === tab.id
                ? "text-primary"
                : "text-muted-foreground hover:text-foreground"
            }`}
          >
            {tab.label}
            {activeTab === tab.id && (
              <span className="absolute bottom-0 left-1/2 -translate-x-1/2 w-8 h-0.5 bg-primary rounded-t-full" />
            )}
          </button>
        ))}
      </div>

      <div className="divide-y divide-border/60 stagger-fade">
        {posts.length === 0 ? (
          <p className="p-3 text-sm text-muted-foreground">কোনো পোস্ট নেই</p>
        ) : (
          posts.map((post, i) => {
            const catType = (post as any).categories?.type;
            const catName = (post as any).categories?.name;
            return (
              <Link key={post.id} to={`/post/${post.slug}`} className="widget-row group">
                <span className="widget-index">{String(i + 1).padStart(2, '0')}</span>
                <div className="flex-1 min-w-0">
                  <h4 className="text-sm font-heading font-medium leading-snug group-hover:text-primary transition-colors line-clamp-2">
                    {post.title}
                  </h4>
                  {catName && (
                    <span className={`${catType === "news" ? "tag-news" : catType === "blog" ? "tag-blog" : "tag-directory"} mt-1.5 inline-block`}>
                      {catName}
                    </span>
                  )}
                </div>
              </Link>
            );
          })
        )}
      </div>
    </div>
  );
}
