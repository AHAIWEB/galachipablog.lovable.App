import { useState, useEffect, useRef, useCallback } from "react";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { Link } from "react-router-dom";

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
  const [page, setPage] = useState(1);
  const [allPosts, setAllPosts] = useState<any[]>([]);
  const [hasMore, setHasMore] = useState(true);
  const loaderRef = useRef<HTMLDivElement>(null);

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
    <div className="columns-1 sm:columns-2 lg:columns-3 gap-3 space-y-3 stagger-fade">
      {allPosts.map((post, i) => {
        const catName = (post as any).categories?.name;
        const catType = (post as any).categories?.type;
        const aspect = aspectClasses[i % aspectClasses.length];

        return (
          <Link
            key={post.id}
            to={`/post/${post.slug}`}
            className="relative block rounded-xl overflow-hidden group hover-lift break-inside-avoid mb-3"
          >
            <div className={aspect}>
              <img
                src={post.featured_image || "https://images.unsplash.com/photo-1506744038136-46273834b3fb?w=600&h=400&fit=crop"}
                alt={post.title}
                className="w-full h-full object-cover group-hover:scale-110 transition-transform duration-700"
                loading="lazy"
              />
            </div>
            <div className="absolute inset-0 bg-gradient-to-t from-foreground/70 via-transparent to-transparent" />
            <div className="absolute top-2 left-2">
              {catName && (
                <span className={catType === "news" ? "tag-news" : catType === "blog" ? "tag-blog" : "tag-directory"}>
                  {catName}
                </span>
              )}
            </div>
            <div className="absolute bottom-0 left-0 right-0 p-2.5">
              <h3 className="text-xs md:text-sm font-heading font-bold text-white leading-snug drop-shadow-lg line-clamp-2">
                {post.title}
              </h3>
            </div>
          </Link>
        );
      })}

      {/* Infinite scroll trigger */}
      <div ref={loaderRef} className="col-span-full py-4 text-center">
        {isFetching && <span className="text-sm text-muted-foreground">আরও লোড হচ্ছে...</span>}
        {!hasMore && allPosts.length > 0 && (
          <span className="text-xs text-muted-foreground">সব পোস্ট দেখানো হয়েছে</span>
        )}
      </div>
    </div>
  );
}
