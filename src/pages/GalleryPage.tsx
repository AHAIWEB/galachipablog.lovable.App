import { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import SiteHeader from "@/components/SiteHeader";
import SiteFooter from "@/components/SiteFooter";
import { X, ChevronLeft, ChevronRight } from "lucide-react";

export default function GalleryPage() {
  const [lightboxIdx, setLightboxIdx] = useState<number | null>(null);

  const { data: images = [], isLoading } = useQuery({
    queryKey: ["gallery-all"],
    queryFn: async () => {
      const { data } = await supabase
        .from("post_images")
        .select("id, image_url, caption, post_id, posts(title, slug)")
        .order("created_at", { ascending: false })
        .limit(200);
      return data ?? [];
    },
  });

  const openLightbox = (idx: number) => setLightboxIdx(idx);
  const closeLightbox = () => setLightboxIdx(null);
  const prev = () => setLightboxIdx(i => i !== null ? (i - 1 + images.length) % images.length : null);
  const next = () => setLightboxIdx(i => i !== null ? (i + 1) % images.length : null);

  return (
    <div className="min-h-screen bg-background">
      <SiteHeader />
      <main className="container mx-auto px-4 py-6">
        <h1 className="font-heading font-bold text-2xl mb-6">📷 ফটো গ্যালারি</h1>

        {isLoading ? (
          <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 gap-2">
            {Array.from({ length: 20 }).map((_, i) => (
              <div key={i} className="aspect-square bg-muted animate-pulse rounded-lg" />
            ))}
          </div>
        ) : images.length === 0 ? (
          <p className="text-muted-foreground">কোনো ছবি নেই</p>
        ) : (
          <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 gap-2">
            {images.map((img, idx) => (
              <button
                key={img.id}
                onClick={() => openLightbox(idx)}
                className="aspect-square rounded-lg overflow-hidden hover:opacity-90 transition-opacity group relative"
              >
                <img src={img.image_url} alt={img.caption || ""} className="w-full h-full object-cover" loading="lazy" />
                {img.caption && (
                  <div className="absolute inset-x-0 bottom-0 bg-gradient-to-t from-black/70 to-transparent p-2 opacity-0 group-hover:opacity-100 transition-opacity">
                    <p className="text-white text-xs line-clamp-2">{img.caption}</p>
                  </div>
                )}
              </button>
            ))}
          </div>
        )}
      </main>

      {/* Lightbox */}
      {lightboxIdx !== null && images[lightboxIdx] && (
        <div className="fixed inset-0 z-50 bg-black/90 flex items-center justify-center" onClick={closeLightbox}>
          <button onClick={(e) => { e.stopPropagation(); prev(); }} className="absolute left-4 top-1/2 -translate-y-1/2 p-2 bg-white/20 rounded-full hover:bg-white/30 text-white">
            <ChevronLeft className="h-6 w-6" />
          </button>
          <img
            src={images[lightboxIdx].image_url}
            alt={images[lightboxIdx].caption || ""}
            className="max-w-[90vw] max-h-[85vh] object-contain rounded-lg"
            onClick={(e) => e.stopPropagation()}
          />
          <button onClick={(e) => { e.stopPropagation(); next(); }} className="absolute right-4 top-1/2 -translate-y-1/2 p-2 bg-white/20 rounded-full hover:bg-white/30 text-white">
            <ChevronRight className="h-6 w-6" />
          </button>
          <button onClick={closeLightbox} className="absolute top-4 right-4 p-2 bg-white/20 rounded-full hover:bg-white/30 text-white">
            <X className="h-5 w-5" />
          </button>
          {images[lightboxIdx].caption && (
            <div className="absolute bottom-4 left-1/2 -translate-x-1/2 bg-black/60 px-4 py-2 rounded-lg max-w-lg">
              <p className="text-white text-sm text-center">{images[lightboxIdx].caption}</p>
            </div>
          )}
        </div>
      )}

      <SiteFooter />
    </div>
  );
}
