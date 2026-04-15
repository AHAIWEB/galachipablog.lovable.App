import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import SiteHeader from "@/components/SiteHeader";
import SiteFooter from "@/components/SiteFooter";
import { X, ChevronLeft, ChevronRight, Upload, Globe, Plus } from "lucide-react";
import { useAuth } from "@/contexts/AuthContext";

export default function GalleryPage() {
  const { user } = useAuth();
  const qc = useQueryClient();
  const [lightboxIdx, setLightboxIdx] = useState<number | null>(null);
  const [showUpload, setShowUpload] = useState(false);
  const [urlInput, setUrlInput] = useState("");
  const [captionInput, setCaptionInput] = useState("");
  const [uploading, setUploading] = useState(false);

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

  // Check admin
  const { data: isAdmin } = useQuery({
    queryKey: ["is-admin", user?.id],
    queryFn: async () => {
      if (!user) return false;
      const { data } = await supabase.from("user_roles").select("role").eq("user_id", user.id).eq("role", "admin").maybeSingle();
      return !!data;
    },
    enabled: !!user,
  });

  const uploadByUrl = useMutation({
    mutationFn: async () => {
      if (!urlInput.trim()) throw new Error("URL দিন");
      // Create a placeholder post for gallery images
      const { data: post, error: postErr } = await supabase.from("posts").insert({
        title: captionInput || "গ্যালারি ছবি",
        slug: `gallery-${Date.now()}`,
        status: "published" as const,
        featured_image: urlInput.trim(),
      }).select("id").single();
      if (postErr) throw postErr;
      
      const { error } = await supabase.from("post_images").insert({
        post_id: post.id,
        image_url: urlInput.trim(),
        caption: captionInput,
        sort_order: 0,
      });
      if (error) throw error;
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["gallery-all"] });
      toast.success("ছবি যোগ হয়েছে");
      setUrlInput("");
      setCaptionInput("");
    },
    onError: (e: any) => toast.error(e.message),
  });

  const uploadFile = async (files: FileList) => {
    setUploading(true);
    try {
      for (const file of Array.from(files)) {
        const ext = file.name.split(".").pop() || "jpg";
        const path = `gallery/${Date.now()}-${Math.random().toString(36).slice(2, 6)}.${ext}`;
        const { data: uploaded, error: upErr } = await supabase.storage.from("post-images").upload(path, file);
        if (upErr) { console.error(upErr); continue; }
        const { data: pubUrl } = supabase.storage.from("post-images").getPublicUrl(uploaded.path);

        const { data: post } = await supabase.from("posts").insert({
          title: file.name.replace(/\.[^.]+$/, "") || "গ্যালারি ছবি",
          slug: `gallery-${Date.now()}-${Math.random().toString(36).slice(2, 4)}`,
          status: "published" as const,
          featured_image: pubUrl.publicUrl,
        }).select("id").single();

        if (post) {
          await supabase.from("post_images").insert({
            post_id: post.id,
            image_url: pubUrl.publicUrl,
            caption: "",
            sort_order: 0,
          });
        }
      }
      qc.invalidateQueries({ queryKey: ["gallery-all"] });
      toast.success("ছবি আপলোড হয়েছে");
    } catch (e: any) {
      toast.error(e.message);
    } finally {
      setUploading(false);
    }
  };

  const openLightbox = (idx: number) => setLightboxIdx(idx);
  const closeLightbox = () => setLightboxIdx(null);
  const prev = () => setLightboxIdx(i => i !== null ? (i - 1 + images.length) % images.length : null);
  const next = () => setLightboxIdx(i => i !== null ? (i + 1) % images.length : null);

  return (
    <div className="min-h-screen bg-background">
      <SiteHeader />
      <main className="container mx-auto px-4 py-6">
        <div className="flex items-center justify-between mb-6">
          <h1 className="font-heading font-bold text-2xl">📷 ফটো গ্যালারি</h1>
          {isAdmin && (
            <button onClick={() => setShowUpload(!showUpload)}
              className="flex items-center gap-1.5 px-3 py-2 rounded-lg bg-primary text-primary-foreground text-sm font-medium">
              <Plus className="h-4 w-4" /> ছবি যোগ
            </button>
          )}
        </div>

        {/* Upload panel for admin */}
        {showUpload && isAdmin && (
          <div className="bg-card rounded-xl border border-border p-4 mb-6">
            <div className="grid sm:grid-cols-2 gap-4">
              {/* URL input */}
              <div>
                <label className="text-xs font-medium text-muted-foreground block mb-1">🔗 URL থেকে যোগ</label>
                <input value={urlInput} onChange={e => setUrlInput(e.target.value)} placeholder="https://example.com/image.jpg"
                  className="w-full px-3 py-2 rounded-lg border border-input bg-background text-sm mb-2" />
                <input value={captionInput} onChange={e => setCaptionInput(e.target.value)} placeholder="ক্যাপশন (ঐচ্ছিক)"
                  className="w-full px-3 py-2 rounded-lg border border-input bg-background text-sm mb-2" />
                <button onClick={() => uploadByUrl.mutate()} disabled={uploadByUrl.isPending || !urlInput.trim()}
                  className="flex items-center gap-1.5 px-4 py-2 rounded-lg bg-primary text-primary-foreground text-sm font-medium disabled:opacity-50 w-full justify-center">
                  <Globe className="h-4 w-4" /> URL যোগ করুন
                </button>
              </div>
              {/* File upload */}
              <div>
                <label className="text-xs font-medium text-muted-foreground block mb-1">📤 ফাইল আপলোড</label>
                <label className="flex items-center justify-center gap-2 cursor-pointer border-2 border-dashed border-input rounded-lg p-6 hover:bg-muted/50 transition-colors">
                  <Upload className="h-5 w-5 text-muted-foreground" />
                  <span className="text-sm text-muted-foreground">{uploading ? "আপলোড হচ্ছে..." : "ছবি নির্বাচন করুন"}</span>
                  <input type="file" multiple accept="image/*" className="hidden" disabled={uploading}
                    onChange={e => e.target.files && uploadFile(e.target.files)} />
                </label>
              </div>
            </div>
          </div>
        )}

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
