import { useState, useRef } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import { Plus, Pencil, Trash2, Eye, BarChart3, Image, Code, Sparkles } from "lucide-react";

type Ad = {
  id: string; name: string; content: string; image_url: string | null;
  placement: string; ad_type: string; link_url: string | null;
  status: string; click_count: number; view_count: number;
  start_date: string | null; end_date: string | null;
  created_at: string; updated_at: string;
};

const placements = [
  { value: "header", label: "হেডার" },
  { value: "sidebar", label: "সাইডবার" },
  { value: "in-content", label: "কন্টেন্টের মধ্যে" },
  { value: "footer", label: "ফুটার" },
];

const adTypes = [
  { value: "image", label: "ইমেজ" },
  { value: "html", label: "HTML কোড" },
  { value: "gif", label: "GIF/অ্যানিমেশন" },
];

const defaultForm = { name: "", content: "", image_url: "", placement: "sidebar", ad_type: "image", link_url: "", status: "active" };

export default function AdminAds() {
  const queryClient = useQueryClient();
  const [tab, setTab] = useState<"list" | "canvas" | "demo">("list");
  const [showForm, setShowForm] = useState(false);
  const [editing, setEditing] = useState<Ad | null>(null);
  const [form, setForm] = useState(defaultForm);

  // Canvas state
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const [canvasText, setCanvasText] = useState("আপনার বিজ্ঞাপন");
  const [canvasBg, setCanvasBg] = useState("#1e40af");
  const [canvasSize, setCanvasSize] = useState({ w: 728, h: 90 });

  const { data: ads = [], isLoading } = useQuery({
    queryKey: ["admin-ads"],
    queryFn: async () => {
      const { data, error } = await supabase.from("ads").select("*").order("created_at", { ascending: false });
      if (error) throw error;
      return data as Ad[];
    },
  });

  const saveMutation = useMutation({
    mutationFn: async () => {
      const payload = { ...form, image_url: form.image_url || null, link_url: form.link_url || null };
      if (editing) {
        const { error } = await supabase.from("ads").update(payload).eq("id", editing.id);
        if (error) throw error;
      } else {
        const { error } = await supabase.from("ads").insert(payload);
        if (error) throw error;
      }
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["admin-ads"] });
      toast.success(editing ? "আপডেট হয়েছে" : "বিজ্ঞাপন তৈরি হয়েছে");
      setShowForm(false); setEditing(null); setForm(defaultForm);
    },
    onError: (err: any) => toast.error(err.message),
  });

  const deleteMutation = useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase.from("ads").delete().eq("id", id);
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["admin-ads"] });
      toast.success("মুছে ফেলা হয়েছে");
    },
  });

  const startEdit = (ad: Ad) => {
    setForm({ name: ad.name, content: ad.content, image_url: ad.image_url || "", placement: ad.placement, ad_type: ad.ad_type, link_url: ad.link_url || "", status: ad.status });
    setEditing(ad);
    setShowForm(true);
    setTab("list");
  };

  const renderAdCanvas = () => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext("2d")!;
    canvas.width = canvasSize.w;
    canvas.height = canvasSize.h;

    ctx.fillStyle = canvasBg;
    ctx.fillRect(0, 0, canvas.width, canvas.height);

    // Decorative
    ctx.fillStyle = "rgba(255,255,255,0.05)";
    ctx.beginPath();
    ctx.arc(canvas.width - 50, canvas.height / 2, 60, 0, Math.PI * 2);
    ctx.fill();

    ctx.fillStyle = "#ffffff";
    ctx.font = `bold ${Math.min(28, canvasSize.h * 0.4)}px 'Noto Sans Bengali', sans-serif`;
    ctx.textAlign = "center";
    ctx.textBaseline = "middle";
    ctx.fillText(canvasText, canvas.width / 2, canvas.height / 2);
  };

  const downloadAdCanvas = () => {
    renderAdCanvas();
    const canvas = canvasRef.current;
    if (!canvas) return;
    const link = document.createElement("a");
    link.download = "ad-banner.png";
    link.href = canvas.toDataURL("image/png");
    link.click();
  };

  const activeAds = ads.filter(a => a.status === "active");
  const totalViews = ads.reduce((s, a) => s + a.view_count, 0);
  const totalClicks = ads.reduce((s, a) => s + a.click_count, 0);

  return (
    <div>
      <div className="flex items-center justify-between mb-4">
        <h1 className="font-heading font-bold text-2xl">📢 বিজ্ঞাপন ম্যানেজার</h1>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-3 gap-3 mb-5">
        <div className="bg-card rounded-xl border border-border p-4 text-center">
          <p className="text-2xl font-bold text-primary">{activeAds.length}</p>
          <p className="text-xs text-muted-foreground">সক্রিয়</p>
        </div>
        <div className="bg-card rounded-xl border border-border p-4 text-center">
          <p className="text-2xl font-bold text-secondary">{totalViews}</p>
          <p className="text-xs text-muted-foreground">মোট ভিউ</p>
        </div>
        <div className="bg-card rounded-xl border border-border p-4 text-center">
          <p className="text-2xl font-bold text-accent">{totalClicks}</p>
          <p className="text-xs text-muted-foreground">মোট ক্লিক</p>
        </div>
      </div>

      {/* Tabs */}
      <div className="flex gap-1 mb-4 bg-muted p-1 rounded-lg w-fit">
        {([["list", "📋 তালিকা"], ["canvas", "🎨 ক্যানভাস"], ["demo", "👁 ডেমো"]] as const).map(([key, label]) => (
          <button key={key} onClick={() => setTab(key)} className={`px-4 py-2 rounded-md text-sm font-medium transition-all ${tab === key ? "bg-card shadow-sm text-foreground" : "text-muted-foreground"}`}>{label}</button>
        ))}
      </div>

      {tab === "list" && (
        <>
          <button onClick={() => { setShowForm(!showForm); setEditing(null); setForm(defaultForm); }} className="mb-4 flex items-center gap-1.5 px-4 py-2 rounded-lg bg-primary text-primary-foreground text-sm font-medium">
            <Plus className="h-4 w-4" /> নতুন বিজ্ঞাপন
          </button>

          {showForm && (
            <div className="bg-card rounded-xl border border-border p-5 mb-5 animate-slide-up">
              <h2 className="font-heading font-semibold mb-4">{editing ? "সম্পাদনা" : "নতুন বিজ্ঞাপন"}</h2>
              <div className="grid md:grid-cols-2 gap-4">
                <div>
                  <label className="text-xs font-medium text-muted-foreground">নাম *</label>
                  <input value={form.name} onChange={e => setForm(p => ({ ...p, name: e.target.value }))} className="w-full mt-1 px-3 py-2 rounded-lg border border-input bg-background text-sm" />
                </div>
                <div>
                  <label className="text-xs font-medium text-muted-foreground">স্থান</label>
                  <select value={form.placement} onChange={e => setForm(p => ({ ...p, placement: e.target.value }))} className="w-full mt-1 px-3 py-2 rounded-lg border border-input bg-background text-sm">
                    {placements.map(p => <option key={p.value} value={p.value}>{p.label}</option>)}
                  </select>
                </div>
                <div>
                  <label className="text-xs font-medium text-muted-foreground">ধরন</label>
                  <select value={form.ad_type} onChange={e => setForm(p => ({ ...p, ad_type: e.target.value }))} className="w-full mt-1 px-3 py-2 rounded-lg border border-input bg-background text-sm">
                    {adTypes.map(t => <option key={t.value} value={t.value}>{t.label}</option>)}
                  </select>
                </div>
                <div>
                  <label className="text-xs font-medium text-muted-foreground">লিংক URL</label>
                  <input value={form.link_url} onChange={e => setForm(p => ({ ...p, link_url: e.target.value }))} className="w-full mt-1 px-3 py-2 rounded-lg border border-input bg-background text-sm" />
                </div>
                <div>
                  <label className="text-xs font-medium text-muted-foreground">ইমেজ URL</label>
                  <input value={form.image_url} onChange={e => setForm(p => ({ ...p, image_url: e.target.value }))} className="w-full mt-1 px-3 py-2 rounded-lg border border-input bg-background text-sm" />
                </div>
                <div>
                  <label className="text-xs font-medium text-muted-foreground">স্ট্যাটাস</label>
                  <select value={form.status} onChange={e => setForm(p => ({ ...p, status: e.target.value }))} className="w-full mt-1 px-3 py-2 rounded-lg border border-input bg-background text-sm">
                    <option value="active">সক্রিয়</option>
                    <option value="paused">বিরতি</option>
                    <option value="expired">মেয়াদ শেষ</option>
                  </select>
                </div>
                <div className="md:col-span-2">
                  <label className="text-xs font-medium text-muted-foreground">কন্টেন্ট (HTML/টেক্সট) *</label>
                  <textarea value={form.content} onChange={e => setForm(p => ({ ...p, content: e.target.value }))} rows={3} className="w-full mt-1 px-3 py-2 rounded-lg border border-input bg-background text-sm" />
                </div>
              </div>
              <div className="flex gap-2 mt-4">
                <button onClick={() => saveMutation.mutate()} disabled={!form.name || !form.content} className="px-4 py-2 rounded-lg bg-primary text-primary-foreground text-sm font-medium disabled:opacity-50">সেভ</button>
                <button onClick={() => { setShowForm(false); setEditing(null); }} className="px-4 py-2 rounded-lg bg-muted text-sm">বাতিল</button>
              </div>
            </div>
          )}

          <div className="bg-card rounded-xl border border-border overflow-hidden">
            {isLoading ? <p className="p-4 text-sm text-muted-foreground">লোড হচ্ছে...</p> : ads.length > 0 ? (
              <div className="divide-y divide-border">
                {ads.map(ad => (
                  <div key={ad.id} className="p-4 flex items-center justify-between gap-3 hover:bg-muted/50">
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2">
                        <h3 className="font-medium text-sm truncate">{ad.name}</h3>
                        <span className={`text-[10px] px-1.5 py-0.5 rounded-full ${ad.status === "active" ? "bg-green-100 text-green-700" : "bg-muted text-muted-foreground"}`}>{ad.status === "active" ? "সক্রিয়" : ad.status}</span>
                      </div>
                      <div className="flex gap-3 mt-1 text-xs text-muted-foreground">
                        <span>{placements.find(p => p.value === ad.placement)?.label}</span>
                        <span><Eye className="h-3 w-3 inline" /> {ad.view_count}</span>
                        <span><BarChart3 className="h-3 w-3 inline" /> {ad.click_count}</span>
                      </div>
                    </div>
                    <div className="flex gap-1 shrink-0">
                      <button onClick={() => startEdit(ad)} className="p-1.5 hover:bg-muted rounded"><Pencil className="h-3.5 w-3.5" /></button>
                      <button onClick={() => { if (confirm("মুছবেন?")) deleteMutation.mutate(ad.id); }} className="p-1.5 hover:bg-destructive/10 rounded text-destructive"><Trash2 className="h-3.5 w-3.5" /></button>
                    </div>
                  </div>
                ))}
              </div>
            ) : <p className="p-4 text-sm text-muted-foreground">কোনো বিজ্ঞাপন নেই</p>}
          </div>
        </>
      )}

      {tab === "canvas" && (
        <div className="bg-card rounded-xl border border-border p-5">
          <h2 className="font-heading font-semibold mb-4 flex items-center gap-2"><Sparkles className="h-4 w-4" /> বিজ্ঞাপন ক্যানভাস</h2>
          <div className="space-y-4">
            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="text-xs text-muted-foreground">টেক্সট</label>
                <input value={canvasText} onChange={e => setCanvasText(e.target.value)} className="w-full mt-1 px-3 py-2 rounded-lg border border-input bg-background text-sm" />
              </div>
              <div>
                <label className="text-xs text-muted-foreground">ব্যাকগ্রাউন্ড</label>
                <input type="color" value={canvasBg} onChange={e => setCanvasBg(e.target.value)} className="w-full mt-1 h-9 rounded cursor-pointer" />
              </div>
            </div>
            <div className="flex gap-2">
              {[{ l: "ব্যানার 728x90", w: 728, h: 90 }, { l: "বক্স 300x250", w: 300, h: 250 }, { l: "স্কোয়ার 250x250", w: 250, h: 250 }, { l: "স্কাই 160x600", w: 160, h: 600 }].map(s => (
                <button key={s.l} onClick={() => setCanvasSize({ w: s.w, h: s.h })} className={`text-xs px-2 py-1 rounded ${canvasSize.w === s.w && canvasSize.h === s.h ? "bg-primary text-primary-foreground" : "bg-muted"}`}>{s.l}</button>
              ))}
            </div>
            <div className="border border-border rounded-lg overflow-auto max-h-96 bg-muted/30 p-4 flex justify-center">
              <canvas ref={canvasRef} width={canvasSize.w} height={canvasSize.h} className="border border-dashed border-border" />
            </div>
            <div className="flex gap-2">
              <button onClick={renderAdCanvas} className="px-4 py-2 rounded-lg bg-secondary text-secondary-foreground text-sm font-medium">প্রিভিউ</button>
              <button onClick={downloadAdCanvas} className="px-4 py-2 rounded-lg bg-primary text-primary-foreground text-sm font-medium">ডাউনলোড</button>
            </div>
          </div>
        </div>
      )}

      {tab === "demo" && (
        <div className="space-y-5">
          <h2 className="font-heading font-semibold">👁 ডেমো প্লেসমেন্ট</h2>
          {placements.map(p => {
            const placementAds = activeAds.filter(a => a.placement === p.value);
            return (
              <div key={p.value} className="bg-card rounded-xl border border-border p-4">
                <h3 className="text-sm font-medium text-muted-foreground mb-3">{p.label} ({placementAds.length}টি বিজ্ঞাপন)</h3>
                {placementAds.length > 0 ? (
                  <div className="space-y-2">
                    {placementAds.map(ad => (
                      <div key={ad.id} className="border border-dashed border-primary/30 rounded-lg p-3 bg-primary/5">
                        {ad.image_url ? (
                          <img src={ad.image_url} alt={ad.name} className="max-h-24 rounded" />
                        ) : (
                          <div className="text-sm" dangerouslySetInnerHTML={{ __html: ad.content }} />
                        )}
                        <p className="text-[10px] text-muted-foreground mt-1">📢 {ad.name}</p>
                      </div>
                    ))}
                  </div>
                ) : (
                  <div className="border-2 border-dashed border-border rounded-lg p-6 text-center text-muted-foreground text-sm">
                    বিজ্ঞাপন স্থান খালি — ডেমো
                  </div>
                )}
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}
