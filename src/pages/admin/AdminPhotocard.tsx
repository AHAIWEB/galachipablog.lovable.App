import { useState, useRef, useEffect } from "react";
import { useSearchParams } from "react-router-dom";
import { Download, Type, Image as ImageIcon, Palette, RotateCcw, Upload, Sparkles, Lock, Unlock, Share2, Send, Sticker, X } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";

type TextOverlay = {
  text: string;
  x: number;
  y: number;
  fontSize: number;
  color: string;
  fontFamily: string;
  isFixed: boolean;
};

type LogoOverlay = {
  src: string;
  x: number;
  y: number;
  width: number;
  height: number;
  isFixed: boolean;
};

type StickerOverlay = {
  emoji: string;
  x: number;
  y: number;
  size: number;
};

const stickerPacks = [
  { name: "ইমোজি", stickers: ["🌙", "⭐", "🌟", "✨", "🎉", "🎊", "🎈", "🎁", "❤️", "💚", "🇧🇩", "🕌", "🌹", "🔥", "👏", "🙏"] },
  { name: "প্রতীক", stickers: ["☪️", "🕋", "📿", "🪔", "🏵️", "💐", "🎗️", "🏆", "🎯", "📌", "🔔", "📢", "🎤", "📰", "✅", "⚡"] },
  { name: "পতাকা ও চিহ্ন", stickers: ["🇧🇩", "🏴", "🚩", "🏳️", "⚓", "🛡️", "🎖️", "🏅", "🥇", "🎀", "💫", "🌈", "☀️", "🌙", "💎", "👑"] },
];

const googleFonts = [
  { label: "Noto Sans Bengali", value: "'Noto Sans Bengali', sans-serif", url: "" },
  { label: "Hind Siliguri", value: "'Hind Siliguri', sans-serif", url: "" },
  { label: "Anek Bangla", value: "'Anek Bangla', sans-serif", url: "https://fonts.googleapis.com/css2?family=Anek+Bangla:wght@400;500;600;700&display=swap" },
  { label: "Galada", value: "'Galada', cursive", url: "https://fonts.googleapis.com/css2?family=Galada&display=swap" },
  { label: "Tiro Bangla", value: "'Tiro Bangla', serif", url: "https://fonts.googleapis.com/css2?family=Tiro+Bangla&display=swap" },
  { label: "Baloo Da 2", value: "'Baloo Da 2', sans-serif", url: "https://fonts.googleapis.com/css2?family=Baloo+Da+2:wght@400;500;600;700&display=swap" },
  { label: "Mina", value: "'Mina', sans-serif", url: "https://fonts.googleapis.com/css2?family=Mina:wght@400;700&display=swap" },
  { label: "Arial", value: "Arial, sans-serif", url: "" },
  { label: "Impact", value: "Impact, sans-serif", url: "" },
  { label: "Georgia", value: "Georgia, serif", url: "" },
];

const loadedFonts = new Set<string>();
function loadGoogleFont(font: typeof googleFonts[0]) {
  if (!font.url || loadedFonts.has(font.url)) return;
  const link = document.createElement("link");
  link.rel = "stylesheet";
  link.href = font.url;
  document.head.appendChild(link);
  loadedFonts.add(font.url);
}

const defaultOverlay: TextOverlay = {
  text: "আপনার টেক্সট লিখুন",
  x: 50, y: 50, fontSize: 32,
  color: "#ffffff",
  fontFamily: "'Noto Sans Bengali', sans-serif",
  isFixed: false,
};

type Template = {
  id: string; name: string; bgColor: string;
  bgGradient?: string; overlays: TextOverlay[]; aspectRatio: string;
};

const builtInTemplates: Template[] = [
  {
    id: "eid", name: "🌙 ঈদ মোবারক", bgColor: "#0d4a2e",
    bgGradient: "linear-gradient(135deg, #0d4a2e 0%, #1a6b42 50%, #0d4a2e 100%)",
    overlays: [
      { text: "ঈদ মোবারক", x: 50, y: 35, fontSize: 48, color: "#f0c040", fontFamily: "'Noto Sans Bengali', sans-serif", isFixed: false },
      { text: "সকলকে জানাই শুভেচ্ছা", x: 50, y: 55, fontSize: 22, color: "#ffffff", fontFamily: "'Hind Siliguri', sans-serif", isFixed: false },
    ],
    aspectRatio: "4/3",
  },
  {
    id: "birthday", name: "🎂 জন্মদিন", bgColor: "#4a1942",
    bgGradient: "linear-gradient(135deg, #4a1942 0%, #7b2d8e 50%, #4a1942 100%)",
    overlays: [
      { text: "শুভ জন্মদিন!", x: 50, y: 30, fontSize: 44, color: "#ffcc00", fontFamily: "'Noto Sans Bengali', sans-serif", isFixed: false },
      { text: "নাম লিখুন", x: 50, y: 55, fontSize: 28, color: "#ffffff", fontFamily: "'Hind Siliguri', sans-serif", isFixed: false },
      { text: "🎉🎈🎁", x: 50, y: 75, fontSize: 36, color: "#ffffff", fontFamily: "Arial, sans-serif", isFixed: true },
    ],
    aspectRatio: "1/1",
  },
  {
    id: "victory", name: "🇧🇩 বিজয় দিবস", bgColor: "#006a4e",
    bgGradient: "linear-gradient(180deg, #006a4e 0%, #004d38 100%)",
    overlays: [
      { text: "বিজয় দিবস", x: 50, y: 30, fontSize: 48, color: "#f42a41", fontFamily: "'Noto Sans Bengali', sans-serif", isFixed: false },
      { text: "১৬ ডিসেম্বর", x: 50, y: 55, fontSize: 28, color: "#ffffff", fontFamily: "'Hind Siliguri', sans-serif", isFixed: false },
      { text: "জয় বাংলা 🇧🇩", x: 50, y: 75, fontSize: 24, color: "#f0c040", fontFamily: "'Noto Sans Bengali', sans-serif", isFixed: true },
    ],
    aspectRatio: "16/9",
  },
  {
    id: "social", name: "📱 সোশ্যাল পোস্ট", bgColor: "#1a365d",
    bgGradient: "linear-gradient(135deg, #1a365d 0%, #2a4a7f 50%, #1a365d 100%)",
    overlays: [
      { text: "আজকের খবর", x: 50, y: 25, fontSize: 38, color: "#60a5fa", fontFamily: "'Noto Sans Bengali', sans-serif", isFixed: false },
      { text: "বিস্তারিত লিখুন", x: 50, y: 55, fontSize: 20, color: "#e2e8f0", fontFamily: "'Hind Siliguri', sans-serif", isFixed: false },
      { text: "গলাচিপা ব্লগ", x: 50, y: 85, fontSize: 16, color: "#94a3b8", fontFamily: "'Hind Siliguri', sans-serif", isFixed: true },
    ],
    aspectRatio: "1/1",
  },
  {
    id: "invite", name: "💌 দাওয়াত", bgColor: "#7f1d1d",
    bgGradient: "linear-gradient(135deg, #7f1d1d 0%, #991b1b 50%, #7f1d1d 100%)",
    overlays: [
      { text: "দাওয়াত", x: 50, y: 25, fontSize: 44, color: "#fbbf24", fontFamily: "'Noto Sans Bengali', sans-serif", isFixed: false },
      { text: "অনুষ্ঠানের নাম", x: 50, y: 45, fontSize: 26, color: "#ffffff", fontFamily: "'Hind Siliguri', sans-serif", isFixed: false },
      { text: "তারিখ ও সময়", x: 50, y: 65, fontSize: 20, color: "#fde68a", fontFamily: "'Hind Siliguri', sans-serif", isFixed: false },
    ],
    aspectRatio: "4/5",
  },
  {
    id: "quote", name: "💬 উক্তি কার্ড", bgColor: "#0f172a",
    bgGradient: "linear-gradient(135deg, #0f172a 0%, #1e293b 100%)",
    overlays: [
      { text: "❝", x: 15, y: 20, fontSize: 64, color: "#3b82f6", fontFamily: "Georgia, serif", isFixed: true },
      { text: "এখানে আপনার উক্তি লিখুন", x: 50, y: 45, fontSize: 24, color: "#f1f5f9", fontFamily: "'Noto Sans Bengali', sans-serif", isFixed: false },
      { text: "— লেখক", x: 70, y: 75, fontSize: 18, color: "#64748b", fontFamily: "'Hind Siliguri', sans-serif", isFixed: false },
    ],
    aspectRatio: "1/1",
  },
  {
    id: "news-break", name: "🔴 ব্রেকিং নিউজ", bgColor: "#991b1b",
    bgGradient: "linear-gradient(to right, #991b1b, #b91c1c, #991b1b)",
    overlays: [
      { text: "ব্রেকিং নিউজ", x: 50, y: 20, fontSize: 40, color: "#ffffff", fontFamily: "Impact, sans-serif", isFixed: true },
      { text: "খবরের শিরোনাম লিখুন", x: 50, y: 50, fontSize: 28, color: "#fef08a", fontFamily: "'Noto Sans Bengali', sans-serif", isFixed: false },
      { text: "গলাচিপা ব্লগ", x: 50, y: 85, fontSize: 14, color: "#fca5a5", fontFamily: "'Hind Siliguri', sans-serif", isFixed: true },
    ],
    aspectRatio: "16/9",
  },
  {
    id: "blank", name: "⬜ খালি ক্যানভাস", bgColor: "#1e3a5f",
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
  const [customFonts, setCustomFonts] = useState<{ label: string; value: string }[]>([]);

  // Logo overlay state
  const [logoOverlay, setLogoOverlay] = useState<LogoOverlay | null>(null);

  // Stickers state
  const [stickers, setStickers] = useState<StickerOverlay[]>([]);
  const [showStickerPanel, setShowStickerPanel] = useState(false);
  const [selectedStickerIdx, setSelectedStickerIdx] = useState<number | null>(null);

  // Prefill from URL params (e.g. opened from "Make Card" on a post)
  const [searchParams] = useSearchParams();
  useEffect(() => {
    const t = searchParams.get("title");
    const img = searchParams.get("image");
    if (img) setBgImage(img);
    if (t) {
      setOverlays([{ ...defaultOverlay, text: t.slice(0, 200) }]);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const ar = aspectRatios.find(a => a.value === aspectRatio) ?? aspectRatios[0];
  const allFonts = [...googleFonts, ...customFonts];

  const handleFontUpload = (file: File) => {
    const fontName = file.name.replace(/\.(ttf|woff|woff2|otf)$/i, "");
    const url = URL.createObjectURL(file);
    const fontFace = new FontFace(fontName, `url(${url})`);
    fontFace.load().then(loaded => {
      document.fonts.add(loaded);
      setCustomFonts(prev => [...prev, { label: `📁 ${fontName}`, value: `'${fontName}', sans-serif` }]);
      toast.success(`ফন্ট "${fontName}" যোগ হয়েছে`);
    }).catch(() => toast.error("ফন্ট লোড ব্যর্থ"));
  };

  const loadBgImage = (file: File) => {
    const reader = new FileReader();
    reader.onload = () => { setBgImage(reader.result as string); setBgGradient(undefined); };
    reader.readAsDataURL(file);
  };

  const handleLogoUpload = (file: File) => {
    const reader = new FileReader();
    reader.onload = () => {
      setLogoOverlay({
        src: reader.result as string,
        x: 50, y: 85,
        width: 80, height: 40,
        isFixed: false,
      });
      toast.success("লোগো যোগ হয়েছে");
    };
    reader.readAsDataURL(file);
  };

  const addSticker = (emoji: string) => {
    const newSticker: StickerOverlay = { emoji, x: 50, y: 50, size: 40 };
    setStickers(prev => [...prev, newSticker]);
    setSelectedStickerIdx(stickers.length);
    toast.success("স্টিকার যোগ হয়েছে");
  };

  const updateSticker = (idx: number, updates: Partial<StickerOverlay>) => {
    setStickers(prev => prev.map((s, i) => i === idx ? { ...s, ...updates } : s));
  };

  const removeSticker = (idx: number) => {
    setStickers(prev => prev.filter((_, i) => i !== idx));
    setSelectedStickerIdx(null);
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
      id: `custom_${Date.now()}`, name: `🎨 ${templateName}`,
      bgColor, bgGradient, overlays: overlays.map(o => ({ ...o })), aspectRatio,
    };
    setCustomTemplates(prev => [...prev, t]);
    setShowSaveTemplate(false);
    setTemplateName("");
    toast.success("টেমপ্লেট সেভ হয়েছে");
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

      const drawContent = () => {
        if (!bgImage) {
          if (bgGradient) {
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

        // Draw text overlays
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
          o.text.split("\n").forEach((line, i) => {
            ctx.fillText(line, x, y + i * (o.fontSize * 1.3));
          });
          ctx.shadowColor = "transparent";
        });

        // Draw stickers
        stickers.forEach(s => {
          ctx.font = `${s.size}px Arial`;
          ctx.textAlign = "center";
          ctx.textBaseline = "middle";
          ctx.fillText(s.emoji, (s.x / 100) * canvas.width, (s.y / 100) * canvas.height);
        });
      };

      const drawLogoAndFinish = () => {
        if (logoOverlay) {
          const logoImg = new window.Image();
          logoImg.crossOrigin = "anonymous";
          logoImg.onload = () => {
            const lx = (logoOverlay.x / 100) * canvas.width - logoOverlay.width / 2;
            const ly = (logoOverlay.y / 100) * canvas.height - logoOverlay.height / 2;
            ctx.drawImage(logoImg, lx, ly, logoOverlay.width, logoOverlay.height);
            resolve(canvas);
          };
          logoImg.onerror = () => resolve(canvas);
          logoImg.src = logoOverlay.src;
        } else {
          resolve(canvas);
        }
      };

      if (bgImage) {
        const img = new window.Image();
        img.crossOrigin = "anonymous";
        img.onload = () => {
          ctx.drawImage(img, 0, 0, canvas.width, canvas.height);
          drawContent();
          drawLogoAndFinish();
        };
        img.src = bgImage;
      } else {
        drawContent();
        drawLogoAndFinish();
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

  const postToSite = async () => {
    const canvas = await renderCanvas();
    const dataUrl = canvas.toDataURL("image/png");
    toast.info("সাইটে পোস্ট করা হচ্ছে...");
    const slug = `photocard-${Date.now()}`;
    const { error } = await supabase.from("posts").insert({
      title: `ফটোকার্ড - ${new Date().toLocaleDateString("bn-BD")}`,
      slug,
      content: `<img src="${dataUrl}" alt="Photocard" style="max-width:100%" />`,
      featured_image: dataUrl,
      status: "published" as const,
    });
    if (error) toast.error("পোস্ট ব্যর্থ: " + error.message);
    else toast.success("সাইটে পোস্ট হয়েছে!");
  };

  const shareToSocial = async () => {
    const canvas = await renderCanvas();
    canvas.toBlob(async (blob) => {
      if (!blob) return;
      if (navigator.share) {
        const file = new File([blob], "photocard.png", { type: "image/png" });
        try {
          await navigator.share({ files: [file], title: "ফটোকার্ড" });
        } catch { toast.info("শেয়ার বাতিল হয়েছে"); }
      } else {
        toast.info("ব্রাউজারে শেয়ার সাপোর্ট নেই, ডাউনলোড করুন");
        downloadImage();
      }
    });
  };

  const selected = overlays[selectedIdx];
  const allTemplates = [...builtInTemplates, ...customTemplates];

  return (
    <div>
      <h1 className="font-heading font-bold text-2xl mb-4">🖼️ ফটোকার্ড মেকার</h1>

      {/* Templates */}
      <div className="mb-4">
        <div className="flex items-center justify-between mb-2">
          <h3 className="text-sm font-medium text-muted-foreground">📐 টেমপ্লেট</h3>
          <button onClick={() => setShowSaveTemplate(!showSaveTemplate)} className="text-xs px-2.5 py-1 rounded bg-muted hover:bg-muted/80 flex items-center gap-1">
            <Sparkles className="h-3 w-3" /> সেভ
          </button>
        </div>
        {showSaveTemplate && (
          <div className="flex gap-2 mb-3">
            <input value={templateName} onChange={e => setTemplateName(e.target.value)} placeholder="টেমপ্লেটের নাম..." className="flex-1 px-3 py-1.5 text-sm rounded-lg border border-input bg-background" />
            <button onClick={saveAsTemplate} className="px-3 py-1.5 text-sm rounded-lg bg-primary text-primary-foreground">সেভ</button>
          </div>
        )}
        <div className="grid grid-cols-4 sm:grid-cols-8 gap-2">
          {allTemplates.map(t => (
            <button key={t.id} onClick={() => applyTemplate(t)} className="p-1.5 rounded-lg border border-border hover:border-primary/50 hover:bg-muted/50 transition-colors text-center">
              <div className="w-full aspect-video rounded mb-1" style={{ background: t.bgGradient || t.bgColor }} />
              <span className="text-[10px] truncate block">{t.name}</span>
            </button>
          ))}
        </div>
      </div>

      <div className="grid lg:grid-cols-2 gap-5">
        {/* Preview */}
        <div className="space-y-3">
          <div className="flex gap-1.5 flex-wrap">
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
            {/* Text overlays */}
            {overlays.map((o, i) => (
              <div
                key={`text-${i}`}
                onClick={() => { setSelectedIdx(i); setSelectedStickerIdx(null); }}
                className={`absolute cursor-pointer select-none transition-all ${selectedIdx === i && selectedStickerIdx === null ? "ring-2 ring-primary ring-offset-2" : ""}`}
                style={{
                  left: `${o.x}%`, top: `${o.y}%`, transform: "translate(-50%, -50%)",
                  fontSize: `${o.fontSize * 0.5}px`, color: o.color, fontFamily: o.fontFamily,
                  fontWeight: "bold", textShadow: "2px 2px 4px rgba(0,0,0,0.5)",
                  whiteSpace: "pre-line", textAlign: "center",
                }}
              >
                {o.isFixed && <Lock className="h-3 w-3 absolute -top-3 -right-3 text-yellow-400" />}
                {o.text}
              </div>
            ))}

            {/* Logo overlay */}
            {logoOverlay && (
              <div
                className={`absolute cursor-pointer select-none ${!selectedStickerIdx && selectedIdx === -1 ? "ring-2 ring-primary" : ""}`}
                onClick={() => { setSelectedIdx(-1); setSelectedStickerIdx(null); }}
                style={{
                  left: `${logoOverlay.x}%`, top: `${logoOverlay.y}%`,
                  transform: "translate(-50%, -50%)",
                  width: `${logoOverlay.width * 0.5}px`, height: `${logoOverlay.height * 0.5}px`,
                }}
              >
                {logoOverlay.isFixed && <Lock className="h-3 w-3 absolute -top-2 -right-2 text-yellow-400" />}
                <img src={logoOverlay.src} alt="Logo" className="w-full h-full object-contain" />
              </div>
            )}

            {/* Sticker overlays */}
            {stickers.map((s, i) => (
              <div
                key={`sticker-${i}`}
                onClick={() => { setSelectedStickerIdx(i); setSelectedIdx(-1); }}
                className={`absolute cursor-pointer select-none ${selectedStickerIdx === i ? "ring-2 ring-accent ring-offset-2 rounded" : ""}`}
                style={{
                  left: `${s.x}%`, top: `${s.y}%`,
                  transform: "translate(-50%, -50%)",
                  fontSize: `${s.size * 0.5}px`,
                }}
              >
                {s.emoji}
              </div>
            ))}
          </div>
          <canvas ref={canvasRef} className="hidden" />

          {/* Action buttons */}
          <div className="grid grid-cols-3 gap-2">
            <button onClick={downloadImage} className="flex items-center justify-center gap-1.5 px-3 py-2.5 rounded-lg bg-primary text-primary-foreground font-medium text-xs">
              <Download className="h-3.5 w-3.5" /> ডাউনলোড
            </button>
            <button onClick={postToSite} className="flex items-center justify-center gap-1.5 px-3 py-2.5 rounded-lg bg-secondary text-secondary-foreground font-medium text-xs">
              <Send className="h-3.5 w-3.5" /> সাইটে পোস্ট
            </button>
            <button onClick={shareToSocial} className="flex items-center justify-center gap-1.5 px-3 py-2.5 rounded-lg bg-accent text-accent-foreground font-medium text-xs">
              <Share2 className="h-3.5 w-3.5" /> শেয়ার
            </button>
          </div>
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
                <input type="file" accept="image/*" onChange={e => e.target.files?.[0] && loadBgImage(e.target.files[0])} className="w-full text-xs file:mr-2 file:py-1 file:px-2 file:rounded-lg file:border-0 file:text-xs file:bg-muted file:text-foreground" />
              </label>
            </div>
          </div>

          {/* Logo upload */}
          <div className="bg-card rounded-xl border border-border p-4">
            <h3 className="font-heading font-semibold text-sm mb-3 flex items-center gap-2"><Upload className="h-4 w-4" /> লোগো</h3>
            <input type="file" accept="image/*" onChange={e => e.target.files?.[0] && handleLogoUpload(e.target.files[0])} className="w-full text-xs file:mr-2 file:py-1 file:px-2 file:rounded-lg file:border-0 file:text-xs file:bg-muted file:text-foreground mb-2" />
            {logoOverlay && (
              <div className="space-y-2 mt-2">
                <div className="flex items-center gap-2 p-2 rounded-lg bg-muted/50">
                  <img src={logoOverlay.src} alt="Logo" className="h-8 w-auto object-contain rounded" />
                  <span className="text-xs text-muted-foreground flex-1">লোগো যোগ হয়েছে</span>
                </div>
                <div className="grid grid-cols-2 gap-2">
                  <div>
                    <label className="text-xs text-muted-foreground">X (%)</label>
                    <input type="range" min={0} max={100} value={logoOverlay.x} onChange={e => setLogoOverlay(p => p ? { ...p, x: Number(e.target.value) } : p)} className="w-full" />
                  </div>
                  <div>
                    <label className="text-xs text-muted-foreground">Y (%)</label>
                    <input type="range" min={0} max={100} value={logoOverlay.y} onChange={e => setLogoOverlay(p => p ? { ...p, y: Number(e.target.value) } : p)} className="w-full" />
                  </div>
                  <div>
                    <label className="text-xs text-muted-foreground">প্রস্থ (px)</label>
                    <input type="number" min={20} max={400} value={logoOverlay.width} onChange={e => setLogoOverlay(p => p ? { ...p, width: Number(e.target.value) } : p)} className="w-full px-2 py-1 rounded-lg border border-input bg-background text-sm" />
                  </div>
                  <div>
                    <label className="text-xs text-muted-foreground">উচ্চতা (px)</label>
                    <input type="number" min={20} max={400} value={logoOverlay.height} onChange={e => setLogoOverlay(p => p ? { ...p, height: Number(e.target.value) } : p)} className="w-full px-2 py-1 rounded-lg border border-input bg-background text-sm" />
                  </div>
                </div>
                <div className="flex gap-2">
                  <button
                    onClick={() => setLogoOverlay(p => p ? { ...p, isFixed: !p.isFixed } : p)}
                    className={`text-xs px-3 py-1.5 rounded flex items-center gap-1 ${logoOverlay.isFixed ? "bg-yellow-500/20 text-yellow-700" : "bg-muted"}`}
                  >
                    {logoOverlay.isFixed ? <Lock className="h-3 w-3" /> : <Unlock className="h-3 w-3" />}
                    {logoOverlay.isFixed ? "ফিক্সড" : "ফিক্সড করুন"}
                  </button>
                  <button onClick={() => setLogoOverlay(null)} className="text-xs px-3 py-1.5 rounded bg-destructive/10 text-destructive">মুছুন</button>
                </div>
              </div>
            )}
          </div>

          {/* Stickers */}
          <div className="bg-card rounded-xl border border-border p-4">
            <div className="flex items-center justify-between mb-3">
              <h3 className="font-heading font-semibold text-sm flex items-center gap-2"><Sticker className="h-4 w-4" /> স্টিকার ({stickers.length})</h3>
              <button onClick={() => setShowStickerPanel(!showStickerPanel)} className="text-xs px-2.5 py-1 rounded bg-muted hover:bg-muted/80">
                {showStickerPanel ? "বন্ধ" : "খুলুন"}
              </button>
            </div>
            {showStickerPanel && (
              <div className="space-y-3 mb-3">
                {stickerPacks.map(pack => (
                  <div key={pack.name}>
                    <p className="text-xs text-muted-foreground mb-1">{pack.name}</p>
                    <div className="flex flex-wrap gap-1">
                      {pack.stickers.map((emoji, i) => (
                        <button key={i} onClick={() => addSticker(emoji)} className="w-8 h-8 rounded hover:bg-muted/80 text-lg flex items-center justify-center transition-colors">
                          {emoji}
                        </button>
                      ))}
                    </div>
                  </div>
                ))}
              </div>
            )}
            {selectedStickerIdx !== null && stickers[selectedStickerIdx] && (
              <div className="space-y-2 p-2 rounded-lg bg-muted/30">
                <p className="text-xs font-medium">স্টিকার: {stickers[selectedStickerIdx].emoji}</p>
                <div className="grid grid-cols-3 gap-2">
                  <div>
                    <label className="text-xs text-muted-foreground">X</label>
                    <input type="range" min={0} max={100} value={stickers[selectedStickerIdx].x} onChange={e => updateSticker(selectedStickerIdx, { x: Number(e.target.value) })} className="w-full" />
                  </div>
                  <div>
                    <label className="text-xs text-muted-foreground">Y</label>
                    <input type="range" min={0} max={100} value={stickers[selectedStickerIdx].y} onChange={e => updateSticker(selectedStickerIdx, { y: Number(e.target.value) })} className="w-full" />
                  </div>
                  <div>
                    <label className="text-xs text-muted-foreground">সাইজ</label>
                    <input type="number" min={16} max={120} value={stickers[selectedStickerIdx].size} onChange={e => updateSticker(selectedStickerIdx, { size: Number(e.target.value) })} className="w-full px-2 py-1 rounded border border-input bg-background text-sm" />
                  </div>
                </div>
                <button onClick={() => removeSticker(selectedStickerIdx)} className="text-xs px-3 py-1 rounded bg-destructive/10 text-destructive flex items-center gap-1">
                  <X className="h-3 w-3" /> মুছুন
                </button>
              </div>
            )}
            {stickers.length > 0 && (
              <div className="flex gap-1 mt-2 flex-wrap">
                {stickers.map((s, i) => (
                  <button key={i} onClick={() => { setSelectedStickerIdx(i); setSelectedIdx(-1); }} className={`w-7 h-7 rounded text-sm flex items-center justify-center ${selectedStickerIdx === i ? "bg-accent text-accent-foreground ring-1 ring-accent" : "bg-muted"}`}>
                    {s.emoji}
                  </button>
                ))}
              </div>
            )}
          </div>

          {/* Font upload */}
          <div className="bg-card rounded-xl border border-border p-4">
            <h3 className="font-heading font-semibold text-sm mb-3 flex items-center gap-2"><Upload className="h-4 w-4" /> কাস্টম ফন্ট আপলোড</h3>
            <input type="file" accept=".ttf,.woff,.woff2,.otf" onChange={e => e.target.files?.[0] && handleFontUpload(e.target.files[0])} className="w-full text-xs file:mr-2 file:py-1 file:px-2 file:rounded-lg file:border-0 file:text-xs file:bg-muted file:text-foreground" />
            {customFonts.length > 0 && (
              <p className="text-xs text-muted-foreground mt-2">{customFonts.length}টি কাস্টম ফন্ট যোগ হয়েছে</p>
            )}
          </div>

          {/* Text overlays */}
          <div className="bg-card rounded-xl border border-border p-4">
            <div className="flex items-center justify-between mb-3">
              <h3 className="font-heading font-semibold text-sm flex items-center gap-2"><Type className="h-4 w-4" /> টেক্সট ({overlays.length})</h3>
              <button onClick={addOverlay} className="text-xs px-2 py-1 rounded bg-muted hover:bg-muted/80">+ নতুন</button>
            </div>
            <div className="flex gap-1 mb-3 flex-wrap">
              {overlays.map((o, i) => (
                <button key={i} onClick={() => { setSelectedIdx(i); setSelectedStickerIdx(null); }} className={`text-xs px-2 py-1 rounded flex items-center gap-1 ${selectedIdx === i && selectedStickerIdx === null ? "bg-primary text-primary-foreground" : "bg-muted"}`}>
                  {o.isFixed && <Lock className="h-2.5 w-2.5" />} {i + 1}
                </button>
              ))}
            </div>
            {selected && selectedStickerIdx === null && selectedIdx >= 0 && (
              <div className="space-y-3">
                <textarea value={selected.text} onChange={e => updateOverlay(selectedIdx, { text: e.target.value })} rows={2} className="w-full px-3 py-2 rounded-lg border border-input bg-background text-sm" placeholder="টেক্সট..." />
                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <label className="text-xs text-muted-foreground">X (%)</label>
                    <input type="range" min={0} max={100} value={selected.x} onChange={e => updateOverlay(selectedIdx, { x: Number(e.target.value) })} className="w-full" />
                  </div>
                  <div>
                    <label className="text-xs text-muted-foreground">Y (%)</label>
                    <input type="range" min={0} max={100} value={selected.y} onChange={e => updateOverlay(selectedIdx, { y: Number(e.target.value) })} className="w-full" />
                  </div>
                  <div>
                    <label className="text-xs text-muted-foreground">সাইজ</label>
                    <input type="number" min={12} max={120} value={selected.fontSize} onChange={e => updateOverlay(selectedIdx, { fontSize: Number(e.target.value) })} className="w-full px-3 py-1.5 rounded-lg border border-input bg-background text-sm" />
                  </div>
                  <div>
                    <label className="text-xs text-muted-foreground">রং</label>
                    <input type="color" value={selected.color} onChange={e => updateOverlay(selectedIdx, { color: e.target.value })} className="w-full h-9 rounded cursor-pointer" />
                  </div>
                </div>
                <div>
                  <label className="text-xs text-muted-foreground">ফন্ট</label>
                  <select
                    value={selected.fontFamily}
                    onChange={e => {
                      const font = allFonts.find(f => f.value === e.target.value);
                      if (font && 'url' in font && (font as any).url) loadGoogleFont(font as any);
                      updateOverlay(selectedIdx, { fontFamily: e.target.value });
                    }}
                    className="w-full mt-1 px-3 py-2 rounded-lg border border-input bg-background text-sm"
                  >
                    <optgroup label="Google Fonts (বাংলা)">
                      {googleFonts.map(f => <option key={f.value} value={f.value}>{f.label}</option>)}
                    </optgroup>
                    {customFonts.length > 0 && (
                      <optgroup label="আপলোড করা ফন্ট">
                        {customFonts.map(f => <option key={f.value} value={f.value}>{f.label}</option>)}
                      </optgroup>
                    )}
                  </select>
                </div>
                <div className="flex gap-2 flex-wrap">
                  <button
                    onClick={() => updateOverlay(selectedIdx, { isFixed: !selected.isFixed })}
                    className={`text-xs px-3 py-1.5 rounded flex items-center gap-1 ${selected.isFixed ? "bg-yellow-500/20 text-yellow-700" : "bg-muted"}`}
                  >
                    {selected.isFixed ? <Lock className="h-3 w-3" /> : <Unlock className="h-3 w-3" />}
                    {selected.isFixed ? "ফিক্সড" : "ফিক্সড করুন"}
                  </button>
                  <button onClick={() => removeOverlay(selectedIdx)} disabled={overlays.length <= 1} className="text-xs px-3 py-1.5 rounded bg-destructive/10 text-destructive disabled:opacity-30">মুছুন</button>
                  <button onClick={() => { setOverlays([{ ...defaultOverlay }]); setBgGradient(undefined); setStickers([]); setLogoOverlay(null); }} className="text-xs px-3 py-1.5 rounded bg-muted flex items-center gap-1"><RotateCcw className="h-3 w-3" /> রিসেট</button>
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
