import { useState, useRef } from "react";
import { Download, Upload, ImageIcon, Zap } from "lucide-react";

type ConvertedFile = {
  name: string;
  originalSize: number;
  webpSize: number;
  webpUrl: string;
  savings: number;
};

export default function AdminWebP() {
  const [files, setFiles] = useState<File[]>([]);
  const [converted, setConverted] = useState<ConvertedFile[]>([]);
  const [processing, setProcessing] = useState(false);
  const [quality, setQuality] = useState(80);
  const inputRef = useRef<HTMLInputElement>(null);

  const handleFiles = (fileList: FileList) => {
    const imageFiles = Array.from(fileList).filter(f => f.type.startsWith("image/"));
    setFiles(imageFiles);
    setConverted([]);
  };

  const convertToWebP = async () => {
    setProcessing(true);
    const results: ConvertedFile[] = [];

    for (const file of files) {
      try {
        const bitmap = await createImageBitmap(file);
        const canvas = document.createElement("canvas");
        canvas.width = bitmap.width;
        canvas.height = bitmap.height;
        const ctx = canvas.getContext("2d")!;
        ctx.drawImage(bitmap, 0, 0);

        const webpBlob = await new Promise<Blob>((resolve) => {
          canvas.toBlob((blob) => resolve(blob!), "image/webp", quality / 100);
        });

        const webpUrl = URL.createObjectURL(webpBlob);
        const savings = Math.round((1 - webpBlob.size / file.size) * 100);

        results.push({
          name: file.name.replace(/\.[^.]+$/, ".webp"),
          originalSize: file.size,
          webpSize: webpBlob.size,
          webpUrl,
          savings,
        });
      } catch (err) {
        console.error(`Failed to convert ${file.name}:`, err);
      }
    }

    setConverted(results);
    setProcessing(false);
  };

  const downloadAll = () => {
    converted.forEach(c => {
      const a = document.createElement("a");
      a.href = c.webpUrl;
      a.download = c.name;
      a.click();
    });
  };

  const formatSize = (bytes: number) => {
    if (bytes < 1024) return `${bytes} B`;
    if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
    return `${(bytes / (1024 * 1024)).toFixed(2)} MB`;
  };

  return (
    <div>
      <h1 className="font-heading font-bold text-2xl mb-6">⚡ WebP কনভার্টার</h1>

      <div className="bg-card rounded-xl border border-border p-5 mb-6">
        <div
          onClick={() => inputRef.current?.click()}
          onDragOver={e => e.preventDefault()}
          onDrop={e => { e.preventDefault(); if (e.dataTransfer.files) handleFiles(e.dataTransfer.files); }}
          className="border-2 border-dashed border-border rounded-xl p-8 text-center cursor-pointer hover:border-primary/50 transition-colors"
        >
          <Upload className="h-8 w-8 mx-auto mb-2 text-muted-foreground" />
          <p className="text-sm text-muted-foreground">ইমেজ ড্র্যাগ করুন অথবা ক্লিক করুন</p>
          <p className="text-xs text-muted-foreground mt-1">PNG, JPG, BMP, GIF সাপোর্টেড</p>
          <input
            ref={inputRef}
            type="file"
            accept="image/*"
            multiple
            onChange={e => e.target.files && handleFiles(e.target.files)}
            className="hidden"
          />
        </div>

        {files.length > 0 && (
          <div className="mt-4 flex items-center gap-4">
            <div className="flex items-center gap-2">
              <label className="text-xs text-muted-foreground">কোয়ালিটি:</label>
              <input type="range" min={10} max={100} value={quality} onChange={e => setQuality(Number(e.target.value))} className="w-24" />
              <span className="text-xs font-medium">{quality}%</span>
            </div>
            <button
              onClick={convertToWebP}
              disabled={processing}
              className="flex items-center gap-1.5 px-4 py-2 rounded-lg bg-primary text-primary-foreground text-sm font-medium disabled:opacity-50"
            >
              <Zap className="h-4 w-4" />
              {processing ? "কনভার্ট হচ্ছে..." : `${files.length}টি ইমেজ কনভার্ট করুন`}
            </button>
          </div>
        )}
      </div>

      {converted.length > 0 && (
        <div className="bg-card rounded-xl border border-border overflow-hidden">
          <div className="flex items-center justify-between px-4 py-2.5 bg-muted border-b border-border">
            <span className="font-heading font-semibold text-sm">কনভার্ট সম্পন্ন ({converted.length})</span>
            <button onClick={downloadAll} className="flex items-center gap-1 text-xs px-3 py-1.5 rounded-lg bg-primary text-primary-foreground">
              <Download className="h-3 w-3" /> সব ডাউনলোড
            </button>
          </div>
          <div className="divide-y divide-border">
            {converted.map((c, i) => (
              <div key={i} className="flex items-center justify-between px-4 py-3">
                <div className="flex items-center gap-3">
                  <ImageIcon className="h-5 w-5 text-muted-foreground" />
                  <div>
                    <p className="text-sm font-medium">{c.name}</p>
                    <p className="text-xs text-muted-foreground">
                      {formatSize(c.originalSize)} → {formatSize(c.webpSize)}
                      <span className={`ml-2 font-medium ${c.savings > 0 ? "text-green-600" : "text-red-500"}`}>
                        {c.savings > 0 ? `${c.savings}% ছোট` : `${Math.abs(c.savings)}% বড়`}
                      </span>
                    </p>
                  </div>
                </div>
                <a href={c.webpUrl} download={c.name} className="p-1.5 hover:bg-muted rounded">
                  <Download className="h-4 w-4" />
                </a>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}
