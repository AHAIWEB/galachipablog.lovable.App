import { useState, useRef } from "react";
import { Download, Type, Image as ImageIcon, Palette, RotateCcw } from "lucide-react";

type TextOverlay = {
  text: string;
  x: number;
  y: number;
  fontSize: number;
  color: string;
  fontFamily: string;
};

const fonts = [
  { label: "Noto Sans Bengali", value: "'Noto Sans Bengali', sans-serif" },
  { label: "Hind Siliguri", value: "'Hind Siliguri', sans-serif" },
  { label: "Arial", value: "Arial, sans-serif" },
];

const defaultOverlay: TextOverlay = {
  text: "আপনার টেক্সট লিখুন",
  x: 50,
  y: 50,
  fontSize: 32,
  color: "#ffffff",
  fontFamily: "'Noto Sans Bengali', sans-serif",
};

export default function AdminPhotocard() {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const [bgImage, setBgImage] = useState<string | null>(null);
  const [bgColor, setBgColor] = useState("#1e3a5f");
  const [overlays, setOverlays] = useState<TextOverlay[]>([{ ...defaultOverlay }]);
  const [selectedIdx, setSelectedIdx] = useState(0);
  const [canvasSize] = useState({ w: 800, h: 600 });

  const loadBgImage = (file: File) => {
    const reader = new FileReader();
    reader.onload = () => setBgImage(reader.result as string);
    reader.readAsDataURL(file);
  };

  const updateOverlay = (idx: number, updates: Partial<TextOverlay>) => {
    setOverlays(prev => prev.map((o, i) => (i === idx ? { ...o, ...updates } : o)));
  };

  const addOverlay = () => {
    setOverlays(prev => [...prev, { ...defaultOverlay, y: 50 + prev.length * 50, text: `টেক্সট ${prev.length + 1}` }]);
    setSelectedIdx(overlays.length);
  };

  const removeOverlay = (idx: number) => {
    if (overlays.length <= 1) return;
    setOverlays(prev => prev.filter((_, i) => i !== idx));
    setSelectedIdx(Math.max(0, idx - 1));
  };

  const renderCanvas = (): Promise<HTMLCanvasElement> => {
    return new Promise((resolve) => {
      const canvas = canvasRef.current!;
      const ctx = canvas.getContext("2d")!;
      canvas.width = canvasSize.w;
      canvas.height = canvasSize.h;

      const draw = () => {
        if (!bgImage) {
          ctx.fillStyle = bgColor;
          ctx.fillRect(0, 0, canvas.width, canvas.height);
        }
        
        overlays.forEach(o => {
          ctx.font = `bold ${o.fontSize}px ${o.fontFamily}`;
          ctx.fillStyle = o.color;
          ctx.textAlign = "center";
          ctx.shadowColor = "rgba(0,0,0,0.5)";
          ctx.shadowBlur = 4;
          ctx.shadowOffsetX = 2;
          ctx.shadowOffsetY = 2;
          
          const x = (o.x / 100) * canvas.width;
          const y = (o.y / 100) * canvas.height;
          
          const lines = o.text.split("\n");
          lines.forEach((line, i) => {
            ctx.fillText(line, x, y + i * (o.fontSize * 1.3));
          });
          ctx.shadowColor = "transparent";
        });
        resolve(canvas);
      };

      if (bgImage) {
        const img = new window.Image();
        img.crossOrigin = "anonymous";
        img.onload = () => {
          ctx.drawImage(img, 0, 0, canvas.width, canvas.height);
          draw();
        };
        img.src = bgImage;
      } else {
        draw();
      }
    });
  };

  const downloadImage = async () => {
    const canvas = await renderCanvas();
    const link = document.createElement("a");
    link.download = "photocard.png";
    link.href = canvas.toDataURL("image/png");
    link.click();
  };

  const selected = overlays[selectedIdx];

  return (
    <div>
      <h1 className="font-heading font-bold text-2xl mb-6">🖼️ ফটোকার্ড মেকার</h1>

      <div className="grid lg:grid-cols-2 gap-6">
        {/* Preview */}
        <div className="space-y-4">
          <div
            className="relative rounded-xl overflow-hidden border border-border"
            style={{
              aspectRatio: `${canvasSize.w}/${canvasSize.h}`,
              backgroundColor: bgColor,
              backgroundImage: bgImage ? `url(${bgImage})` : undefined,
              backgroundSize: "cover",
              backgroundPosition: "center",
            }}
          >
            {overlays.map((o, i) => (
              <div
                key={i}
                onClick={() => setSelectedIdx(i)}
                className={`absolute cursor-pointer select-none transition-all ${
                  selectedIdx === i ? "ring-2 ring-primary ring-offset-2" : ""
                }`}
                style={{
                  left: `${o.x}%`,
                  top: `${o.y}%`,
                  transform: "translate(-50%, -50%)",
                  fontSize: `${o.fontSize * 0.5}px`,
                  color: o.color,
                  fontFamily: o.fontFamily,
                  fontWeight: "bold",
                  textShadow: "2px 2px 4px rgba(0,0,0,0.5)",
                  whiteSpace: "pre-line",
                  textAlign: "center",
                }}
              >
                {o.text}
              </div>
            ))}
          </div>
          <canvas ref={canvasRef} className="hidden" />
          <button
            onClick={downloadImage}
            className="w-full flex items-center justify-center gap-2 px-4 py-2.5 rounded-lg bg-primary text-primary-foreground font-medium text-sm"
          >
            <Download className="h-4 w-4" /> PNG ডাউনলোড
          </button>
        </div>

        {/* Controls */}
        <div className="space-y-4">
          {/* Background */}
          <div className="bg-card rounded-xl border border-border p-4">
            <h3 className="font-heading font-semibold text-sm mb-3 flex items-center gap-2">
              <ImageIcon className="h-4 w-4" /> ব্যাকগ্রাউন্ড
            </h3>
            <div className="flex gap-3 items-center">
              <label className="flex items-center gap-2 text-sm">
                <Palette className="h-4 w-4" />
                <input
                  type="color"
                  value={bgColor}
                  onChange={e => { setBgColor(e.target.value); setBgImage(null); }}
                  className="w-8 h-8 rounded cursor-pointer"
                />
              </label>
              <span className="text-muted-foreground text-xs">বা</span>
              <label className="flex-1">
                <input
                  type="file"
                  accept="image/*"
                  onChange={e => e.target.files?.[0] && loadBgImage(e.target.files[0])}
                  className="w-full text-xs file:mr-2 file:py-1.5 file:px-3 file:rounded-lg file:border-0 file:text-sm file:bg-muted file:text-foreground"
                />
              </label>
            </div>
          </div>

          {/* Text overlays */}
          <div className="bg-card rounded-xl border border-border p-4">
            <div className="flex items-center justify-between mb-3">
              <h3 className="font-heading font-semibold text-sm flex items-center gap-2">
                <Type className="h-4 w-4" /> টেক্সট লেয়ার ({overlays.length})
              </h3>
              <button onClick={addOverlay} className="text-xs px-2 py-1 rounded bg-muted hover:bg-muted/80">+ নতুন</button>
            </div>

            <div className="flex gap-1 mb-3 flex-wrap">
              {overlays.map((_, i) => (
                <button
                  key={i}
                  onClick={() => setSelectedIdx(i)}
                  className={`text-xs px-2.5 py-1 rounded ${selectedIdx === i ? "bg-primary text-primary-foreground" : "bg-muted"}`}
                >
                  লেয়ার {i + 1}
                </button>
              ))}
            </div>

            {selected && (
              <div className="space-y-3">
                <textarea
                  value={selected.text}
                  onChange={e => updateOverlay(selectedIdx, { text: e.target.value })}
                  rows={2}
                  className="w-full px-3 py-2 rounded-lg border border-input bg-background text-sm focus:outline-none focus:ring-2 focus:ring-ring"
                  placeholder="টেক্সট লিখুন..."
                />
                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <label className="text-xs text-muted-foreground">X পজিশন (%)</label>
                    <input type="range" min={0} max={100} value={selected.x} onChange={e => updateOverlay(selectedIdx, { x: Number(e.target.value) })} className="w-full" />
                  </div>
                  <div>
                    <label className="text-xs text-muted-foreground">Y পজিশন (%)</label>
                    <input type="range" min={0} max={100} value={selected.y} onChange={e => updateOverlay(selectedIdx, { y: Number(e.target.value) })} className="w-full" />
                  </div>
                  <div>
                    <label className="text-xs text-muted-foreground">ফন্ট সাইজ</label>
                    <input type="number" min={12} max={120} value={selected.fontSize} onChange={e => updateOverlay(selectedIdx, { fontSize: Number(e.target.value) })} className="w-full px-3 py-1.5 rounded-lg border border-input bg-background text-sm" />
                  </div>
                  <div>
                    <label className="text-xs text-muted-foreground">রং</label>
                    <input type="color" value={selected.color} onChange={e => updateOverlay(selectedIdx, { color: e.target.value })} className="w-full h-9 rounded cursor-pointer" />
                  </div>
                </div>
                <div>
                  <label className="text-xs text-muted-foreground">ফন্ট</label>
                  <select value={selected.fontFamily} onChange={e => updateOverlay(selectedIdx, { fontFamily: e.target.value })} className="w-full mt-1 px-3 py-2 rounded-lg border border-input bg-background text-sm">
                    {fonts.map(f => <option key={f.value} value={f.value}>{f.label}</option>)}
                  </select>
                </div>
                <div className="flex gap-2">
                  <button onClick={() => removeOverlay(selectedIdx)} disabled={overlays.length <= 1} className="text-xs px-3 py-1.5 rounded bg-destructive/10 text-destructive disabled:opacity-30">
                    লেয়ার মুছুন
                  </button>
                  <button onClick={() => setOverlays([{ ...defaultOverlay }])} className="text-xs px-3 py-1.5 rounded bg-muted flex items-center gap-1">
                    <RotateCcw className="h-3 w-3" /> রিসেট
                  </button>
                </div>
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
