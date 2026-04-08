import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import {
  Archive, Globe, Plus, Trash2, RefreshCw, Play, Pause, Sparkles,
  ExternalLink, Clock, FolderOpen, Search, Image, Tag, Layers, Send,
} from "lucide-react";

type ArchiveContent = {
  id: string;
  source_url: string;
  title: string;
  content: string | null;
  excerpt: string | null;
  featured_image: string | null;
  images: any;
  tags: string[];
  category: string | null;
  source_name: string | null;
  status: string;
  ai_summary: string | null;
  ai_tags: string[];
  schedule_id: string | null;
  created_at: string;
};

type Schedule = {
  id: string;
  name: string;
  url: string;
  scrape_type: string;
  interval_hours: number;
  category: string | null;
  is_active: boolean;
  last_run_at: string | null;
  next_run_at: string | null;
  created_at: string;
};

type Tab = "scraper" | "archive" | "schedules" | "dashboard";

export default function AdminArchiveHub() {
  const qc = useQueryClient();
  const [tab, setTab] = useState<Tab>("scraper");
  const [urlInput, setUrlInput] = useState("https://vromonguide.com/");
  const [bulkUrls, setBulkUrls] = useState("");
  const [scrapeCategory, setScrapeCategory] = useState("");
  const [scrapeMode, setScrapeMode] = useState<"single" | "bulk">("single");
  const [isScraping, setIsScraping] = useState(false);
  const [filterCat, setFilterCat] = useState("");
  const [publishingItem, setPublishingItem] = useState<string | null>(null);
  const [publishCatId, setPublishCatId] = useState<string>("");

  // Schedule form
  const [schedForm, setSchedForm] = useState({ name: "", url: "", scrape_type: "single", interval_hours: 24, category: "" });

  const { data: contents, isLoading } = useQuery({
    queryKey: ["archive-contents", filterCat],
    queryFn: async () => {
      let q = supabase.from("archived_contents").select("*").order("created_at", { ascending: false }).limit(100);
      if (filterCat) q = q.eq("category", filterCat);
      const { data, error } = await q;
      if (error) throw error;
      return data as ArchiveContent[];
    },
  });

  const { data: schedules } = useQuery({
    queryKey: ["archive-schedules"],
    queryFn: async () => {
      const { data, error } = await supabase.from("archive_schedules").select("*").order("created_at", { ascending: false });
      if (error) throw error;
      return data as Schedule[];
    },
  });

  const { data: dbCategories } = useQuery({
    queryKey: ["db-categories"],
    queryFn: async () => {
      const { data } = await supabase.from("categories").select("id, name, type").is("deleted_at", null).order("name");
      return data ?? [];
    },
  });

  const archiveCategories = [...new Set((contents || []).map(c => c.category).filter(Boolean))] as string[];

  // Auto-match archive category to DB category
  const autoMatchCategory = (archiveCat: string | null): string => {
    if (!archiveCat || !dbCategories?.length) return "";
    const match = dbCategories.find(c => c.name.toLowerCase() === archiveCat.toLowerCase());
    return match?.id || "";
  };

  // Stats
  const total = contents?.length ?? 0;
  const fetched = contents?.filter(c => c.status === "fetched").length ?? 0;
  const aiProcessed = contents?.filter(c => c.status === "ai_processed").length ?? 0;
  const published = contents?.filter(c => c.status === "published").length ?? 0;

  const handleScrape = async () => {
    const urls = scrapeMode === "single"
      ? [urlInput.trim()]
      : bulkUrls.split("\n").map(u => u.trim()).filter(Boolean);

    if (urls.length === 0) return toast.error("URL দিন");
    setIsScraping(true);

    try {
      const { data, error } = await supabase.functions.invoke("archive-scraper", {
        body: { urls, category: scrapeCategory || undefined },
      });

      if (error) throw error;

      const successCount = data?.results?.filter((r: any) => r.success).length ?? 0;
      toast.success(`${successCount}/${urls.length} URL সফলভাবে স্ক্র্যাপ হয়েছে`);
      qc.invalidateQueries({ queryKey: ["archive-contents"] });
    } catch (e: any) {
      toast.error(e.message || "স্ক্র্যাপিং ব্যর্থ");
    } finally {
      setIsScraping(false);
    }
  };

  const aiProcess = async (item: ArchiveContent) => {
    toast.info("AI প্রসেসিং শুরু...");
    try {
      const { data, error } = await supabase.functions.invoke("ai-process", {
        body: { title: item.title, content: item.content || item.excerpt || "" },
      });
      if (error) throw error;

      const serviceUpdate = await supabase.from("archived_contents").update({
        ai_summary: data?.data?.summary || null,
        ai_tags: data?.data?.tags || [],
        status: "ai_processed",
      }).eq("id", item.id);

      if (serviceUpdate.error) throw serviceUpdate.error;
      toast.success("AI প্রসেসিং সম্পন্ন");
      qc.invalidateQueries({ queryKey: ["archive-contents"] });
    } catch (e: any) {
      toast.error(e.message || "AI প্রসেসিং ব্যর্থ");
    }
  };

  const publishAsPost = useMutation({
    mutationFn: async ({ item, categoryId }: { item: ArchiveContent; categoryId: string }) => {
      const slug = item.title.toLowerCase().replace(/\s+/g, "-").replace(/[^\u0980-\u09FF\w-]/g, "").slice(0, 120) || `archive-${Date.now()}`;
      const resolvedCatId = categoryId || autoMatchCategory(item.category) || null;
      const { error } = await supabase.from("posts").insert({
        title: item.title,
        slug,
        content: item.content || "",
        excerpt: item.excerpt || item.ai_summary || "",
        featured_image: item.featured_image || "",
        category_id: resolvedCatId,
        status: "published" as const,
        is_featured: false,
      });
      if (error) throw error;
      await supabase.from("archived_contents").update({ status: "published" }).eq("id", item.id);
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["archive-contents"] });
      qc.invalidateQueries({ queryKey: ["admin-posts"] });
      setPublishingItem(null);
      setPublishCatId("");
      toast.success("পোস্ট হিসেবে পাবলিশ হয়েছে!");
    },
    onError: (e: any) => toast.error(e.message || "পাবলিশ ব্যর্থ"),
  });

  const deleteContent = useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase.from("archived_contents").delete().eq("id", id);
      if (error) throw error;
    },
    onSuccess: () => { qc.invalidateQueries({ queryKey: ["archive-contents"] }); toast.success("মুছে ফেলা হয়েছে"); },
  });

  const addSchedule = useMutation({
    mutationFn: async () => {
      const { error } = await supabase.from("archive_schedules").insert({
        name: schedForm.name,
        url: schedForm.url,
        scrape_type: schedForm.scrape_type,
        interval_hours: schedForm.interval_hours,
        category: schedForm.category || null,
      });
      if (error) throw error;
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["archive-schedules"] });
      toast.success("শিডিউল যোগ হয়েছে");
      setSchedForm({ name: "", url: "", scrape_type: "single", interval_hours: 24, category: "" });
    },
    onError: (e: any) => toast.error(e.message),
  });

  const toggleSchedule = useMutation({
    mutationFn: async ({ id, is_active }: { id: string; is_active: boolean }) => {
      const { error } = await supabase.from("archive_schedules").update({ is_active }).eq("id", id);
      if (error) throw error;
    },
    onSuccess: () => qc.invalidateQueries({ queryKey: ["archive-schedules"] }),
  });

  const deleteSchedule = useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase.from("archive_schedules").delete().eq("id", id);
      if (error) throw error;
    },
    onSuccess: () => { qc.invalidateQueries({ queryKey: ["archive-schedules"] }); toast.success("শিডিউল মুছে ফেলা হয়েছে"); },
  });

  const tabs: { key: Tab; label: string; icon: any }[] = [
    { key: "dashboard", label: "ড্যাশবোর্ড", icon: Layers },
    { key: "scraper", label: "স্ক্র্যাপার", icon: Globe },
    { key: "archive", label: "আর্কাইভ", icon: Archive },
    { key: "schedules", label: "শিডিউল", icon: Clock },
  ];

  return (
    <div>
      <h1 className="font-heading font-bold text-2xl mb-4">🗄️ আর্কাইভ হাব — কন্টেন্ট স্ক্র্যাপার</h1>

      {/* Tabs */}
      <div className="flex gap-1 mb-6 bg-muted rounded-lg p-1 w-fit">
        {tabs.map(t => (
          <button key={t.key} onClick={() => setTab(t.key)}
            className={`flex items-center gap-1.5 px-3 py-1.5 rounded-md text-sm font-medium transition-colors ${tab === t.key ? "bg-primary text-primary-foreground" : "text-muted-foreground hover:text-foreground"}`}>
            <t.icon className="h-3.5 w-3.5" /> {t.label}
          </button>
        ))}
      </div>

      {/* Dashboard Tab */}
      {tab === "dashboard" && (
        <div className="space-y-4">
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
            {[
              { label: "মোট কন্টেন্ট", value: total, color: "text-foreground" },
              { label: "ফেচড", value: fetched, color: "text-blue-500" },
              { label: "AI প্রসেসড", value: aiProcessed, color: "text-amber-500" },
              { label: "পাবলিশড", value: published, color: "text-green-500" },
            ].map(s => (
              <div key={s.label} className="bg-card rounded-xl border border-border p-4 text-center">
                <p className={`text-2xl font-bold ${s.color}`}>{s.value}</p>
                <p className="text-xs text-muted-foreground mt-1">{s.label}</p>
              </div>
            ))}
          </div>
          <div className="bg-card rounded-xl border border-border p-4">
            <h3 className="font-heading font-semibold text-sm mb-2">ক্যাটাগরি অনুযায়ী</h3>
            {archiveCategories.length > 0 ? (
              <div className="flex flex-wrap gap-2">
                {archiveCategories.map(cat => {
                  const count = contents?.filter(c => c.category === cat).length ?? 0;
                  return (
                    <button key={cat} onClick={() => { setFilterCat(cat); setTab("archive"); }}
                      className="px-3 py-1 rounded-full bg-muted text-sm hover:bg-primary/10 transition-colors">
                      {cat} <span className="text-muted-foreground ml-1">({count})</span>
                    </button>
                  );
                })}
              </div>
            ) : <p className="text-sm text-muted-foreground">কোনো ক্যাটাগরি নেই</p>}
          </div>
          <div className="bg-card rounded-xl border border-border p-4">
            <h3 className="font-heading font-semibold text-sm mb-2">সক্রিয় শিডিউল ({schedules?.filter(s => s.is_active).length ?? 0})</h3>
            {schedules?.filter(s => s.is_active).map(s => (
              <div key={s.id} className="text-sm py-1 text-muted-foreground">
                {s.name} — প্রতি {s.interval_hours} ঘণ্টা
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Scraper Tab */}
      {tab === "scraper" && (
        <div className="space-y-4">
          <div className="bg-card rounded-xl border border-border p-4">
            <div className="flex gap-2 mb-3">
              <button onClick={() => setScrapeMode("single")} className={`px-3 py-1 rounded-md text-sm ${scrapeMode === "single" ? "bg-primary text-primary-foreground" : "bg-muted"}`}>
                একক URL
              </button>
              <button onClick={() => setScrapeMode("bulk")} className={`px-3 py-1 rounded-md text-sm ${scrapeMode === "bulk" ? "bg-primary text-primary-foreground" : "bg-muted"}`}>
                বাল্ক URL
              </button>
            </div>

            {scrapeMode === "single" ? (
              <input value={urlInput} onChange={e => setUrlInput(e.target.value)} placeholder="https://vromonguide.com/"
                className="w-full px-3 py-2 rounded-lg border border-input bg-background text-sm mb-3" />
            ) : (
              <textarea value={bulkUrls} onChange={e => setBulkUrls(e.target.value)} rows={5}
                placeholder="প্রতি লাইনে একটি URL দিন..."
                className="w-full px-3 py-2 rounded-lg border border-input bg-background text-sm mb-3 resize-y" />
            )}

            <div className="flex gap-2 items-center">
              <input value={scrapeCategory} onChange={e => setScrapeCategory(e.target.value)} placeholder="ক্যাটাগরি (ঐচ্ছিক)"
                className="px-3 py-2 rounded-lg border border-input bg-background text-sm flex-1" />
              <button onClick={handleScrape} disabled={isScraping}
                className="flex items-center gap-1.5 px-4 py-2 rounded-lg bg-primary text-primary-foreground text-sm font-medium disabled:opacity-50">
                {isScraping ? <RefreshCw className="h-4 w-4 animate-spin" /> : <Search className="h-4 w-4" />}
                {isScraping ? "স্ক্র্যাপিং..." : "স্ক্র্যাপ করুন"}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Archive Tab */}
      {tab === "archive" && (
        <div className="space-y-3">
          {/* Category filter */}
          <div className="flex gap-2 flex-wrap items-center">
            <button onClick={() => setFilterCat("")} className={`px-2 py-1 rounded text-xs ${!filterCat ? "bg-primary text-primary-foreground" : "bg-muted"}`}>সব</button>
            {archiveCategories.map(c => (
              <button key={c} onClick={() => setFilterCat(c)} className={`px-2 py-1 rounded text-xs ${filterCat === c ? "bg-primary text-primary-foreground" : "bg-muted"}`}>{c}</button>
            ))}
          </div>

          {isLoading ? <p className="text-sm text-muted-foreground p-4">লোড হচ্ছে...</p> : (
            <div className="space-y-2">
              {contents?.map(item => (
                <div key={item.id} className="bg-card rounded-xl border border-border p-3">
                  <div className="flex gap-3">
                    {item.featured_image && (
                      <img src={item.featured_image} alt="" className="w-16 h-16 rounded-lg object-cover shrink-0" />
                    )}
                    <div className="flex-1 min-w-0">
                      <div className="flex items-start justify-between gap-2">
                        <h3 className="text-sm font-medium line-clamp-1">{item.title}</h3>
                        <span className={`text-[10px] px-1.5 py-0.5 rounded shrink-0 ${
                          item.status === "fetched" ? "bg-blue-500/10 text-blue-500"
                            : item.status === "ai_processed" ? "bg-amber-500/10 text-amber-500"
                            : "bg-green-500/10 text-green-500"
                        }`}>{item.status}</span>
                      </div>
                      {item.excerpt && <p className="text-xs text-muted-foreground line-clamp-2 mt-0.5">{item.excerpt}</p>}
                      <div className="flex items-center gap-2 mt-1.5 text-[10px] text-muted-foreground">
                        {item.category && <span className="flex items-center gap-0.5"><FolderOpen className="h-3 w-3" />{item.category}</span>}
                        {item.tags?.length > 0 && <span className="flex items-center gap-0.5"><Tag className="h-3 w-3" />{item.tags.length}</span>}
                        {(() => { try { const imgs = typeof item.images === 'string' ? JSON.parse(item.images) : item.images; return imgs?.length > 0 ? <span className="flex items-center gap-0.5"><Image className="h-3 w-3" />{imgs.length}</span> : null; } catch { return null; } })()}
                        <span>{item.source_name}</span>
                      </div>
                      {item.ai_summary && (
                        <p className="text-xs text-muted-foreground mt-1 bg-muted/50 rounded p-1.5 line-clamp-2">
                          <Sparkles className="h-3 w-3 inline mr-1 text-amber-500" />{item.ai_summary}
                        </p>
                      )}
                    </div>
                  </div>
                  <div className="flex items-center gap-1 mt-2 border-t border-border pt-2">
                    <a href={item.source_url} target="_blank" rel="noopener" className="flex items-center gap-1 text-xs text-primary hover:underline">
                      <ExternalLink className="h-3 w-3" /> সোর্স
                    </a>
                    <div className="flex-1" />
                    {item.status !== "published" && publishingItem !== item.id && (
                      <button onClick={() => { setPublishingItem(item.id); setPublishCatId(autoMatchCategory(item.category)); }}
                        className="p-1.5 hover:bg-green-500/10 rounded text-green-600" title="পোস্টে পাবলিশ">
                        <Send className="h-3.5 w-3.5" />
                      </button>
                    )}
                    <button onClick={() => aiProcess(item)} className="p-1.5 hover:bg-primary/10 rounded text-primary" title="AI প্রসেস">
                      <Sparkles className="h-3.5 w-3.5" />
                    </button>
                    <button onClick={() => { if (confirm("নিশ্চিত?")) deleteContent.mutate(item.id); }} className="p-1.5 hover:bg-destructive/10 rounded text-destructive">
                      <Trash2 className="h-3.5 w-3.5" />
                    </button>
                  </div>
                </div>
              ))}
              {contents?.length === 0 && <p className="text-sm text-muted-foreground p-4">আর্কাইভ খালি</p>}
            </div>
          )}
        </div>
      )}

      {/* Schedules Tab */}
      {tab === "schedules" && (
        <div className="space-y-4">
          <div className="bg-card rounded-xl border border-border p-4">
            <h2 className="font-heading font-semibold text-sm mb-3">নতুন শিডিউল যোগ করুন</h2>
            <div className="grid sm:grid-cols-2 gap-3">
              <input value={schedForm.name} onChange={e => setSchedForm(p => ({ ...p, name: e.target.value }))} placeholder="শিডিউলের নাম"
                className="px-3 py-2 rounded-lg border border-input bg-background text-sm" />
              <input value={schedForm.url} onChange={e => setSchedForm(p => ({ ...p, url: e.target.value }))} placeholder="URL"
                className="px-3 py-2 rounded-lg border border-input bg-background text-sm" />
              <select value={schedForm.scrape_type} onChange={e => setSchedForm(p => ({ ...p, scrape_type: e.target.value }))}
                className="px-3 py-2 rounded-lg border border-input bg-background text-sm">
                <option value="single">একক URL</option>
                <option value="bulk">বাল্ক (সাইটম্যাপ)</option>
              </select>
              <input value={schedForm.category} onChange={e => setSchedForm(p => ({ ...p, category: e.target.value }))} placeholder="ক্যাটাগরি"
                className="px-3 py-2 rounded-lg border border-input bg-background text-sm" />
              <div className="flex items-center gap-2">
                <label className="text-xs text-muted-foreground whitespace-nowrap">ইন্টারভাল (ঘণ্টা):</label>
                <input type="number" value={schedForm.interval_hours} min={1}
                  onChange={e => setSchedForm(p => ({ ...p, interval_hours: parseInt(e.target.value) || 24 }))}
                  className="w-20 px-3 py-2 rounded-lg border border-input bg-background text-sm" />
              </div>
              <button onClick={() => addSchedule.mutate()} disabled={!schedForm.name || !schedForm.url}
                className="flex items-center justify-center gap-1 px-4 py-2 rounded-lg bg-primary text-primary-foreground text-sm font-medium disabled:opacity-50">
                <Plus className="h-4 w-4" /> যোগ করুন
              </button>
            </div>
          </div>

          <div className="bg-card rounded-xl border border-border overflow-hidden">
            <div className="px-4 py-2.5 bg-muted border-b border-border font-heading font-semibold text-sm">
              শিডিউল তালিকা ({schedules?.length ?? 0})
            </div>
            {schedules && schedules.length > 0 ? (
              <div className="divide-y divide-border">
                {schedules.map(s => (
                  <div key={s.id} className="flex items-center justify-between px-4 py-3">
                    <div>
                      <p className="text-sm font-medium">{s.name}</p>
                      <p className="text-xs text-muted-foreground">{s.url}</p>
                      <p className="text-xs text-muted-foreground">
                        প্রতি {s.interval_hours} ঘণ্টা • {s.scrape_type}
                        {s.category && ` • ${s.category}`}
                        {s.last_run_at && ` • শেষ: ${new Date(s.last_run_at).toLocaleString("bn-BD")}`}
                      </p>
                    </div>
                    <div className="flex items-center gap-1">
                      <button onClick={() => toggleSchedule.mutate({ id: s.id, is_active: !s.is_active })}
                        className="p-1.5 hover:bg-muted rounded">
                        {s.is_active ? <Pause className="h-3.5 w-3.5" /> : <Play className="h-3.5 w-3.5" />}
                      </button>
                      <button onClick={() => { if (confirm("নিশ্চিত?")) deleteSchedule.mutate(s.id); }}
                        className="p-1.5 hover:bg-destructive/10 rounded text-destructive">
                        <Trash2 className="h-3.5 w-3.5" />
                      </button>
                    </div>
                  </div>
                ))}
              </div>
            ) : <p className="p-4 text-sm text-muted-foreground">কোনো শিডিউল নেই</p>}
          </div>
        </div>
      )}
    </div>
  );
}
