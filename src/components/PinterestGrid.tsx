import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { Link } from "react-router-dom";

const sizeClasses = ["row-span-2", "", "row-span-2", "", "", "row-span-2"];

export default function PinterestGrid() {
  const { data: posts = [] } = useQuery({
    queryKey: ["grid-posts"],
    queryFn: async () => {
      const { data } = await supabase
        .from("posts")
        .select("id, title, featured_image, slug, categories(name, type)")
        .eq("status", "published")
        .eq("is_featured", false)
        .order("created_at", { ascending: false })
        .limit(6);
      return data ?? [];
    },
  });

  if (posts.length === 0) {
    return (
      <div className="text-center py-8 text-muted-foreground text-sm">
        পোস্ট লোড হচ্ছে...
      </div>
    );
  }

  return (
    <div className="grid grid-cols-2 md:grid-cols-3 gap-3 auto-rows-[140px] stagger-fade">
      {posts.map((post, i) => {
        const catName = (post as any).categories?.name;
        const catType = (post as any).categories?.type;
        return (
          <Link
            key={post.id}
            to={`/post/${post.slug}`}
            className={`relative rounded-xl overflow-hidden group hover-lift ${sizeClasses[i] || ""}`}
          >
            <img
              src={post.featured_image || "https://images.unsplash.com/photo-1506744038136-46273834b3fb?w=600&h=400&fit=crop"}
              alt={post.title}
              className="w-full h-full object-cover group-hover:scale-110 transition-transform duration-700"
              loading="lazy"
            />
            <div className="absolute inset-0 bg-gradient-to-t from-foreground/80 via-foreground/20 to-transparent group-hover:from-foreground/90 transition-all duration-300" />
            <div className="absolute top-2 left-2">
              {catName && (
                <span className={catType === "news" ? "tag-news" : catType === "blog" ? "tag-blog" : "tag-directory"}>
                  {catName}
                </span>
              )}
            </div>
            <div className="absolute bottom-2 left-2 right-2">
              <h3 className="text-xs md:text-sm font-heading font-semibold text-card leading-tight group-hover:underline decoration-1 underline-offset-2">
                {post.title}
              </h3>
            </div>
          </Link>
        );
      })}
    </div>
  );
}
