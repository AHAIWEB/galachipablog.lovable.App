import { useState, useRef } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "@/hooks/use-toast";
import { Sparkles, Download, Loader2, Eye, Upload } from "lucide-react";
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
        body: { text, url, style, size },
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

  const handleDownload = async () => {
    if (!cardRef.current) return;
    try {
      const canvas = await html2canvas(cardRef.current, {
        scale: 2,
        useCORS: true,
        backgroundColor: null,
      });
      const link = document.createElement("a");
      link.download = `ai-card-${Date.now()}.png`;
      link.href = canvas.toDataURL("image/png");
      link.click();
      toast({ title: "ডাউনলোড হচ্ছে" });
    } catch {
      toast({ title: "ডাউনলোড ত্রুটি", variant: "destructive" });
    }
  };

  const handleUploadToStorage = async () => {
    if (!cardRef.current) return;
    try {
      const canvas = await html2canvas(cardRef.current, { scale: 2, useCORS: true, backgroundColor: null });
      const blob = await new Promise<Blob>((resolve) => canvas.toBlob((b) => resolve(b!), "image/png"));
      const fileName = `ai-cards/${Date.now()}.png`;
      const { error } = await supabase.storage.from("post-images").upload(fileName, blob, { contentType: "image/png" });
      if (error) throw error;
      const { data: urlData } = supabase.storage.from("post-images").getPublicUrl(fileName);
      await navigator.clipboard.writeText(urlData.publicUrl);
      toast({ title: "আপলোড সফল", description: "URL কপি হয়েছে!" });
    } catch (err: any) {
      toast({ title: "আপলোড ত্রুটি", description: err.message, variant: "destructive" });
    }
  };

  const dimensions = size === "story" ? { w: 270, h: 480 } : size === "square" ? { w: 300, h: 300 } : { w: 400, h: 210 };

  return (
    <div className="space-y-6">
      <h1 className="text-2xl font-bold">🎨 AI ইমেজ কার্ড জেনারেটর</h1>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Input Panel */}
        <Card>
          <CardHeader>
            <CardTitle className="text-lg">কার্ড তৈরি করুন</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div>
              <label className="text-sm font-medium mb-1 block">বিষয়বস্তু / লেখা</label>
              <Textarea
                value={text}
                onChange={(e) => setText(e.target.value)}
                placeholder="কার্ডে কী লেখা থাকবে তা লিখুন..."
                rows={4}
              />
            </div>
            <div>
              <label className="text-sm font-medium mb-1 block">URL (ঐচ্ছিক)</label>
              <Input
                value={url}
                onChange={(e) => setUrl(e.target.value)}
                placeholder="https://example.com/article"
              />
              <p className="text-xs text-muted-foreground mt-1">URL দিলে সেখান থেকে কন্টেন্ট নিয়ে কার্ড তৈরি হবে</p>
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="text-sm font-medium mb-1 block">স্টাইল</label>
                <Select value={style} onValueChange={setStyle}>
                  <SelectTrigger><SelectValue /></SelectTrigger>
                  <SelectContent>
                    {STYLES.map(s => (
                      <SelectItem key={s.value} value={s.value}>{s.label}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <div>
                <label className="text-sm font-medium mb-1 block">সাইজ</label>
                <Select value={size} onValueChange={setSize}>
                  <SelectTrigger><SelectValue /></SelectTrigger>
                  <SelectContent>
                    {SIZES.map(s => (
                      <SelectItem key={s.value} value={s.value}>{s.label}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            </div>
            <Button onClick={handleGenerate} disabled={isGenerating} className="w-full">
              {isGenerating ? <Loader2 className="h-4 w-4 animate-spin mr-2" /> : <Sparkles className="h-4 w-4 mr-2" />}
              {isGenerating ? "তৈরি হচ্ছে..." : "কার্ড তৈরি করুন"}
            </Button>
          </CardContent>
        </Card>

        {/* Preview Panel */}
        <Card>
          <CardHeader>
            <CardTitle className="text-lg flex items-center gap-2">
              <Eye className="h-5 w-5" /> প্রিভিউ
            </CardTitle>
          </CardHeader>
          <CardContent>
            {cardHtml ? (
              <div className="space-y-4">
                <div
                  className="mx-auto overflow-hidden rounded-lg shadow-lg border"
                  style={{ width: dimensions.w, height: dimensions.h }}
                >
                  <div
                    ref={cardRef}
                    dangerouslySetInnerHTML={{ __html: cardHtml }}
                    style={{ transform: `scale(${dimensions.w / (size === 'story' ? 1080 : size === 'square' ? 1080 : 1200)})`, transformOrigin: 'top left' }}
                  />
                </div>
                <div className="flex gap-2">
                  <Button onClick={handleDownload} variant="outline" className="flex-1">
                    <Download className="h-4 w-4 mr-2" /> ডাউনলোড
                  </Button>
                  <Button onClick={handleUploadToStorage} variant="outline" className="flex-1">
                    <Upload className="h-4 w-4 mr-2" /> স্টোরেজে সেভ
                  </Button>
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

      {/* AI Suggestion */}
      {aiSuggestion && (
        <Card>
          <CardHeader>
            <CardTitle className="text-lg">🤖 AI সাজেশন</CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-sm text-muted-foreground whitespace-pre-wrap">{aiSuggestion}</p>
          </CardContent>
        </Card>
      )}
    </div>
  );
}
