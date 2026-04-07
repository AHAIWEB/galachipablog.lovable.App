import { useState } from "react";
import { useParams, Link } from "react-router-dom";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import SiteHeader from "@/components/SiteHeader";
import SiteFooter from "@/components/SiteFooter";
import { Calendar, Eye, ArrowLeft, Filter, ChevronLeft, ChevronRight } from "lucide-react";

const POSTS_PER_PAGE = 12;

export default function CategoryPage() {
  const { slug } = useParams<{ slug: string }>();
  const [page, setPage] = useState(1);
  const [sortBy, setSortBy] = useState<"newest" | "popular" | "oldest">("newest");

  const { data: category } = useQuery({
    queryKey: ["category", slug],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("categories")
        .select("*")
        .eq("slug", slug!)
        .maybeSingle();
      if (error) throw error;
      return data;
    },
    enabled: !!slug,
  });

  const { data: postsData, isLoading } = useQuery({
    queryKey: ["category-posts", category?.id, page, sortBy],
    queryFn: async () => {
      if (!category?.id) return { posts: [], count: 0 };
      
      let query = supabase
        .from("posts")
        .select("*, categories(name, type)", { count: "exact" })
        .eq("status", "published")
        .eq("category_id", category.id);

      if (sortBy === "newest") query = query.order("created_at", { ascending: false });
      else if (sortBy === "oldest") query = query.order("created_at", { ascending: true });
      else query = query.order("view_count", { ascending: false });

      const from = (page - 1) * POSTS_PER_PAGE;
      query = query.range(from, from + POSTS_PER_PAGE - 1);

      const { data, error, count } = await query;
      if (error) throw error;
      return { posts: data ?? [], count: count ?? 0 };
    },
    enabled: !!category?.id,
  });

  const totalPages = Math.ceil((postsData?.count ?? 0) / POSTS_PER_PAGE);
  const catType = category?.type;
  const tagClass = catType === "news" ? "tag-news" : catType === "blog" ? "tag-blog" : "tag-directory";

  return (
    <div className="min-h-screen flex flex-col">
      <SiteHeader />

      <main className="flex-1 container mx-auto px-4 py-6">
        {/* Breadcrumb */}
        <div className="flex items-center gap-2 text-sm text-muted-foreground mb-6">
          <Link to="/" className="hover:text-primary transition-colors flex items-center gap-1">
            <ArrowLeft className="h-3.5 w-3.5" /> হোম
          </Link>
          <span>/</span>
          <span className="text-foreground font-medium">{category?.name ?? "..."}</span>
        </div>

        {/* Header */}
        <div className="bg-card rounded-2xl border border-border p-6 mb-6 animate-slide-up">
          <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
            <div>
              {category && <span className={`${tagClass} mb-2 inline-block`}>{catType === "news" ? "📰 খবর" : catType === "blog" ? "💡 ব্লগ" : "📂 ডিরেক্টরি"}</span>}
              <h1 className="font-heading font-bold text-2xl md:text-3xl">{category?.name ?? "লোড হচ্ছে..."}</h1>
              <p className="text-muted-foreground text-sm mt-1">মোট {postsData?.count ?? 0}টি পোস্ট</p>
            </div>

            <div className="flex items-center gap-2">
              <Filter className="h-4 w-4 text-muted-foreground" />
              <select
                value={sortBy}
                onChange={e => { setSortBy(e.target.value as any); setPage(1); }}
                className="px-3 py-2 rounded-lg border border-input bg-background text-sm focus:outline-none focus:ring-2 focus:ring-ring"
              >
                <option value="newest">সর্বশেষ</option>
                <option value="popular">জনপ্রিয়</option>
                <option value="oldest">পুরাতন</option>
              </select>
            </div>
          </div>
        </div>

        {/* Posts Grid */}
        {isLoading ? (
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
            {Array.from({ length: 6 }).map((_, i) => (
              <div key={i} className="bg-card rounded-xl border border-border overflow-hidden animate-pulse">
                <div className="h-44 bg-muted" />
                <div className="p-4 space-y-2">
                  <div className="h-4 bg-muted rounded w-3/4" />
                  <div className="h-3 bg-muted rounded w-1/2" />
                </div>
              </div>
            ))}
          </div>
        ) : postsData && postsData.posts.length > 0 ? (
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4 stagger-fade">
            {postsData.posts.map(post => (
              <Link
                key={post.id}
                to={`/post/${post.slug}`}
                className="group bg-card rounded-xl border border-border overflow-hidden hover:shadow-lg transition-all duration-300 hover-lift"
              >
                {post.featured_image ? (
                  <div className="relative overflow-hidden">
                    <img
                      src={post.featured_image}
                      alt={post.title}
                      className="w-full h-44 object-cover group-hover:scale-105 transition-transform duration-500"
                      loading="lazy"
                    />
                    <div className="absolute inset-0 bg-gradient-to-t from-background/60 to-transparent opacity-0 group-hover:opacity-100 transition-opacity" />
                  </div>
                ) : (
                  <div className="h-44 bg-gradient-to-br from-muted to-muted/50 flex items-center justify-center">
                    <span className="text-4xl opacity-30">📄</span>
                  </div>
                )}
                <div className="p-4">
                  <h3 className="font-heading font-semibold text-sm leading-snug group-hover:text-primary transition-colors line-clamp-2">
                    {post.title}
                  </h3>
                  {post.excerpt && (
                    <p className="text-xs text-muted-foreground mt-2 line-clamp-2">{post.excerpt}</p>
                  )}
                  <div className="flex items-center gap-3 mt-3 text-xs text-muted-foreground">
                    <span className="flex items-center gap-1">
                      <Calendar className="h-3 w-3" />
                      {new Date(post.created_at).toLocaleDateString("bn-BD")}
                    </span>
                    <span className="flex items-center gap-1">
                      <Eye className="h-3 w-3" />
                      {post.view_count}
                    </span>
                  </div>
                </div>
              </Link>
            ))}
          </div>
        ) : (
          <div className="text-center py-16">
            <p className="text-4xl mb-4">📭</p>
            <p className="text-muted-foreground font-heading">এই ক্যাটাগরিতে এখনো কোনো পোস্ট নেই</p>
          </div>
        )}

        {/* Pagination */}
        {totalPages > 1 && (
          <div className="flex items-center justify-center gap-2 mt-8">
            <button
              onClick={() => setPage(p => Math.max(1, p - 1))}
              disabled={page === 1}
              className="flex items-center gap-1 px-3 py-2 rounded-lg border border-input bg-background text-sm hover:bg-muted disabled:opacity-40 transition-colors"
            >
              <ChevronLeft className="h-4 w-4" /> পূর্ববর্তী
            </button>
            
            {Array.from({ length: Math.min(totalPages, 7) }).map((_, i) => {
              let pageNum: number;
              if (totalPages <= 7) pageNum = i + 1;
              else if (page <= 4) pageNum = i + 1;
              else if (page >= totalPages - 3) pageNum = totalPages - 6 + i;
              else pageNum = page - 3 + i;

              return (
                <button
                  key={pageNum}
                  onClick={() => setPage(pageNum)}
                  className={`w-9 h-9 rounded-lg text-sm font-medium transition-colors ${
                    page === pageNum
                      ? "bg-primary text-primary-foreground"
                      : "border border-input bg-background hover:bg-muted"
                  }`}
                >
                  {pageNum}
                </button>
              );
            })}

            <button
              onClick={() => setPage(p => Math.min(totalPages, p + 1))}
              disabled={page === totalPages}
              className="flex items-center gap-1 px-3 py-2 rounded-lg border border-input bg-background text-sm hover:bg-muted disabled:opacity-40 transition-colors"
            >
              পরবর্তী <ChevronRight className="h-4 w-4" />
            </button>
          </div>
        )}
      </main>

      <SiteFooter />
    </div>
  );
}
