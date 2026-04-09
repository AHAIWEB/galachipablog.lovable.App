import { useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import { Upload, X, GripVertical } from "lucide-react";

type PostImage = {
  id?: string;
  image_url: string;
  caption: string;
  sort_order: number;
};

interface Props {
  postId?: string;
  images: PostImage[];
  onChange: (images: PostImage[]) => void;
}

export default function PostImageUploader({ postId, images, onChange }: Props) {
  const [uploading, setUploading] = useState(false);

  const handleUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = e.target.files;
    if (!files || files.length === 0) return;

    setUploading(true);
    const newImages: PostImage[] = [...images];

    for (const file of Array.from(files)) {
      const ext = file.name.split(".").pop();
      const path = `${Date.now()}-${Math.random().toString(36).slice(2)}.${ext}`;

      const { error } = await supabase.storage.from("post-images").upload(path, file);
      if (error) {
        toast.error(`আপলোড ব্যর্থ: ${file.name}`);
        continue;
      }

      const { data: urlData } = supabase.storage.from("post-images").getPublicUrl(path);
      newImages.push({
        image_url: urlData.publicUrl,
        caption: "",
        sort_order: newImages.length,
      });
    }

    onChange(newImages);
    setUploading(false);
    e.target.value = "";
  };

  const updateCaption = (idx: number, caption: string) => {
    const updated = [...images];
    updated[idx] = { ...updated[idx], caption };
    onChange(updated);
  };

  const removeImage = (idx: number) => {
    onChange(images.filter((_, i) => i !== idx));
  };

  const moveImage = (from: number, to: number) => {
    if (to < 0 || to >= images.length) return;
    const updated = [...images];
    const [moved] = updated.splice(from, 1);
    updated.splice(to, 0, moved);
    onChange(updated.map((img, i) => ({ ...img, sort_order: i })));
  };

  return (
    <div className="space-y-3">
      <div className="flex items-center gap-2">
        <label className="text-xs font-medium text-muted-foreground">📸 ফটো গ্যালারি</label>
        <label className="cursor-pointer flex items-center gap-1 px-3 py-1.5 rounded-lg bg-primary text-primary-foreground text-xs font-medium hover:bg-primary/90">
          <Upload className="h-3.5 w-3.5" />
          {uploading ? "আপলোড হচ্ছে..." : "ছবি আপলোড"}
          <input type="file" multiple accept="image/*" onChange={handleUpload} className="hidden" disabled={uploading} />
        </label>
      </div>

      {images.length > 0 && (
        <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
          {images.map((img, idx) => (
            <div key={idx} className="relative group border border-border rounded-lg overflow-hidden bg-muted/30">
              <img src={img.image_url} alt={img.caption || `Image ${idx + 1}`} className="w-full aspect-square object-cover" />
              <div className="absolute top-1 right-1 flex gap-0.5 opacity-0 group-hover:opacity-100 transition-opacity">
                <button onClick={() => moveImage(idx, idx - 1)} className="p-1 bg-background/80 rounded text-xs" title="উপরে">↑</button>
                <button onClick={() => moveImage(idx, idx + 1)} className="p-1 bg-background/80 rounded text-xs" title="নিচে">↓</button>
                <button onClick={() => removeImage(idx)} className="p-1 bg-destructive/80 text-destructive-foreground rounded">
                  <X className="h-3 w-3" />
                </button>
              </div>
              <input
                value={img.caption}
                onChange={(e) => updateCaption(idx, e.target.value)}
                placeholder="ক্যাপশন..."
                className="w-full px-2 py-1.5 text-xs border-t border-border bg-background"
              />
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
