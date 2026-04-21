import { useState, useRef, useEffect } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Slider } from "@/components/ui/slider";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "@/hooks/use-toast";
import { Sparkles, Download, Loader2, Eye, Upload, Image as ImageIcon, Star } from "lucide-react";
import html2canvas from "html2canvas";

const STYLES = [
  { value: "modern", label: "মডার্ন" },
  { value: "elegant", label: "এলিগ্যান্ট" },
  { value: "playful", label: "প্লেফুল" },
  { value: "professional", label: "প্রফেশনাল" },
  { value: "bengali", label: "বাংলা কালচারাল" },
  { value: "quote", label: "কোট কার্ড" },
];

const SIZES = [
  { value: "landscape", label: "ল্যান্ডস্কেপ (1200×630)" },
  { value: "square", label: "স্কয়ার (1080×1080)" },
  { value: "story", label: "স্টোরি (1080×1920)" },
];

export default function AdminAiCard() {
  const [text, setText] = useState("");
  const [url, setUrl] = useState("");
  const [style, setStyle] = useState("modern");
  const [size, setSize] = useState("landscape");
  const [isGenerating, setIsGenerating] = useState(false);
  const [cardHtml, setCardHtml] = useState("");
  const [aiSuggestion, setAiSuggestion] = useState("");
  const cardRef = useRef<HTMLDivElement>(null);

  const [customBgUrl, setCustomBgUrl] = useState("");
  const [bodyFontSize, setBodyFontSize] = useState<number>(48);
  const [textColor, setTextColor] = useState<string>("");
  const [bgOverlay, setBgOverlay] = useState<number>(35);
  const [isUploadingBg, setIsUploadingBg] = useState(false);

  const [posts, setPosts] = useState<{ id: string; title: string }[]>([]);
  const [selectedPostId, setSelectedPostId] = useState<string>("");

  useEffect(() => {
    supabase.from("posts").select("id, title").is("deleted_at", null).order("created_at", { ascending: false }).limit(100)
      .then(({ data }) => setPosts(data || []));
  }, []);

  const handleBgUpload = async (file: File) => {
    setIsUploadingBg(true);
    try {
      const path = `ai-card-bg/${Date.now()}-${file.name}`;
      const { error } = await supabase.storage.from("post-images").upload(path, file);
      if (error) throw error;
      const { data } = supabase.storage.from("post-images").getPublicUrl(path);
      setCustomBgUrl(data.publicUrl);
      toast({ title: "ব্যাকগ্রাউন্ড আপলোড সফল" });
    } catch (err: any) {
      toast({ title: "আপলোড ত্রুটি", description: err.message, variant: "destructive" });
    } finally {
      setIsUploadingBg(false);
    }
  };

  const handleGenerate = async () => {
    if (!text && !url) {
      toast({ title: "ত্রুটি", description: "লেখা অথবা URL দিন", variant: "destructive" });
      return;
    }
    setIsGenerating(true);
    try {
      const { data: { session } } = await supabase.auth.getSession();
      if (!session) throw new Error("লগইন করুন");

      const resp = await supabase.functions.invoke("generate-ai-card", {
        body: {
          text, url, style, size,
          custom_bg_url: customBgUrl || undefined,
          body_font_size: bodyFontSize,
          text_color: textColor || undefined,
          bg_overlay_opacity: bgOverlay / 100,
        },
      });
      if (resp.error) throw resp.error;
      const result = resp.data;
      if (!result.success) throw new Error(result.error);

      setCardHtml(result.card_html);
      setAiSuggestion(result.ai_suggestion || "");
      toast({ title: "সফল", description: "কার্ড তৈরি হয়েছে!" });
    } catch (err: any) {
      toast({ title: "ত্রুটি", description: err.message, variant: "destructive" });
    } finally {
      setIsGenerating(false);
    }
  };

  const renderCanvas = async () => {
    if (!cardRef.current) return null;
    return await html2canvas(cardRef.current, { scale: 2, useCORS: true, backgroundColor: null });
  };

  const handleDownload = async () => {
    try {
      const canvas = await renderCanvas();
      if (!canvas) return;
      const link = document.createElement("a");
      link.download = `ai-card-${Date.now()}.png`;
      link.href = canvas.toDataURL("image/png");
      link.click();
      toast({ title: "ডাউনলোড হচ্ছে" });
    } catch {
      toast({ title: "ডাউনলোড ত্রুটি", variant: "destructive" });
    }
  };

  const uploadCardToStorage = async (): Promise<string | null> => {
    const canvas = await renderCanvas();
    if (!canvas) return null;
    const blob = await new Promise<Blob>((resolve) => canvas.toBlob((b) => resolve(b!), "image/png"));
    const fileName = `ai-cards/${Date.now()}.png`;
    const { error } = await supabase.storage.from("post-images").upload(fileName, blob, { contentType: "image/png" });
    if (error) throw error;
    const { data } = supabase.storage.from("post-images").getPublicUrl(fileName);
    return data.publicUrl;
  };

  const handleUploadToStorage = async () => {
    try {
      const publicUrl = await uploadCardToStorage();
      if (!publicUrl) return;
      await navigator.clipboard.writeText(publicUrl);
      toast({ title: "আপলোড সফল", description: "URL কপি হয়েছে!" });
    } catch (err: any) {
      toast({ title: "আপলোড ত্রুটি", description: err.message, variant: "destructive" });
    }
  };

  const handleSetAsFeatured = async () => {
    if (!selectedPostId) {
      toast({ title: "পোস্ট সিলেক্ট করুন", variant: "destructive" });
      return;
    }
    try {
      const publicUrl = await uploadCardToStorage();
      if (!publicUrl) return;
      const { error } = await supabase.from("posts").update({ featured_image: publicUrl }).eq("id", selectedPostId);
      if (error) throw error;
      toast({ title: "সফল", description: "পোস্টের ফিচার্ড ছবি সেট করা হয়েছে!" });
    } catch (err: any) {
      toast({ title: "ত্রুটি", description: err.message, variant: "destructive" });
    }
  };

  const dimensions = size === "story" ? { w: 270, h: 480 } : size === "square" ? { w: 300, h: 300 } : { w: 400, h: 210 };
  const baseW = size === 'story' ? 1080 : size === 'square' ? 1080 : 1200;

  return (
    <div className="space-y-6">
      <h1 className="text-2xl font-bold">🎨 AI ইমেজ কার্ড জেনারেটর</h1>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <Card>
          <CardHeader><CardTitle className="text-lg">কার্ড তৈরি করুন</CardTitle></CardHeader>
          <CardContent className="space-y-4">
            <div>
              <label className="text-sm font-medium mb-1 block">বিষয়বস্তু / লেখা</label>
              <Textarea value={text} onChange={(e) => setText(e.target.value)} placeholder="কার্ডে কী লেখা থাকবে..." rows={4} />
            </div>
            <div>
              <label className="text-sm font-medium mb-1 block">URL (ঐচ্ছিক)</label>
              <Input value={url} onChange={(e) => setUrl(e.target.value)} placeholder="https://example.com/article" />
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="text-sm font-medium mb-1 block">স্টাইল</label>
                <Select value={style} onValueChange={setStyle}>
                  <SelectTrigger><SelectValue /></SelectTrigger>
                  <SelectContent>{STYLES.map(s => <SelectItem key={s.value} value={s.value}>{s.label}</SelectItem>)}</SelectContent>
                </Select>
              </div>
              <div>
                <label className="text-sm font-medium mb-1 block">সাইজ</label>
                <Select value={size} onValueChange={setSize}>
                  <SelectTrigger><SelectValue /></SelectTrigger>
                  <SelectContent>{SIZES.map(s => <SelectItem key={s.value} value={s.value}>{s.label}</SelectItem>)}</SelectContent>
                </Select>
              </div>
            </div>

            <div className="border-t pt-4 space-y-3">
              <h3 className="text-sm font-semibold flex items-center gap-2"><ImageIcon className="h-4 w-4"/> কাস্টমাইজেশন</h3>

              <div>
                <label className="text-xs font-medium mb-1 block">কাস্টম ব্যাকগ্রাউন্ড ইমেজ</label>
                <div className="flex gap-2">
                  <Input value={customBgUrl} onChange={e => setCustomBgUrl(e.target.value)} placeholder="URL দিন বা আপলোড করুন" className="flex-1 text-xs"/>
                  <label className="cursor-pointer">
                    <input type="file" accept="image/*" className="hidden" onChange={(e) => { const f = e.target.files?.[0]; if (f) handleBgUpload(f); }}/>
                    <span className="inline-flex items-center px-3 py-2 rounded-md border bg-muted text-xs hover:bg-muted/80">
                      {isUploadingBg ? <Loader2 className="h-3 w-3 animate-spin"/> : <Upload className="h-3 w-3"/>}
                    </span>
                  </label>
                  {customBgUrl && (<Button variant="outline" size="sm" onClick={() => setCustomBgUrl("")}>X</Button>)}
                </div>
                {customBgUrl && (
                  <div className="mt-2">
                    <label className="text-xs">ব্যাকগ্রাউন্ড অন্ধকার: {bgOverlay}%</label>
                    <Slider value={[bgOverlay]} onValueChange={(v) => setBgOverlay(v[0])} min={0} max={80} step={5}/>
                  </div>
                )}
              </div>

              <div>
                <label className="text-xs font-medium mb-1 block">ফন্ট সাইজ: {bodyFontSize}px</label>
                <Slider value={[bodyFontSize]} onValueChange={(v) => setBodyFontSize(v[0])} min={20} max={120} step={2}/>
              </div>

              <div>
                <label className="text-xs font-medium mb-1 block">টেক্সট কালার</label>
                <div className="flex gap-2 items-center">
                  <input type="color" value={textColor || "#ffffff"} onChange={(e) => setTextColor(e.target.value)} className="h-9 w-16 rounded border cursor-pointer"/>
                  <Input value={textColor} onChange={e => setTextColor(e.target.value)} placeholder="ডিফল্ট স্টাইল কালার" className="flex-1 text-xs"/>
                  {textColor && <Button variant="outline" size="sm" onClick={() => setTextColor("")}>X</Button>}
                </div>
              </div>
            </div>

            <Button onClick={handleGenerate} disabled={isGenerating} className="w-full">
              {isGenerating ? <Loader2 className="h-4 w-4 animate-spin mr-2" /> : <Sparkles className="h-4 w-4 mr-2" />}
              {isGenerating ? "তৈরি হচ্ছে..." : "কার্ড তৈরি করুন"}
            </Button>
          </CardContent>
        </Card>

        <Card>
          <CardHeader><CardTitle className="text-lg flex items-center gap-2"><Eye className="h-5 w-5" /> প্রিভিউ</CardTitle></CardHeader>
          <CardContent>
            {cardHtml ? (
              <div className="space-y-4">
                <div className="mx-auto overflow-hidden rounded-lg shadow-lg border" style={{ width: dimensions.w, height: dimensions.h }}>
                  <div ref={cardRef} dangerouslySetInnerHTML={{ __html: cardHtml }}
                    style={{ transform: `scale(${dimensions.w / baseW})`, transformOrigin: 'top left' }}/>
                </div>
                <div className="flex gap-2">
                  <Button onClick={handleDownload} variant="outline" className="flex-1"><Download className="h-4 w-4 mr-2" /> ডাউনলোড</Button>
                  <Button onClick={handleUploadToStorage} variant="outline" className="flex-1"><Upload className="h-4 w-4 mr-2" /> স্টোরেজে সেভ</Button>
                </div>

                <div className="border-t pt-3 space-y-2">
                  <label className="text-xs font-medium flex items-center gap-1"><Star className="h-3 w-3"/> পোস্টের ফিচার্ড ইমেজ হিসেবে সেট</label>
                  <div className="flex gap-2">
                    <Select value={selectedPostId} onValueChange={setSelectedPostId}>
                      <SelectTrigger className="flex-1"><SelectValue placeholder="পোস্ট বেছে নিন..."/></SelectTrigger>
                      <SelectContent>
                        {posts.map(p => <SelectItem key={p.id} value={p.id}>{p.title.slice(0, 50)}</SelectItem>)}
                      </SelectContent>
                    </Select>
                    <Button onClick={handleSetAsFeatured} size="sm"><Star className="h-3 w-3 mr-1"/>সেট</Button>
                  </div>
                </div>
              </div>
            ) : (
              <div className="flex items-center justify-center h-48 text-muted-foreground border rounded-lg border-dashed">
                কার্ড তৈরি করলে এখানে প্রিভিউ দেখাবে
              </div>
            )}
          </CardContent>
        </Card>
      </div>

      {aiSuggestion && (
        <Card>
          <CardHeader><CardTitle className="text-lg">🤖 AI সাজেশন</CardTitle></CardHeader>
          <CardContent><p className="text-sm text-muted-foreground whitespace-pre-wrap">{aiSuggestion}</p></CardContent>
        </Card>
      )}
    </div>
  );
}
