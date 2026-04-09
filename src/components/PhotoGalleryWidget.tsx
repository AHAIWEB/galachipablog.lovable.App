import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useState } from "react";
import { X, ChevronLeft, ChevronRight } from "lucide-react";

export default function PhotoGalleryWidget() {
  const [lightbox, setLightbox] = useState<{ images: any[]; idx: number } | null>(null);

  const { data: galleries = [] } = useQuery({
    queryKey: ["photo-gallery-widget"],
    queryFn: async () => {
      const { data } = await supabase
        .from("post_images")
        .select("id, image_url, caption, post_id, posts(title, slug)")
        .order("created_at", { ascending: false })
        .limit(12);
      return (data ?? []) as any[];
    },
  });

  if (galleries.length === 0) return null;

  return (
    <div className="bg-card rounded-xl border border-border overflow-hidden shadow-sm">
      <div className="px-3 py-2.5 bg-accent text-accent-foreground border-b border-border">
        <h3 className="font-heading font-bold text-sm">📷 ফটো গ্যালারি</h3>
      </div>
      <div className="grid grid-cols-3 gap-1 p-2">
        {galleries.map((img, i) => (
          <button
            key={img.id}
            onClick={() => setLightbox({ images: galleries, idx: i })}
            className="aspect-square rounded overflow-hidden hover:opacity-80 transition-opacity"
          >
            <img src={img.image_url} alt={img.caption || ""} className="w-full h-full object-cover" />
          </button>
        ))}
      </div>

      {/* Lightbox */}
      {lightbox && (
        <div className="fixed inset-0 z-50 bg-black/90 flex items-center justify-center" onClick={() => setLightbox(null)}>
          <button className="absolute top-4 right-4 text-white p-2" onClick={() => setLightbox(null)}>
            <X className="h-6 w-6" />
          </button>
          <button
            className="absolute left-4 text-white p-2"
            onClick={(e) => { e.stopPropagation(); setLightbox(p => p ? { ...p, idx: (p.idx - 1 + p.images.length) % p.images.length } : null); }}
          >
            <ChevronLeft className="h-8 w-8" />
          </button>
          <div className="max-w-4xl max-h-[80vh] flex flex-col items-center" onClick={(e) => e.stopPropagation()}>
            <img
              src={lightbox.images[lightbox.idx].image_url}
              alt={lightbox.images[lightbox.idx].caption || ""}
              className="max-h-[70vh] object-contain rounded-lg"
            />
            {lightbox.images[lightbox.idx].caption && (
              <p className="text-white text-sm mt-3 text-center">{lightbox.images[lightbox.idx].caption}</p>
            )}
          </div>
          <button
            className="absolute right-4 text-white p-2"
            onClick={(e) => { e.stopPropagation(); setLightbox(p => p ? { ...p, idx: (p.idx + 1) % p.images.length } : null); }}
          >
            <ChevronRight className="h-8 w-8" />
          </button>
        </div>
      )}
    </div>
  );
}
