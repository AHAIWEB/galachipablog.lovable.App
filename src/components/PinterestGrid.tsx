import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";

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
    <div className="grid grid-cols-2 md:grid-cols-3 gap-3 auto-rows-[140px]">
      {posts.map((post, i) => {
        const catName = (post as any).categories?.name;
        const catType = (post as any).categories?.type;
        return (
          <a
            key={post.id}
            href="#"
            className={`relative rounded-lg overflow-hidden group ${sizeClasses[i] || ""}`}
          >
            <img
              src={post.featured_image || "https://images.unsplash.com/photo-1506744038136-46273834b3fb?w=600&h=400&fit=crop"}
              alt={post.title}
              className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-500"
            />
            <div className="absolute inset-0 bg-gradient-to-t from-foreground/70 to-transparent" />
            <div className="absolute top-2 left-2">
              {catName && (
                <span className={catType === "news" ? "tag-news" : catType === "blog" ? "tag-blog" : "tag-directory"}>
                  {catName}
                </span>
              )}
            </div>
            <div className="absolute bottom-2 left-2 right-2">
              <h3 className="text-xs md:text-sm font-heading font-semibold text-card leading-tight">
                {post.title}
              </h3>
            </div>
          </a>
        );
      })}
    </div>
  );
}
