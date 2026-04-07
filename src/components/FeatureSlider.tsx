import { useState, useEffect } from "react";
import { ChevronLeft, ChevronRight } from "lucide-react";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { Link } from "react-router-dom";

export default function FeatureSlider() {
  const [current, setCurrent] = useState(0);

  const { data: slides = [] } = useQuery({
    queryKey: ["featured-posts"],
    queryFn: async () => {
      const { data } = await supabase
        .from("posts")
        .select("id, title, slug, featured_image, excerpt, categories(name, type)")
        .eq("status", "published")
        .eq("is_featured", true)
        .order("created_at", { ascending: false })
        .limit(6);
      return data ?? [];
    },
  });

  useEffect(() => {
    if (slides.length === 0) return;
    const timer = setInterval(() => setCurrent(p => (p + 1) % slides.length), 5000);
    return () => clearInterval(timer);
  }, [slides.length]);

  if (slides.length === 0) {
    return (
      <div className="rounded-2xl overflow-hidden bg-muted aspect-[16/9] flex items-center justify-center animate-pulse">
        <p className="text-muted-foreground text-sm font-heading">ফিচার্ড পোস্ট নেই</p>
      </div>
    );
  }

  const slide = slides[current];
  const catName = (slide as any).categories?.name;
  const catType = (slide as any).categories?.type;

  return (
    <Link to={`/post/${slide.slug}`} className="block relative rounded-2xl overflow-hidden group bg-foreground/5 aspect-[16/9] shadow-lg hover:shadow-xl transition-shadow duration-300">
      <img
        src={slide.featured_image || "https://images.unsplash.com/photo-1506744038136-46273834b3fb?w=800&h=450&fit=crop"}
        alt={slide.title}
        className="w-full h-full object-cover transition-transform duration-1000 group-hover:scale-105"
        loading="lazy"
      />
      <div className="absolute inset-0 bg-gradient-to-t from-foreground/80 via-foreground/20 to-transparent" />
      <div className="absolute bottom-0 left-0 right-0 p-4 md:p-6">
        {catName && (
          <span className={`${catType === "news" ? "tag-news" : catType === "blog" ? "tag-blog" : "tag-directory"} mb-2 inline-block`}>
            {catName}
          </span>
        )}
        <h2 className="font-heading font-bold text-lg md:text-2xl text-card leading-tight group-hover:underline decoration-2 underline-offset-4">
          {slide.title}
        </h2>
        {slide.excerpt && (
          <p className="text-card/70 text-xs md:text-sm mt-1 line-clamp-2 hidden sm:block">{slide.excerpt}</p>
        )}
      </div>

      <button
        onClick={e => { e.preventDefault(); setCurrent(p => (p - 1 + slides.length) % slides.length); }}
        className="absolute left-3 top-1/2 -translate-y-1/2 p-2 rounded-full bg-card/90 shadow-lg opacity-0 group-hover:opacity-100 transition-all duration-300 hover:bg-card hover:scale-110"
      >
        <ChevronLeft className="h-4 w-4" />
      </button>
      <button
        onClick={e => { e.preventDefault(); setCurrent(p => (p + 1) % slides.length); }}
        className="absolute right-3 top-1/2 -translate-y-1/2 p-2 rounded-full bg-card/90 shadow-lg opacity-0 group-hover:opacity-100 transition-all duration-300 hover:bg-card hover:scale-110"
      >
        <ChevronRight className="h-4 w-4" />
      </button>

      <div className="absolute bottom-2 right-4 flex gap-1.5">
        {slides.map((_, i) => (
          <button
            key={i}
            onClick={e => { e.preventDefault(); setCurrent(i); }}
            className={`h-2 rounded-full transition-all duration-300 ${i === current ? "bg-card w-6" : "bg-card/50 w-2"}`}
          />
        ))}
      </div>
    </Link>
  );
}
