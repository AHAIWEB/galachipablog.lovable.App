import { useState, useEffect } from "react";
import { ChevronLeft, ChevronRight } from "lucide-react";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";

export default function FeatureSlider() {
  const [current, setCurrent] = useState(0);

  const { data: slides = [] } = useQuery({
    queryKey: ["featured-posts"],
    queryFn: async () => {
      const { data } = await supabase
        .from("posts")
        .select("id, title, featured_image, excerpt, categories(name, type)")
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
      <div className="rounded-xl overflow-hidden bg-muted aspect-[16/9] flex items-center justify-center">
        <p className="text-muted-foreground text-sm font-heading">ফিচার্ড পোস্ট নেই</p>
      </div>
    );
  }

  const slide = slides[current];
  const catName = (slide as any).categories?.name;
  const catType = (slide as any).categories?.type;

  return (
    <div className="relative rounded-xl overflow-hidden group bg-foreground/5 aspect-[16/9]">
      <img
        src={slide.featured_image || "https://images.unsplash.com/photo-1506744038136-46273834b3fb?w=800&h=450&fit=crop"}
        alt={slide.title}
        className="w-full h-full object-cover transition-all duration-700"
      />
      <div className="absolute inset-0 bg-gradient-to-t from-foreground/80 via-foreground/20 to-transparent" />
      <div className="absolute bottom-0 left-0 right-0 p-4 md:p-6">
        {catName && (
          <span className={`${catType === "news" ? "tag-news" : catType === "blog" ? "tag-blog" : "tag-directory"} mb-2 inline-block`}>
            {catName}
          </span>
        )}
        <h2 className="font-heading font-bold text-lg md:text-2xl text-card leading-tight">{slide.title}</h2>
      </div>

      <button
        onClick={() => setCurrent(p => (p - 1 + slides.length) % slides.length)}
        className="absolute left-2 top-1/2 -translate-y-1/2 p-1.5 rounded-full bg-card/80 opacity-0 group-hover:opacity-100 transition-opacity"
      >
        <ChevronLeft className="h-4 w-4" />
      </button>
      <button
        onClick={() => setCurrent(p => (p + 1) % slides.length)}
        className="absolute right-2 top-1/2 -translate-y-1/2 p-1.5 rounded-full bg-card/80 opacity-0 group-hover:opacity-100 transition-opacity"
      >
        <ChevronRight className="h-4 w-4" />
      </button>

      <div className="absolute bottom-2 right-4 flex gap-1.5">
        {slides.map((_, i) => (
          <button
            key={i}
            onClick={() => setCurrent(i)}
            className={`w-2 h-2 rounded-full transition-all ${i === current ? "bg-card w-5" : "bg-card/50"}`}
          />
        ))}
      </div>
    </div>
  );
}
