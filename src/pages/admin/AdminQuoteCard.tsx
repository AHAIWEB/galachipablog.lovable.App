import { useState, useRef, useCallback, useEffect } from "react";
import { Download, Type, Palette, Frame, RotateCcw, Lock, Unlock, Layers } from "lucide-react";
import { toast } from "sonner";

type CardTemplate = {
  id: string;
  name: string;
  bg: string;
  textColor: string;
  authorColor: string;
  titleColor: string;
  quoteStyle: "classic" | "modern" | "minimal" | "bold" | "elegant";
  frameStyle: "none" | "thin" | "thick" | "double" | "rounded" | "ornate";
};

const templates: CardTemplate[] = [
  { id: "classic-dark", name: "ক্লাসিক ডার্ক", bg: "#1a1a2e", textColor: "#e8e8e8", authorColor: "#e2b659", titleColor: "#aaaacc", quoteStyle: "classic", frameStyle: "thin" },
  { id: "warm-paper", name: "উষ্ণ কাগজ", bg: "#fdf6e3", textColor: "#333333", authorColor: "#c0392b", titleColor: "#7f8c8d", quoteStyle: "elegant", frameStyle: "double" },
  { id: "ocean-blue", name: "সমুদ্র নীল", bg: "#0c2461", textColor: "#ffffff", authorColor: "#f6e58d", titleColor: "#7ed6df", quoteStyle: "modern", frameStyle: "rounded" },
  { id: "forest-green", name: "বনের সবুজ", bg: "#1e3a2f", textColor: "#e8f5e9", authorColor: "#f9a825", titleColor: "#81c784", quoteStyle: "bold", frameStyle: "thick" },
  { id: "rose-gold", name: "রোজ গোল্ড", bg: "#2d1b2e", textColor: "#f8e8ee", authorColor: "#e8a87c", titleColor: "#d4a5c8", quoteStyle: "elegant", frameStyle: "ornate" },
  { id: "minimal-white", name: "মিনিমাল সাদা", bg: "#ffffff", textColor: "#222222", authorColor: "#1a5fa8", titleColor: "#888888", quoteStyle: "minimal", frameStyle: "none" },
  { id: "sunset", name: "সূর্যাস্ত", bg: "linear-gradient(135deg, #f093fb 0%, #f5576c 100%)", textColor: "#ffffff", authorColor: "#ffe066", titleColor: "#ffffffcc", quoteStyle: "modern", frameStyle: "rounded" },
  { id: "midnight", name: "মধ্যরাত", bg: "linear-gradient(135deg, #0f0c29, #302b63, #24243e)", textColor: "#e0e0ff", authorColor: "#ffcc02", titleColor: "#9b9bcc", quoteStyle: "classic", frameStyle: "thin" },
];

const fontOptions = [
  "Noto Sans Bengali", "Hind Siliguri", "SolaimanLipi", "Kalpurush",
  "Arial", "Georgia", "Times New Roman", "Courier New",
];

const quoteMarks: Record<string, { open: string; close: string }> = {
  bengali: { open: "❝", close: "❞" },
  curly: { open: "\u201C", close: "\u201D" },
  angle: { open: "«", close: "»" },
  single: { open: "\u2018", close: "\u2019" },
  none: { open: "", close: "" },
};

const sizePresets = [
  { label: "Instagram", w: 1080, h: 1080 },
  { label: "Facebook", w: 1200, h: 630 },
  { label: "Twitter", w: 1600, h: 900 },
  { label: "Story", w: 1080, h: 1920 },
  { label: "A4", w: 2480, h: 3508 },
];

export default function AdminQuoteCard() {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const [activeTab, setActiveTab] = useState<"template" | "text" | "style" | "size">("template");

  const [template, setTemplate] = useState<CardTemplate>(templates[0]);
  const [quote, setQuote] = useState("জীবন একটি সুন্দর যাত্রা, প্রতিটি পদক্ষেপ গুরুত্বপূর্ণ।");
  const [author, setAuthor] = useState("লেখক");
  const [authorTitle, setAuthorTitle] = useState("কবি ও সাহিত্যিক");
  const [authorBio, setAuthorBio] = useState("");
  const [heading, setHeading] = useState("");

  // Custom overrides
  const [bgColor, setBgColor] = useState(template.bg);
  const [textColor, setTextColor] = useState(template.textColor);
  const [authorColor, setAuthorColor] = useState(template.authorColor);
  const [titleColor, setTitleColor] = useState(template.titleColor);
  const [quoteMarkStyle, setQuoteMarkStyle] = useState<keyof typeof quoteMarks>("bengali");
  const [frameStyle, setFrameStyle] = useState(template.frameStyle);
  const [quoteFont, setQuoteFont] = useState("Noto Sans Bengali");
  const [authorFont, setAuthorFont] = useState("Hind Siliguri");
  const [quoteFontSize, setQuoteFontSize] = useState(42);
  const [authorFontSize, setAuthorFontSize] = useState(24);
  const [cardWidth, setCardWidth] = useState(1080);
  const [cardHeight, setCardHeight] = useState(1080);

  // Locks
  const [colorLocks, setColorLocks] = useState({ bg: false, text: false, author: false, title: false });

  const applyTemplate = (t: CardTemplate) => {
    setTemplate(t);
    if (!colorLocks.bg) setBgColor(t.bg);
    if (!colorLocks.text) setTextColor(t.textColor);
    if (!colorLocks.author) setAuthorColor(t.authorColor);
    if (!colorLocks.title) setTitleColor(t.titleColor);
    setFrameStyle(t.frameStyle);
  };

  const toggleLock = (key: keyof typeof colorLocks) => {
    setColorLocks(prev => ({ ...prev, [key]: !prev[key] }));
  };

  const drawCard = useCallback(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext("2d");
    if (!ctx) return;

    canvas.width = cardWidth;
    canvas.height = cardHeight;
    const s = cardWidth / 1080; // scale factor

    // Background
    if (bgColor.includes("gradient") || bgColor.includes("linear")) {
      // Parse gradient
      const grad = ctx.createLinearGradient(0, 0, cardWidth, cardHeight);
      grad.addColorStop(0, "#667eea");
      grad.addColorStop(1, "#764ba2");
      ctx.fillStyle = grad;
    } else {
      ctx.fillStyle = bgColor;
    }
    ctx.fillRect(0, 0, cardWidth, cardHeight);

    // Frame
    const pad = 50 * s;
    if (frameStyle !== "none") {
      ctx.strokeStyle = textColor + "40";
      const fw = frameStyle === "thick" ? 4 * s : frameStyle === "double" ? 2 * s : 1.5 * s;
      ctx.lineWidth = fw;

      if (frameStyle === "rounded") {
        const r = 20 * s;
        ctx.beginPath();
        ctx.roundRect(pad, pad, cardWidth - pad * 2, cardHeight - pad * 2, r);
        ctx.stroke();
      } else if (frameStyle === "double") {
        ctx.strokeRect(pad, pad, cardWidth - pad * 2, cardHeight - pad * 2);
        ctx.strokeRect(pad + 8 * s, pad + 8 * s, cardWidth - pad * 2 - 16 * s, cardHeight - pad * 2 - 16 * s);
      } else if (frameStyle === "ornate") {
        ctx.strokeRect(pad, pad, cardWidth - pad * 2, cardHeight - pad * 2);
        // Corner decorations
        const cs = 20 * s;
        [
          [pad, pad], [cardWidth - pad, pad],
          [pad, cardHeight - pad], [cardWidth - pad, cardHeight - pad]
        ].forEach(([x, y]) => {
          ctx.beginPath();
          ctx.arc(x, y, cs, 0, Math.PI * 2);
          ctx.stroke();
        });
      } else {
        ctx.strokeRect(pad, pad, cardWidth - pad * 2, cardHeight - pad * 2);
      }
    }

    const marks = quoteMarks[quoteMarkStyle];
    const innerPad = 90 * s;

    // Heading
    let yPos = innerPad + 40 * s;
    if (heading) {
      ctx.fillStyle = titleColor;
      ctx.font = `600 ${22 * s}px "${quoteFont}"`;
      ctx.textAlign = "center";
      ctx.fillText(heading, cardWidth / 2, yPos);
      yPos += 50 * s;
    }

    // Quote marks (opening)
    if (marks.open) {
      ctx.fillStyle = authorColor + "60";
      ctx.font = `bold ${80 * s}px serif`;
      ctx.textAlign = "left";
      ctx.fillText(marks.open, innerPad, yPos + 30 * s);
      yPos += 20 * s;
    }

    // Quote text (wrap)
    ctx.fillStyle = textColor;
    ctx.font = `500 ${quoteFontSize * s}px "${quoteFont}"`;
    ctx.textAlign = "center";
    
    const maxWidth = cardWidth - innerPad * 2 - 40 * s;
    const words = quote.split(/\s+/);
    const lines: string[] = [];
    let currentLine = "";
    
    words.forEach(word => {
      const testLine = currentLine ? `${currentLine} ${word}` : word;
      if (ctx.measureText(testLine).width > maxWidth) {
        if (currentLine) lines.push(currentLine);
        currentLine = word;
      } else {
        currentLine = testLine;
      }
    });
    if (currentLine) lines.push(currentLine);

    const lineHeight = quoteFontSize * 1.6 * s;
    const totalTextHeight = lines.length * lineHeight;
    const startY = Math.max(yPos + 40 * s, (cardHeight - totalTextHeight) / 2 - 30 * s);

    lines.forEach((line, i) => {
      ctx.fillText(line, cardWidth / 2, startY + i * lineHeight);
    });

    // Closing quote mark
    if (marks.close) {
      ctx.fillStyle = authorColor + "60";
      ctx.font = `bold ${80 * s}px serif`;
      ctx.textAlign = "right";
      ctx.fillText(marks.close, cardWidth - innerPad, startY + totalTextHeight + 20 * s);
    }

    // Divider line
    const divY = startY + totalTextHeight + 60 * s;
    ctx.strokeStyle = authorColor + "50";
    ctx.lineWidth = 1.5 * s;
    ctx.beginPath();
    ctx.moveTo(cardWidth / 2 - 60 * s, divY);
    ctx.lineTo(cardWidth / 2 + 60 * s, divY);
    ctx.stroke();

    // Author
    const authY = divY + 40 * s;
    ctx.fillStyle = authorColor;
    ctx.font = `700 ${authorFontSize * s}px "${authorFont}"`;
    ctx.textAlign = "center";
    ctx.fillText(author, cardWidth / 2, authY);

    // Author title
    if (authorTitle) {
      ctx.fillStyle = titleColor;
      ctx.font = `400 ${18 * s}px "${authorFont}"`;
      ctx.fillText(authorTitle, cardWidth / 2, authY + 30 * s);
    }

    // Author bio
    if (authorBio) {
      ctx.fillStyle = titleColor + "aa";
      ctx.font = `300 ${14 * s}px "${authorFont}"`;
      ctx.fillText(authorBio, cardWidth / 2, authY + 55 * s);
    }
  }, [quote, author, authorTitle, authorBio, heading, bgColor, textColor, authorColor, titleColor, quoteMarkStyle, frameStyle, quoteFont, authorFont, quoteFontSize, authorFontSize, cardWidth, cardHeight]);

  useEffect(() => { drawCard(); }, [drawCard]);

  const downloadCard = () => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const link = document.createElement("a");
    link.download = `quote-card-${Date.now()}.png`;
    link.href = canvas.toDataURL("image/png");
    link.click();
    toast.success("কার্ড ডাউনলোড হচ্ছে!");
  };

  const resetAll = () => {
    applyTemplate(templates[0]);
    setQuote("জীবন একটি সুন্দর যাত্রা, প্রতিটি পদক্ষেপ গুরুত্বপূর্ণ।");
    setAuthor("লেখক");
    setAuthorTitle("কবি ও সাহিত্যিক");
    setAuthorBio("");
    setHeading("");
    setQuoteMarkStyle("bengali");
    setQuoteFontSize(42);
    setAuthorFontSize(24);
    setCardWidth(1080);
    setCardHeight(1080);
    setColorLocks({ bg: false, text: false, author: false, title: false });
  };

  const tabs = [
    { id: "template", label: "টেমপ্লেট", icon: Layers },
    { id: "text", label: "টেক্সট", icon: Type },
    { id: "style", label: "স্টাইল", icon: Palette },
    { id: "size", label: "সাইজ", icon: Frame },
  ] as const;

  return (
    <div>
      <div className="flex items-center justify-between mb-6">
        <h1 className="font-heading font-bold text-2xl">🎨 কোট কার্ড এডিটর</h1>
        <div className="flex gap-2">
          <button onClick={resetAll} className="flex items-center gap-1.5 px-3 py-2 rounded-lg border border-input bg-background text-sm hover:bg-muted transition-colors">
            <RotateCcw className="h-3.5 w-3.5" /> রিসেট
          </button>
          <button onClick={downloadCard} className="flex items-center gap-1.5 px-4 py-2 rounded-lg bg-primary text-primary-foreground text-sm font-medium hover-scale">
            <Download className="h-4 w-4" /> ডাউনলোড PNG
          </button>
        </div>
      </div>

      <div className="grid lg:grid-cols-[1fr_380px] gap-6">
        {/* Preview */}
        <div className="bg-muted/50 rounded-2xl border border-border p-4 flex items-center justify-center min-h-[400px]">
          <canvas
            ref={canvasRef}
            className="max-w-full max-h-[70vh] rounded-xl shadow-2xl"
            style={{ aspectRatio: `${cardWidth}/${cardHeight}` }}
          />
        </div>

        {/* Controls */}
        <div className="space-y-4">
          {/* Tab bar */}
          <div className="flex gap-1 bg-muted rounded-xl p-1">
            {tabs.map(t => (
              <button
                key={t.id}
                onClick={() => setActiveTab(t.id)}
                className={`flex-1 flex items-center justify-center gap-1.5 py-2 rounded-lg text-xs font-medium transition-all ${
                  activeTab === t.id ? "bg-card shadow-sm text-foreground" : "text-muted-foreground hover:text-foreground"
                }`}
              >
                <t.icon className="h-3.5 w-3.5" />
                {t.label}
              </button>
            ))}
          </div>

          <div className="bg-card rounded-xl border border-border p-4 max-h-[60vh] overflow-y-auto space-y-4">
            {activeTab === "template" && (
              <div className="grid grid-cols-2 gap-2">
                {templates.map(t => (
                  <button
                    key={t.id}
                    onClick={() => applyTemplate(t)}
                    className={`rounded-xl p-3 text-left border-2 transition-all ${
                      template.id === t.id ? "border-primary ring-2 ring-primary/20" : "border-border hover:border-primary/40"
                    }`}
                    style={{
                      background: t.bg.includes("gradient") ? t.bg : t.bg,
                    }}
                  >
                    <span className="text-xs font-medium" style={{ color: t.textColor }}>{t.name}</span>
                    <div className="mt-1 h-1 rounded-full w-8" style={{ backgroundColor: t.authorColor }} />
                  </button>
                ))}
              </div>
            )}

            {activeTab === "text" && (
              <div className="space-y-3">
                <div>
                  <label className="text-xs font-medium text-muted-foreground">শিরোনাম (ঐচ্ছিক)</label>
                  <input value={heading} onChange={e => setHeading(e.target.value)} placeholder="শিরোনাম লিখুন" className="w-full mt-1 px-3 py-2 rounded-lg border border-input bg-background text-sm focus:outline-none focus:ring-2 focus:ring-ring" />
                </div>
                <div>
                  <label className="text-xs font-medium text-muted-foreground">কোটেশন *</label>
                  <textarea value={quote} onChange={e => setQuote(e.target.value)} rows={4} className="w-full mt-1 px-3 py-2 rounded-lg border border-input bg-background text-sm focus:outline-none focus:ring-2 focus:ring-ring" />
                </div>
                <div>
                  <label className="text-xs font-medium text-muted-foreground">লেখক *</label>
                  <input value={author} onChange={e => setAuthor(e.target.value)} className="w-full mt-1 px-3 py-2 rounded-lg border border-input bg-background text-sm focus:outline-none focus:ring-2 focus:ring-ring" />
                </div>
                <div>
                  <label className="text-xs font-medium text-muted-foreground">পদবী</label>
                  <input value={authorTitle} onChange={e => setAuthorTitle(e.target.value)} placeholder="কবি ও সাহিত্যিক" className="w-full mt-1 px-3 py-2 rounded-lg border border-input bg-background text-sm focus:outline-none focus:ring-2 focus:ring-ring" />
                </div>
                <div>
                  <label className="text-xs font-medium text-muted-foreground">পরিচিতি</label>
                  <input value={authorBio} onChange={e => setAuthorBio(e.target.value)} placeholder="সংক্ষিপ্ত পরিচিতি" className="w-full mt-1 px-3 py-2 rounded-lg border border-input bg-background text-sm focus:outline-none focus:ring-2 focus:ring-ring" />
                </div>
              </div>
            )}

            {activeTab === "style" && (
              <div className="space-y-4">
                {/* Colors with locks */}
                {([
                  { key: "bg" as const, label: "ব্যাকগ্রাউন্ড", value: bgColor, setter: setBgColor },
                  { key: "text" as const, label: "কোটেশন কালার", value: textColor, setter: setTextColor },
                  { key: "author" as const, label: "লেখক কালার", value: authorColor, setter: setAuthorColor },
                  { key: "title" as const, label: "পদবী কালার", value: titleColor, setter: setTitleColor },
                ]).map(c => (
                  <div key={c.key} className="flex items-center gap-2">
                    <input
                      type="color"
                      value={c.value.startsWith("#") ? c.value : "#000000"}
                      onChange={e => c.setter(e.target.value)}
                      className="w-8 h-8 rounded cursor-pointer border border-input shrink-0"
                    />
                    <span className="text-xs flex-1">{c.label}</span>
                    <button
                      onClick={() => toggleLock(c.key)}
                      className={`p-1 rounded ${colorLocks[c.key] ? "text-primary" : "text-muted-foreground"}`}
                      title={colorLocks[c.key] ? "আনলক" : "লক"}
                    >
                      {colorLocks[c.key] ? <Lock className="h-3.5 w-3.5" /> : <Unlock className="h-3.5 w-3.5" />}
                    </button>
                  </div>
                ))}

                <div className="border-t border-border pt-3">
                  <label className="text-xs font-medium text-muted-foreground">কোটেশন চিহ্ন</label>
                  <div className="grid grid-cols-5 gap-1.5 mt-1.5">
                    {Object.entries(quoteMarks).map(([key, val]) => (
                      <button
                        key={key}
                        onClick={() => setQuoteMarkStyle(key as any)}
                        className={`py-2 rounded-lg text-sm font-bold border transition-all ${
                          quoteMarkStyle === key ? "border-primary bg-primary/10 text-primary" : "border-input hover:border-primary/40"
                        }`}
                      >
                        {val.open || "—"}
                      </button>
                    ))}
                  </div>
                </div>

                <div>
                  <label className="text-xs font-medium text-muted-foreground">ফ্রেম স্টাইল</label>
                  <div className="grid grid-cols-3 gap-1.5 mt-1.5">
                    {(["none", "thin", "thick", "double", "rounded", "ornate"] as const).map(fs => (
                      <button
                        key={fs}
                        onClick={() => setFrameStyle(fs)}
                        className={`py-2 rounded-lg text-xs font-medium border transition-all ${
                          frameStyle === fs ? "border-primary bg-primary/10 text-primary" : "border-input hover:border-primary/40"
                        }`}
                      >
                        {fs === "none" ? "কোনটি না" : fs === "thin" ? "পাতলা" : fs === "thick" ? "মোটা" : fs === "double" ? "ডাবল" : fs === "rounded" ? "গোল" : "অলঙ্কৃত"}
                      </button>
                    ))}
                  </div>
                </div>

                <div>
                  <label className="text-xs font-medium text-muted-foreground">কোটেশন ফন্ট</label>
                  <select value={quoteFont} onChange={e => setQuoteFont(e.target.value)} className="w-full mt-1 px-3 py-2 rounded-lg border border-input bg-background text-sm">
                    {fontOptions.map(f => <option key={f} value={f}>{f}</option>)}
                  </select>
                </div>
                <div>
                  <label className="text-xs font-medium text-muted-foreground">লেখক ফন্ট</label>
                  <select value={authorFont} onChange={e => setAuthorFont(e.target.value)} className="w-full mt-1 px-3 py-2 rounded-lg border border-input bg-background text-sm">
                    {fontOptions.map(f => <option key={f} value={f}>{f}</option>)}
                  </select>
                </div>

                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <label className="text-xs font-medium text-muted-foreground">কোট সাইজ: {quoteFontSize}</label>
                    <input type="range" min={20} max={80} value={quoteFontSize} onChange={e => setQuoteFontSize(+e.target.value)} className="w-full mt-1" />
                  </div>
                  <div>
                    <label className="text-xs font-medium text-muted-foreground">লেখক সাইজ: {authorFontSize}</label>
                    <input type="range" min={14} max={48} value={authorFontSize} onChange={e => setAuthorFontSize(+e.target.value)} className="w-full mt-1" />
                  </div>
                </div>
              </div>
            )}

            {activeTab === "size" && (
              <div className="space-y-4">
                <div className="grid grid-cols-2 gap-2">
                  {sizePresets.map(p => (
                    <button
                      key={p.label}
                      onClick={() => { setCardWidth(p.w); setCardHeight(p.h); }}
                      className={`py-2.5 rounded-lg text-xs font-medium border transition-all ${
                        cardWidth === p.w && cardHeight === p.h ? "border-primary bg-primary/10 text-primary" : "border-input hover:border-primary/40"
                      }`}
                    >
                      {p.label}
                      <span className="block text-[10px] text-muted-foreground mt-0.5">{p.w}×{p.h}</span>
                    </button>
                  ))}
                </div>
                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <label className="text-xs font-medium text-muted-foreground">প্রস্থ (px)</label>
                    <input type="number" value={cardWidth} onChange={e => setCardWidth(+e.target.value)} min={400} max={4000} className="w-full mt-1 px-3 py-2 rounded-lg border border-input bg-background text-sm" />
                  </div>
                  <div>
                    <label className="text-xs font-medium text-muted-foreground">উচ্চতা (px)</label>
                    <input type="number" value={cardHeight} onChange={e => setCardHeight(+e.target.value)} min={400} max={4000} className="w-full mt-1 px-3 py-2 rounded-lg border border-input bg-background text-sm" />
                  </div>
                </div>
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
