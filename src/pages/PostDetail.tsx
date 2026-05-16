import { useParams, Link } from "react-router-dom";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import SiteHeader from "@/components/SiteHeader";
import SiteFooter from "@/components/SiteFooter";
import CommentSection from "@/components/CommentSection";
import { Calendar, Eye, Share2, Facebook, Twitter, Link as LinkIcon, ArrowLeft, Bookmark, BookmarkCheck, ImagePlus, ExternalLink } from "lucide-react";
import { toast } from "sonner";
import { useAuth } from "@/contexts/AuthContext";
import { useState, useEffect } from "react";

export default function PostDetail() {
  const { user } = useAuth();
  const { slug } = useParams<{ slug: string }>();
  const [isBookmarked, setIsBookmarked] = useState(false);
  const [bookmarkLoading, setBookmarkLoading] = useState(false);

  const { data: post, isLoading } = useQuery({
    queryKey: ["post", slug],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("posts")
        .select("*, categories(name, type)")
        .eq("slug", slug!)
        .eq("status", "published")
        .maybeSingle();
      if (error) throw error;
      return data;
    },
    enabled: !!slug,
  });

  // Increment view count
  useQuery({
    queryKey: ["post-view", slug],
    queryFn: async () => {
      if (post?.id) {
        await supabase.rpc("has_role" as any); // dummy to avoid unused
        await supabase
          .from("posts")
          .update({ view_count: (post.view_count || 0) + 1 })
          .eq("id", post.id);
      }
      return null;
    },
    enabled: !!post?.id,
    staleTime: Infinity,
  });

  const { data: relatedPosts = [] } = useQuery({
    queryKey: ["related-posts", post?.category_id, post?.id],
    queryFn: async () => {
      if (!post?.category_id) return [];
      const { data } = await supabase
        .from("posts")
        .select("id, title, slug, featured_image, excerpt, categories(name, type)")
        .eq("status", "published")
        .eq("category_id", post.category_id)
        .neq("id", post.id)
        .order("created_at", { ascending: false })
        .limit(4);
      return data ?? [];
    },
    enabled: !!post?.category_id,
  });

  // Check bookmark status
  useEffect(() => {
    if (!user || !post?.id) { setIsBookmarked(false); return; }
    supabase.from("bookmarks").select("id").eq("user_id", user.id).eq("post_id", post.id).maybeSingle()
      .then(({ data }) => setIsBookmarked(!!data));
  }, [user, post?.id]);

  const toggleBookmark = async () => {
    if (!user) { toast.error("বুকমার্ক করতে লগইন করুন"); return; }
    if (!post?.id || bookmarkLoading) return;
    setBookmarkLoading(true);
    try {
      if (isBookmarked) {
        await supabase.from("bookmarks").delete().eq("user_id", user.id).eq("post_id", post.id);
        setIsBookmarked(false);
        toast.success("বুকমার্ক সরানো হয়েছে");
      } else {
        await supabase.from("bookmarks").insert({ user_id: user.id, post_id: post.id });
        setIsBookmarked(true);
        toast.success("বুকমার্ক করা হয়েছে!");
      }
    } catch { toast.error("সমস্যা হয়েছে"); }
    setBookmarkLoading(false);
  };

  const shareUrl = typeof window !== "undefined" ? window.location.href : "";

  const trackShare = async () => {
    if (post?.id) {
      await supabase.rpc("increment_share_count", { p_post_id: post.id });
    }
  };

  const shareActions = [
    {
      icon: Facebook,
      label: "ফেসবুক",
      color: "hover:bg-blue-500/10 hover:text-blue-600",
      onClick: () => { trackShare(); window.open(`https://www.facebook.com/sharer/sharer.php?u=${encodeURIComponent(shareUrl)}`, "_blank"); },
    },
    {
      icon: Twitter,
      label: "টুইটার",
      color: "hover:bg-sky-500/10 hover:text-sky-500",
      onClick: () => { trackShare(); window.open(`https://twitter.com/intent/tweet?url=${encodeURIComponent(shareUrl)}&text=${encodeURIComponent(post?.title || "")}`, "_blank"); },
    },
    {
      icon: LinkIcon,
      label: "লিংক কপি",
      color: "hover:bg-muted",
      onClick: () => { trackShare(); navigator.clipboard.writeText(shareUrl); toast.success("লিংক কপি হয়েছে!"); },
    },
  ];

  const catType = (post as any)?.categories?.type;
  const catName = (post as any)?.categories?.name;

  if (isLoading) {
    return (
      <div className="min-h-screen flex flex-col">
        <SiteHeader />
        <main className="flex-1 container mx-auto px-4 py-12">
          <div className="max-w-3xl mx-auto space-y-4 animate-pulse">
            <div className="h-8 bg-muted rounded w-3/4" />
            <div className="h-4 bg-muted rounded w-1/3" />
            <div className="aspect-[16/9] bg-muted rounded-xl" />
            <div className="space-y-2">
              <div className="h-4 bg-muted rounded" />
              <div className="h-4 bg-muted rounded w-5/6" />
              <div className="h-4 bg-muted rounded w-2/3" />
            </div>
          </div>
        </main>
        <SiteFooter />
      </div>
    );
  }

  if (!post) {
    return (
      <div className="min-h-screen flex flex-col">
        <SiteHeader />
        <main className="flex-1 container mx-auto px-4 py-20 text-center">
          <h1 className="font-heading font-bold text-3xl mb-4">পোস্ট পাওয়া যায়নি</h1>
          <p className="text-muted-foreground mb-6">এই পোস্টটি মুছে ফেলা হয়েছে অথবা ঠিকানা ভুল।</p>
          <Link to="/" className="inline-flex items-center gap-2 px-5 py-2.5 rounded-lg bg-primary text-primary-foreground font-medium text-sm hover-scale">
            <ArrowLeft className="h-4 w-4" /> হোমে ফিরে যান
          </Link>
        </main>
        <SiteFooter />
      </div>
    );
  }

  return (
    <div className="min-h-screen flex flex-col">
      <SiteHeader />

      <main className="flex-1">
        {/* Hero image */}
        {post.featured_image && (
          <div className="relative w-full max-h-[450px] overflow-hidden">
            <img
              src={post.featured_image}
              alt={post.title}
              className="w-full h-full object-cover animate-fade-in"
            />
            <div className="absolute inset-0 bg-gradient-to-t from-background via-background/30 to-transparent" />
          </div>
        )}

        <article className="container mx-auto px-4 -mt-16 relative z-10 pb-12">
          <div className="max-w-3xl mx-auto">
            {/* Header */}
            <div className="bg-card rounded-2xl border border-border p-6 md:p-8 shadow-lg animate-fade-in">
              <Link to="/" className="inline-flex items-center gap-1.5 text-sm text-muted-foreground hover:text-primary transition-colors mb-4">
                <ArrowLeft className="h-3.5 w-3.5" /> হোমে ফিরুন
              </Link>

              {catName && (
                <span className={`${catType === "news" ? "tag-news" : catType === "blog" ? "tag-blog" : "tag-directory"} mb-3 inline-block`}>
                  {catName}
                </span>
              )}

              <h1 className="font-heading font-bold text-2xl md:text-3xl lg:text-4xl leading-tight mb-4">
                {post.title}
              </h1>

              {post.excerpt && (
                <p className="text-muted-foreground text-base md:text-lg leading-relaxed mb-4">
                  {post.excerpt}
                </p>
              )}

              <div className="flex items-center justify-between">
                <div className="flex items-center gap-4 text-xs text-muted-foreground">
                  <span className="flex items-center gap-1">
                    <Calendar className="h-3.5 w-3.5" />
                    {new Date(post.created_at).toLocaleDateString("bn-BD", {
                      year: "numeric", month: "long", day: "numeric",
                    })}
                  </span>
                  <span className="flex items-center gap-1">
                    <Eye className="h-3.5 w-3.5" />
                    {post.view_count} বার পড়া হয়েছে
                  </span>
                  {(post as any).share_count > 0 && (
                    <span className="flex items-center gap-1">
                      <Share2 className="h-3.5 w-3.5" />
                      {(post as any).share_count} শেয়ার
                    </span>
                  )}
                </div>
                <button
                  onClick={toggleBookmark}
                  disabled={bookmarkLoading}
                  className={`p-2 rounded-lg transition-colors ${isBookmarked ? "text-primary bg-primary/10" : "text-muted-foreground hover:text-primary hover:bg-primary/10"}`}
                  title={isBookmarked ? "বুকমার্ক সরান" : "বুকমার্ক করুন"}
                >
                  {isBookmarked ? <BookmarkCheck className="h-5 w-5" /> : <Bookmark className="h-5 w-5" />}
                </button>
              </div>
            </div>

            {/* Content */}
            <div className="bg-card rounded-2xl border border-border p-6 md:p-8 mt-4 shadow-sm animate-fade-in prose-content">
              {(() => {
                const raw = post.content || "";
                // Detect HTML content
                const looksLikeHtml = /<\/?[a-z][\s\S]*>/i.test(raw);
                if (!looksLikeHtml) {
                  return (
                    <div className="text-foreground/90 leading-relaxed text-base md:text-lg whitespace-pre-wrap font-body">
                      {raw}
                    </div>
                  );
                }
                // Sanitize: strip doctype/html/head/meta/link/title/script/style/body tags
                let cleaned = raw;
                const bodyMatch = cleaned.match(/<body[^>]*>([\s\S]*)<\/body>/i);
                if (bodyMatch) cleaned = bodyMatch[1];
                cleaned = cleaned
                  .replace(/<!DOCTYPE[^>]*>/gi, "")
                  .replace(/<\/?html[^>]*>/gi, "")
                  .replace(/<head[\s\S]*?<\/head>/gi, "")
                  .replace(/<\/?body[^>]*>/gi, "")
                  .replace(/<script[\s\S]*?<\/script>/gi, "")
                  .replace(/<style[\s\S]*?<\/style>/gi, "")
                  .replace(/<link[^>]*>/gi, "")
                  .replace(/<meta[^>]*>/gi, "")
                  .replace(/<base[^>]*>/gi, "")
                  .replace(/<title[\s\S]*?<\/title>/gi, "");
                return (
                  <div
                    className="text-foreground/90 leading-relaxed text-base md:text-lg font-body wiki-content"
                    dangerouslySetInnerHTML={{ __html: cleaned }}
                  />
                );
              })()}

              {/* Source link with favicon */}
              {(post as any).source_url && (() => {
                const srcUrl = (post as any).source_url as string;
                let host = "";
                try { host = new URL(srcUrl).hostname.replace(/^www\./, ""); } catch { /* ignore */ }
                const favicon = host ? `https://www.google.com/s2/favicons?domain=${host}&sz=64` : "";
                return (
                  <div className="mt-6 pt-4 border-t border-border">
                    <a
                      href={srcUrl}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="inline-flex items-center gap-3 px-4 py-2.5 rounded-lg bg-muted/50 hover:bg-muted transition-colors border border-border group"
                    >
                      {favicon && (
                        <img
                          src={favicon}
                          alt={host}
                          className="h-6 w-6 rounded"
                          loading="lazy"
                          onError={(e) => { (e.currentTarget as HTMLImageElement).style.display = "none"; }}
                        />
                      )}
                      <div className="flex flex-col min-w-0">
                        <span className="text-xs text-muted-foreground">মূল সূত্র</span>
                        <span className="text-sm font-medium text-primary group-hover:underline truncate">
                          {host || "বিস্তারিত পড়ুন"}
                        </span>
                      </div>
                      <ExternalLink className="h-4 w-4 text-muted-foreground ml-1 shrink-0" />
                    </a>
                  </div>
                );
              })()}
            </div>

            {/* Share */}
            <div className="bg-card rounded-2xl border border-border p-5 mt-4 shadow-sm animate-fade-in">
              <div className="flex items-center gap-3">
                <Share2 className="h-4 w-4 text-muted-foreground" />
                <span className="text-sm font-heading font-semibold">শেয়ার করুন:</span>
                <div className="flex gap-1">
                  {shareActions.map(action => (
                    <button
                      key={action.label}
                      onClick={action.onClick}
                      className={`p-2 rounded-lg transition-colors ${action.color}`}
                      title={action.label}
                    >
                      <action.icon className="h-4 w-4" />
                    </button>
                  ))}
                </div>
              </div>
            </div>

            {/* Comments */}
            <CommentSection postId={post.id} />

            {/* Related posts */}
            {relatedPosts.length > 0 && (
              <div className="mt-8 animate-fade-in">
                <h2 className="font-heading font-bold text-xl mb-4">সম্পর্কিত পোস্ট</h2>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  {relatedPosts.map(rp => (
                    <Link
                      key={rp.id}
                      to={`/post/${rp.slug}`}
                      className="group bg-card rounded-xl border border-border overflow-hidden hover:shadow-md transition-all duration-300 hover-scale"
                    >
                      {rp.featured_image && (
                        <img
                          src={rp.featured_image}
                          alt={rp.title}
                          className="w-full h-36 object-cover group-hover:scale-105 transition-transform duration-500"
                        />
                      )}
                      <div className="p-4">
                        {(rp as any).categories?.name && (
                          <span className={`${(rp as any).categories?.type === "news" ? "tag-news" : (rp as any).categories?.type === "blog" ? "tag-blog" : "tag-directory"} mb-2 inline-block`}>
                            {(rp as any).categories.name}
                          </span>
                        )}
                        <h3 className="font-heading font-semibold text-sm leading-snug group-hover:text-primary transition-colors">
                          {rp.title}
                        </h3>
                        {rp.excerpt && (
                          <p className="text-xs text-muted-foreground mt-1 line-clamp-2">{rp.excerpt}</p>
                        )}
                      </div>
                    </Link>
                  ))}
                </div>
              </div>
            )}
          </div>
        </article>
      </main>

      <SiteFooter />
    </div>
  );
}
