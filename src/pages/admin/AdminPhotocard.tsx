import { useState, useRef } from "react";
import { Download, Type, Image as ImageIcon, Palette, RotateCcw, Upload, Sparkles } from "lucide-react";

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

type Template = {
  id: string;
  name: string;
  bgColor: string;
  bgGradient?: string;
  overlays: TextOverlay[];
  aspectRatio: string;
};

const builtInTemplates: Template[] = [
  {
    id: "eid-mubarak",
    name: "🌙 ঈদ মোবারক",
    bgColor: "#0d4a2e",
    bgGradient: "linear-gradient(135deg, #0d4a2e 0%, #1a6b42 50%, #0d4a2e 100%)",
    overlays: [
      { text: "ঈদ মোবারক", x: 50, y: 35, fontSize: 48, color: "#f0c040", fontFamily: "'Noto Sans Bengali', sans-serif" },
      { text: "সকলকে জানাই ঈদের শুভেচ্ছা", x: 50, y: 55, fontSize: 22, color: "#ffffff", fontFamily: "'Hind Siliguri', sans-serif" },
    ],
    aspectRatio: "4/3",
  },
  {
    id: "birthday",
    name: "🎂 জন্মদিন",
    bgColor: "#4a1942",
    bgGradient: "linear-gradient(135deg, #4a1942 0%, #7b2d8e 50%, #4a1942 100%)",
    overlays: [
      { text: "শুভ জন্মদিন!", x: 50, y: 30, fontSize: 44, color: "#ffcc00", fontFamily: "'Noto Sans Bengali', sans-serif" },
      { text: "নাম লিখুন", x: 50, y: 55, fontSize: 28, color: "#ffffff", fontFamily: "'Hind Siliguri', sans-serif" },
      { text: "🎉🎈🎁", x: 50, y: 75, fontSize: 36, color: "#ffffff", fontFamily: "Arial, sans-serif" },
    ],
    aspectRatio: "1/1",
  },
  {
    id: "victory-day",
    name: "🇧🇩 বিজয় দিবস",
    bgColor: "#006a4e",
    bgGradient: "linear-gradient(180deg, #006a4e 0%, #004d38 100%)",
    overlays: [
      { text: "বিজয় দিবস", x: 50, y: 30, fontSize: 48, color: "#f42a41", fontFamily: "'Noto Sans Bengali', sans-serif" },
      { text: "১৬ ডিসেম্বর", x: 50, y: 55, fontSize: 28, color: "#ffffff", fontFamily: "'Hind Siliguri', sans-serif" },
      { text: "জয় বাংলা 🇧🇩", x: 50, y: 75, fontSize: 24, color: "#f0c040", fontFamily: "'Noto Sans Bengali', sans-serif" },
    ],
    aspectRatio: "16/9",
  },
  {
    id: "social-post",
    name: "📱 সোশ্যাল পোস্ট",
    bgColor: "#1a365d",
    bgGradient: "linear-gradient(135deg, #1a365d 0%, #2a4a7f 50%, #1a365d 100%)",
    overlays: [
      { text: "আজকের খবর", x: 50, y: 25, fontSize: 38, color: "#60a5fa", fontFamily: "'Noto Sans Bengali', sans-serif" },
      { text: "বিস্তারিত লিখুন এখানে", x: 50, y: 55, fontSize: 20, color: "#e2e8f0", fontFamily: "'Hind Siliguri', sans-serif" },
      { text: "গলাচিপা ব্লগ", x: 50, y: 85, fontSize: 16, color: "#94a3b8", fontFamily: "'Hind Siliguri', sans-serif" },
    ],
    aspectRatio: "1/1",
  },
  {
    id: "invitation",
    name: "💌 দাওয়াত",
    bgColor: "#7f1d1d",
    bgGradient: "linear-gradient(135deg, #7f1d1d 0%, #991b1b 50%, #7f1d1d 100%)",
    overlays: [
      { text: "দাওয়াত", x: 50, y: 25, fontSize: 44, color: "#fbbf24", fontFamily: "'Noto Sans Bengali', sans-serif" },
      { text: "অনুষ্ঠানের নাম", x: 50, y: 45, fontSize: 26, color: "#ffffff", fontFamily: "'Hind Siliguri', sans-serif" },
      { text: "তারিখ ও সময়", x: 50, y: 65, fontSize: 20, color: "#fde68a", fontFamily: "'Hind Siliguri', sans-serif" },
      { text: "স্থান: আপনার ঠিকানা", x: 50, y: 80, fontSize: 16, color: "#fecaca", fontFamily: "'Hind Siliguri', sans-serif" },
    ],
    aspectRatio: "4/5",
  },
  {
    id: "blank",
    name: "⬜ খালি ক্যানভাস",
    bgColor: "#1e3a5f",
    overlays: [{ ...defaultOverlay }],
    aspectRatio: "4/3",
  },
];

const aspectRatios = [
  { label: "4:3", value: "4/3", w: 800, h: 600 },
  { label: "1:1", value: "1/1", w: 800, h: 800 },
  { label: "16:9", value: "16/9", w: 960, h: 540 },
  { label: "4:5", value: "4/5", w: 640, h: 800 },
  { label: "9:16", value: "9/16", w: 540, h: 960 },
];

export default function AdminPhotocard() {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const [bgImage, setBgImage] = useState<string | null>(null);
  const [bgColor, setBgColor] = useState("#1e3a5f");
  const [bgGradient, setBgGradient] = useState<string | undefined>();
  const [overlays, setOverlays] = useState<TextOverlay[]>([{ ...defaultOverlay }]);
  const [selectedIdx, setSelectedIdx] = useState(0);
  const [aspectRatio, setAspectRatio] = useState("4/3");
  const [customTemplates, setCustomTemplates] = useState<Template[]>([]);
  const [templateName, setTemplateName] = useState("");
  const [showSaveTemplate, setShowSaveTemplate] = useState(false);

  const ar = aspectRatios.find(a => a.value === aspectRatio) ?? aspectRatios[0];

  const loadBgImage = (file: File) => {
    const reader = new FileReader();
    reader.onload = () => { setBgImage(reader.result as string); setBgGradient(undefined); };
    reader.readAsDataURL(file);
  };

  const applyTemplate = (t: Template) => {
    setBgColor(t.bgColor);
    setBgGradient(t.bgGradient);
    setBgImage(null);
    setOverlays(t.overlays.map(o => ({ ...o })));
    setAspectRatio(t.aspectRatio);
    setSelectedIdx(0);
  };

  const saveAsTemplate = () => {
    if (!templateName.trim()) return;
    const t: Template = {
      id: `custom_${Date.now()}`,
      name: `🎨 ${templateName}`,
      bgColor,
      bgGradient,
      overlays: overlays.map(o => ({ ...o })),
      aspectRatio,
    };
    setCustomTemplates(prev => [...prev, t]);
    setShowSaveTemplate(false);
    setTemplateName("");
  };

  const updateOverlay = (idx: number, updates: Partial<TextOverlay>) => {
    setOverlays(prev => prev.map((o, i) => (i === idx ? { ...o, ...updates } : o)));
  };

  const addOverlay = () => {
    setOverlays(prev => [...prev, { ...defaultOverlay, y: 50 + prev.length * 15, text: `টেক্সট ${prev.length + 1}` }]);
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
      canvas.width = ar.w;
      canvas.height = ar.h;

      const draw = () => {
        if (!bgImage) {
          if (bgGradient) {
            // Parse gradient - simple linear gradient rendering
            ctx.fillStyle = bgColor;
            ctx.fillRect(0, 0, canvas.width, canvas.height);
            const grad = ctx.createLinearGradient(0, 0, canvas.width, canvas.height);
            grad.addColorStop(0, bgColor);
            grad.addColorStop(0.5, adjustColor(bgColor, 30));
            grad.addColorStop(1, bgColor);
            ctx.fillStyle = grad;
            ctx.fillRect(0, 0, canvas.width, canvas.height);
          } else {
            ctx.fillStyle = bgColor;
            ctx.fillRect(0, 0, canvas.width, canvas.height);
          }
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
        img.onload = () => { ctx.drawImage(img, 0, 0, canvas.width, canvas.height); draw(); };
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
  const allTemplates = [...builtInTemplates, ...customTemplates];

  return (
    <div>
      <h1 className="font-heading font-bold text-2xl mb-4">🖼️ ফটোকার্ড মেকার</h1>

      {/* Templates */}
      <div className="mb-4">
        <div className="flex items-center justify-between mb-2">
          <h3 className="text-sm font-medium text-muted-foreground">📐 টেমপ্লেট বাছুন</h3>
          <button onClick={() => setShowSaveTemplate(!showSaveTemplate)} className="text-xs px-2.5 py-1 rounded bg-muted hover:bg-muted/80 flex items-center gap-1">
            <Sparkles className="h-3 w-3" /> টেমপ্লেট সেভ
          </button>
        </div>
        {showSaveTemplate && (
          <div className="flex gap-2 mb-3">
            <input value={templateName} onChange={e => setTemplateName(e.target.value)} placeholder="টেমপ্লেটের নাম..." className="flex-1 px-3 py-1.5 text-sm rounded-lg border border-input bg-background" />
            <button onClick={saveAsTemplate} className="px-3 py-1.5 text-sm rounded-lg bg-primary text-primary-foreground">সেভ</button>
          </div>
        )}
        <div className="grid grid-cols-3 sm:grid-cols-6 gap-2">
          {allTemplates.map(t => (
            <button key={t.id} onClick={() => applyTemplate(t)} className="p-2 rounded-lg border border-border hover:border-primary/50 hover:bg-muted/50 transition-colors text-center">
              <div className="w-full aspect-video rounded mb-1" style={{ background: t.bgGradient || t.bgColor }} />
              <span className="text-xs truncate block">{t.name}</span>
            </button>
          ))}
        </div>
      </div>

      <div className="grid lg:grid-cols-2 gap-6">
        {/* Preview */}
        <div className="space-y-3">
          {/* Aspect ratio selector */}
          <div className="flex gap-1.5">
            {aspectRatios.map(a => (
              <button key={a.value} onClick={() => setAspectRatio(a.value)} className={`text-xs px-2.5 py-1 rounded ${aspectRatio === a.value ? "bg-primary text-primary-foreground" : "bg-muted"}`}>{a.label}</button>
            ))}
          </div>

          <div
            className="relative rounded-xl overflow-hidden border border-border"
            style={{
              aspectRatio,
              background: bgImage ? `url(${bgImage}) center/cover` : (bgGradient || bgColor),
            }}
          >
            {overlays.map((o, i) => (
              <div
                key={i}
                onClick={() => setSelectedIdx(i)}
                className={`absolute cursor-pointer select-none transition-all ${selectedIdx === i ? "ring-2 ring-primary ring-offset-2" : ""}`}
                style={{
                  left: `${o.x}%`, top: `${o.y}%`, transform: "translate(-50%, -50%)",
                  fontSize: `${o.fontSize * 0.5}px`, color: o.color, fontFamily: o.fontFamily,
                  fontWeight: "bold", textShadow: "2px 2px 4px rgba(0,0,0,0.5)",
                  whiteSpace: "pre-line", textAlign: "center",
                }}
              >
                {o.text}
              </div>
            ))}
          </div>
          <canvas ref={canvasRef} className="hidden" />
          <button onClick={downloadImage} className="w-full flex items-center justify-center gap-2 px-4 py-2.5 rounded-lg bg-primary text-primary-foreground font-medium text-sm">
            <Download className="h-4 w-4" /> PNG ডাউনলোড
          </button>
        </div>

        {/* Controls */}
        <div className="space-y-4">
          {/* Background */}
          <div className="bg-card rounded-xl border border-border p-4">
            <h3 className="font-heading font-semibold text-sm mb-3 flex items-center gap-2"><ImageIcon className="h-4 w-4" /> ব্যাকগ্রাউন্ড</h3>
            <div className="flex gap-3 items-center">
              <label className="flex items-center gap-2 text-sm">
                <Palette className="h-4 w-4" />
                <input type="color" value={bgColor} onChange={e => { setBgColor(e.target.value); setBgImage(null); setBgGradient(undefined); }} className="w-8 h-8 rounded cursor-pointer" />
              </label>
              <span className="text-muted-foreground text-xs">বা</span>
              <label className="flex-1">
                <input type="file" accept="image/*" onChange={e => e.target.files?.[0] && loadBgImage(e.target.files[0])} className="w-full text-xs file:mr-2 file:py-1.5 file:px-3 file:rounded-lg file:border-0 file:text-sm file:bg-muted file:text-foreground" />
              </label>
            </div>
          </div>

          {/* Text overlays */}
          <div className="bg-card rounded-xl border border-border p-4">
            <div className="flex items-center justify-between mb-3">
              <h3 className="font-heading font-semibold text-sm flex items-center gap-2"><Type className="h-4 w-4" /> টেক্সট লেয়ার ({overlays.length})</h3>
              <button onClick={addOverlay} className="text-xs px-2 py-1 rounded bg-muted hover:bg-muted/80">+ নতুন</button>
            </div>
            <div className="flex gap-1 mb-3 flex-wrap">
              {overlays.map((_, i) => (
                <button key={i} onClick={() => setSelectedIdx(i)} className={`text-xs px-2.5 py-1 rounded ${selectedIdx === i ? "bg-primary text-primary-foreground" : "bg-muted"}`}>লেয়ার {i + 1}</button>
              ))}
            </div>
            {selected && (
              <div className="space-y-3">
                <textarea value={selected.text} onChange={e => updateOverlay(selectedIdx, { text: e.target.value })} rows={2} className="w-full px-3 py-2 rounded-lg border border-input bg-background text-sm focus:outline-none focus:ring-2 focus:ring-ring" placeholder="টেক্সট লিখুন..." />
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
                  <button onClick={() => removeOverlay(selectedIdx)} disabled={overlays.length <= 1} className="text-xs px-3 py-1.5 rounded bg-destructive/10 text-destructive disabled:opacity-30">লেয়ার মুছুন</button>
                  <button onClick={() => { setOverlays([{ ...defaultOverlay }]); setBgGradient(undefined); }} className="text-xs px-3 py-1.5 rounded bg-muted flex items-center gap-1"><RotateCcw className="h-3 w-3" /> রিসেট</button>
                </div>
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}

function adjustColor(hex: string, amount: number): string {
  const num = parseInt(hex.replace("#", ""), 16);
  const r = Math.min(255, ((num >> 16) & 0xff) + amount);
  const g = Math.min(255, ((num >> 8) & 0xff) + amount);
  const b = Math.min(255, (num & 0xff) + amount);
  return `rgb(${r},${g},${b})`;
}
