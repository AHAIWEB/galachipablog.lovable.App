import { useState, useEffect, useRef, useCallback } from "react";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { Link } from "react-router-dom";
import { loadCache, saveCache } from "@/lib/postCache";

const PAGE_SIZE = 12;


const aspectClasses = [
  "aspect-[3/4]",
  "aspect-square",
  "aspect-video",
  "aspect-[4/5]",
  "aspect-[3/2]",
  "aspect-square",
  "aspect-video",
  "aspect-[3/4]",
  "aspect-[4/3]",
  "aspect-square",
  "aspect-[3/4]",
  "aspect-video",
];

export default function MasonryGrid() {
  const queryClient = useQueryClient();
  const [page, setPage] = useState(1);
  const [allPosts, setAllPosts] = useState<any[]>([]);
  const [hasMore, setHasMore] = useState(true);
  const loaderRef = useRef<HTMLDivElement>(null);

  // Realtime subscription - auto-refresh when new posts are published
  useEffect(() => {
    const channel = supabase
      .channel('posts-realtime')
      .on('postgres_changes', { event: '*', schema: 'public', table: 'posts' }, () => {
        queryClient.invalidateQueries({ queryKey: ["masonry-posts"] });
        setAllPosts([]);
        setPage(1);
        setHasMore(true);
      })
      .subscribe();
    return () => { supabase.removeChannel(channel); };
  }, [queryClient]);

  const { data, isFetching } = useQuery({
    queryKey: ["masonry-posts", page],
    queryFn: async () => {
      const from = (page - 1) * PAGE_SIZE;
      const { data } = await supabase
        .from("posts")
        .select("id, title, featured_image, slug, excerpt, categories(name, type)")
        .eq("status", "published")
        .order("created_at", { ascending: false })
        .range(from, from + PAGE_SIZE - 1);
      return data ?? [];
    },
    staleTime: 60000,
  });

  useEffect(() => {
    if (data) {
      if (data.length < PAGE_SIZE) setHasMore(false);
      setAllPosts(prev => {
        const ids = new Set(prev.map(p => p.id));
        const newPosts = data.filter(p => !ids.has(p.id));
        return [...prev, ...newPosts];
      });
    }
  }, [data]);

  const loadMore = useCallback(() => {
    if (!isFetching && hasMore) setPage(p => p + 1);
  }, [isFetching, hasMore]);

  useEffect(() => {
    const el = loaderRef.current;
    if (!el) return;
    const observer = new IntersectionObserver(
      entries => { if (entries[0].isIntersecting) loadMore(); },
      { rootMargin: "200px" }
    );
    observer.observe(el);
    return () => observer.disconnect();
  }, [loadMore]);

  if (allPosts.length === 0 && isFetching) {
    return (
      <div className="text-center py-8 text-muted-foreground text-sm">
        পোস্ট লোড হচ্ছে...
      </div>
    );
  }

  if (allPosts.length === 0) return null;

  return (
    <>
      {/* True Pinterest-style CSS columns masonry */}
      <div className="columns-2 sm:columns-2 md:columns-3 lg:columns-3 xl:columns-4 gap-3 [column-fill:_balance] stagger-fade">
        {allPosts.map((post, i) => {
          const catName = (post as any).categories?.name;
          const catType = (post as any).categories?.type;
          // Vary heights for true masonry feel
          const heights = ["h-48", "h-64", "h-56", "h-72", "h-52", "h-60", "h-44", "h-80"];
          const h = heights[i % heights.length];

          return (
            <Link
              key={post.id}
              to={`/post/${post.slug}`}
              className="mb-3 break-inside-avoid block rounded-xl overflow-hidden group hover-lift bg-card border border-border shadow-sm"
            >
              <div className={`relative ${h} w-full overflow-hidden`}>
                <img
                  src={post.featured_image || "https://images.unsplash.com/photo-1506744038136-46273834b3fb?w=600&h=600&fit=crop"}
                  alt={post.title}
                  className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-500"
                  loading="lazy"
                />
                <div className="absolute inset-0 bg-gradient-to-t from-foreground/70 via-transparent to-transparent opacity-0 group-hover:opacity-100 transition-opacity" />
                {catName && (
                  <span className={`absolute top-2 left-2 ${catType === "news" ? "tag-news" : catType === "blog" ? "tag-blog" : "tag-directory"}`}>
                    {catName}
                  </span>
                )}
              </div>
              <div className="p-3">
                <h3 className="text-sm font-heading font-bold leading-snug line-clamp-2 group-hover:text-primary transition-colors">
                  {post.title}
                </h3>
                {post.excerpt && (
                  <p className="text-xs text-muted-foreground mt-1 line-clamp-2">{post.excerpt}</p>
                )}
              </div>
            </Link>
          );
        })}
      </div>

      {/* Infinite scroll trigger */}
      <div ref={loaderRef} className="py-4 text-center">
        {isFetching && <span className="text-sm text-muted-foreground">আরও লোড হচ্ছে...</span>}
        {!hasMore && allPosts.length > 0 && (
          <span className="text-xs text-muted-foreground">সব পোস্ট দেখানো হয়েছে</span>
        )}
      </div>
    </>
  );
}
