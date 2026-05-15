import { useState, useMemo } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import {
  Archive, Globe, Plus, Trash2, RefreshCw, Play, Pause, Sparkles,
  ExternalLink, Clock, FolderOpen, Search, Image, Tag, Layers, Send,
  CheckSquare, Square, ChevronsUp, Calendar, Users,
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

const bengaliMonthNames = ['জানুয়ারি','ফেব্রুয়ারি','মার্চ','এপ্রিল','মে','জুন','জুলাই','আগস্ট','সেপ্টেম্বর','অক্টোবর','নভেম্বর','ডিসেম্বর'];

export default function AdminArchiveHub() {
  const qc = useQueryClient();
  const [tab, setTab] = useState<Tab>("scraper");
  const [urlInput, setUrlInput] = useState("https://vromonguide.com/");
  const [bulkUrls, setBulkUrls] = useState("");
  const [scrapeCategory, setScrapeCategory] = useState("");
  const [scrapeMode, setScrapeMode] = useState<"single" | "bulk">("single");
  const [discoverLinks, setDiscoverLinks] = useState(false);
  const [maxPages, setMaxPages] = useState(500);
  const [isScraping, setIsScraping] = useState(false);
  const [filterCat, setFilterCat] = useState("");
  const [publishingItem, setPublishingItem] = useState<string | null>(null);
  const [publishCatId, setPublishCatId] = useState<string>("");
  const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set());
  const [bulkPublishCatId, setBulkPublishCatId] = useState<string>("");
  const [showBulkPublish, setShowBulkPublish] = useState(false);
  const [isScrapingThisDay, setIsScrapingThisDay] = useState(false);
  const [thisDayStartMonth, setThisDayStartMonth] = useState(1);
  const [thisDayEndMonth, setThisDayEndMonth] = useState(12);
  const [isScrapingPeople, setIsScrapingPeople] = useState(false);
  const [peopleCategoryTag, setPeopleCategoryTag] = useState("");
  const [peopleMaxCount, setPeopleMaxCount] = useState(50);
  const [peopleAutoPublish, setPeopleAutoPublish] = useState(false);
  const [peoplePubCatId, setPeoplePubCatId] = useState("");
  const [peopleCustomUrls, setPeopleCustomUrls] = useState("");

  const [schedForm, setSchedForm] = useState({ name: "", url: "", scrape_type: "single", interval_hours: 24, category: "", category_id: "" });

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
    queryKey: ["db-categories-full"],
    queryFn: async () => {
      const { data } = await supabase.from("categories").select("id, name, type, parent_id, slug").is("deleted_at", null).order("sort_order").order("name");
      return data ?? [];
    },
  });

  // Category tree for hierarchical dropdowns
  const categoryTree = useMemo(() => {
    if (!dbCategories) return [];
    const parents = dbCategories.filter(c => !c.parent_id);
    return parents.map(p => ({
      ...p,
      children: dbCategories.filter(c => c.parent_id === p.id),
    }));
  }, [dbCategories]);

  const archiveCategories = [...new Set((contents || []).map(c => c.category).filter(Boolean))] as string[];

  const autoMatchCategory = (archiveCat: string | null): string => {
    if (!archiveCat || !dbCategories?.length) return "";
    const match = dbCategories.find(c => c.name.toLowerCase() === archiveCat.toLowerCase());
    return match?.id || "";
  };

  const total = contents?.length ?? 0;
  const fetched = contents?.filter(c => c.status === "fetched").length ?? 0;
  const aiProcessed = contents?.filter(c => c.status === "ai_processed").length ?? 0;
  const published = contents?.filter(c => c.status === "published").length ?? 0;

  // Unpublished items for selection
  const unpublishedItems = contents?.filter(c => c.status !== "published") ?? [];

  const toggleSelect = (id: string) => {
    setSelectedIds(prev => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id); else next.add(id);
      return next;
    });
  };

  const toggleSelectAll = () => {
    if (selectedIds.size === unpublishedItems.length) {
      setSelectedIds(new Set());
    } else {
      setSelectedIds(new Set(unpublishedItems.map(i => i.id)));
    }
  };

  const handleScrape = async () => {
    const urls = scrapeMode === "single"
      ? [urlInput.trim()]
      : bulkUrls.split("\n").map(u => u.trim()).filter(Boolean);
    if (urls.length === 0) return toast.error("URL দিন");
    setIsScraping(true);
    try {
      const { data, error } = await supabase.functions.invoke("archive-scraper", {
        body: { urls, category: scrapeCategory || undefined, discover_links: discoverLinks, max_pages: maxPages },
      });
      if (error) throw error;
      const successCount = data?.successCount ?? data?.results?.filter((r: any) => r.success).length ?? 0;
      const totalProcessed = data?.total ?? urls.length;
      toast.success(`${successCount}/${totalProcessed} URL সফলভাবে স্ক্র্যাপ হয়েছে`);
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
        title: item.title, slug, content: item.content || "",
        excerpt: item.excerpt || item.ai_summary || "",
        featured_image: item.featured_image || "",
        category_id: resolvedCatId, status: "published" as const, is_featured: false,
        source_url: item.source_url || null,
      } as any);
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

  // Bulk publish mutation
  const bulkPublish = useMutation({
    mutationFn: async ({ items, categoryId }: { items: ArchiveContent[]; categoryId: string }) => {
      let successCount = 0;
      for (const item of items) {
        try {
          const slug = item.title.toLowerCase().replace(/\s+/g, "-").replace(/[^\u0980-\u09FF\w-]/g, "").slice(0, 120) || `archive-${Date.now()}-${Math.random().toString(36).slice(2, 6)}`;
          const resolvedCatId = categoryId || autoMatchCategory(item.category) || null;
          const { error } = await supabase.from("posts").insert({
            title: item.title, slug, content: item.content || "",
            excerpt: item.excerpt || item.ai_summary || "",
            featured_image: item.featured_image || "",
            category_id: resolvedCatId, status: "published" as const, is_featured: false,
            source_url: item.source_url || null,
          } as any);
          if (!error) {
            await supabase.from("archived_contents").update({ status: "published" }).eq("id", item.id);
            successCount++;
          }
        } catch { /* skip failed */ }
      }
      return successCount;
    },
    onSuccess: (count) => {
      qc.invalidateQueries({ queryKey: ["archive-contents"] });
      qc.invalidateQueries({ queryKey: ["admin-posts"] });
      setSelectedIds(new Set());
      setShowBulkPublish(false);
      setBulkPublishCatId("");
      toast.success(`${count}টি কন্টেন্ট পোস্ট হিসেবে পাবলিশ হয়েছে!`);
    },
    onError: (e: any) => toast.error(e.message || "বাল্ক পাবলিশ ব্যর্থ"),
  });

  const handleBulkPublish = () => {
    const items = contents?.filter(c => selectedIds.has(c.id)) ?? [];
    if (items.length === 0) return toast.error("কন্টেন্ট সিলেক্ট করুন");
    bulkPublish.mutate({ items, categoryId: bulkPublishCatId });
  };

  // Re-fetch broken/incomplete items
  const [isRefetching, setIsRefetching] = useState(false);

  const refetchItems = async (items: ArchiveContent[]) => {
    if (items.length === 0) return toast.error("আইটেম সিলেক্ট করুন");
    setIsRefetching(true);
    try {
      const urls = items.map(i => i.source_url).filter(Boolean);
      const ids = items.map(i => i.id);
      // Delete old broken records
      const { error: delErr } = await supabase.from("archived_contents").delete().in("id", ids);
      if (delErr) throw delErr;
      // Re-scrape with same URLs
      const category = items[0]?.category || undefined;
      const { data, error } = await supabase.functions.invoke("archive-scraper", {
        body: { urls, category, discover_links: false, max_pages: urls.length },
      });
      if (error) throw error;
      const successCount = data?.successCount ?? 0;
      toast.success(`${successCount}/${urls.length}টি কন্টেন্ট রি-আপডেট হয়েছে`);
      qc.invalidateQueries({ queryKey: ["archive-contents"] });
      setSelectedIds(new Set());
    } catch (e: any) {
      toast.error(e.message || "রি-আপডেট ব্যর্থ");
    } finally {
      setIsRefetching(false);
    }
  };

  const refetchAll = async () => {
    const broken = contents?.filter(c => c.status !== "published" && (!c.content || c.content.length < 100)) ?? [];
    if (broken.length === 0) return toast.info("ভাঙ্গা কন্টেন্ট নেই");
    if (!confirm(`${broken.length}টি ভাঙ্গা/অসম্পূর্ণ কন্টেন্ট রি-আপডেট করবেন?`)) return;
    await refetchItems(broken);
  };

  const handleScrapeThisDay = async () => {
    setIsScrapingThisDay(true);
    try {
      const { data, error } = await supabase.functions.invoke("scrape-this-day", {
        body: { start_month: thisDayStartMonth, end_month: thisDayEndMonth },
      });
      if (error) throw error;
      toast.success(`${data?.total_events ?? 0}টি ঐতিহাসিক ঘটনা সেভ হয়েছে (${data?.pages_processed ?? 0} পেজ প্রসেস)`);
    } catch (e: any) {
      toast.error(e.message || "এই দিনে স্ক্র্যাপিং ব্যর্থ");
    } finally {
      setIsScrapingThisDay(false);
    }
  };

  const handleScrapePeople = async () => {
    setIsScrapingPeople(true);
    try {
      const body: any = { max_people: peopleMaxCount, auto_sync: true };
      if (peopleCategoryTag) body.category_tag = peopleCategoryTag;
      if (peopleAutoPublish && peoplePubCatId) body.publish_category_id = peoplePubCatId;
      if (peopleCustomUrls.trim()) {
        // Support 👉, newlines, and commas as separators between URLs
        const parts = peopleCustomUrls
          .split(/👉|\n|,/g)
          .map(u => u.trim())
          .filter(u => u.startsWith('http'));
        if (parts.length) body.urls = parts;
      }
      const { data, error } = await supabase.functions.invoke("scrape-wiki-people", { body });
      if (error) throw error;
      toast.success(
        `${data?.saved ?? 0}টি সেভ • ${data?.updated ?? 0}টি আপডেট • ${data?.published ?? 0}টি পোস্ট পাবলিশ`
      );
      qc.invalidateQueries({ queryKey: ["archive-contents"] });
    } catch (e: any) {
      toast.error(e.message || "পিপল স্ক্র্যাপিং ব্যর্থ");
    } finally {
      setIsScrapingPeople(false);
    }
  };

  const handleSyncWikiPeople = async () => {
    setIsScrapingPeople(true);
    try {
      const { data, error } = await supabase.functions.invoke("scrape-wiki-people", {
        body: { mode: 'sync' },
      });
      if (error) throw error;
      toast.success(`উইকি সিঙ্ক সম্পন্ন: ${data?.updated ?? 0}টি প্রোফাইল আপডেট হয়েছে`);
      qc.invalidateQueries({ queryKey: ["archive-contents"] });
    } catch (e: any) {
      toast.error(e.message || "সিঙ্ক ব্যর্থ");
    } finally {
      setIsScrapingPeople(false);
    }
  };
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
        name: schedForm.name, url: schedForm.url,
        scrape_type: schedForm.scrape_type, interval_hours: schedForm.interval_hours,
        category: schedForm.category || null,
      });
      if (error) throw error;
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["archive-schedules"] });
      toast.success("শিডিউল যোগ হয়েছে");
      setSchedForm({ name: "", url: "", scrape_type: "single", interval_hours: 24, category: "", category_id: "" });
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
              <button onClick={() => setScrapeMode("single")} className={`px-3 py-1 rounded-md text-sm ${scrapeMode === "single" ? "bg-primary text-primary-foreground" : "bg-muted"}`}>একক URL</button>
              <button onClick={() => setScrapeMode("bulk")} className={`px-3 py-1 rounded-md text-sm ${scrapeMode === "bulk" ? "bg-primary text-primary-foreground" : "bg-muted"}`}>বাল্ক URL</button>
            </div>
            {scrapeMode === "single" ? (
              <input value={urlInput} onChange={e => setUrlInput(e.target.value)} placeholder="https://vromonguide.com/"
                className="w-full px-3 py-2 rounded-lg border border-input bg-background text-sm mb-3" />
            ) : (
              <textarea value={bulkUrls} onChange={e => setBulkUrls(e.target.value)} rows={5}
                placeholder="প্রতি লাইনে একটি URL দিন..."
                className="w-full px-3 py-2 rounded-lg border border-input bg-background text-sm mb-3 resize-y" />
            )}
            <div className="flex gap-2 items-center flex-wrap">
              <input value={scrapeCategory} onChange={e => setScrapeCategory(e.target.value)} placeholder="ক্যাটাগরি (ঐচ্ছিক)"
                className="px-3 py-2 rounded-lg border border-input bg-background text-sm flex-1 min-w-[150px]" />
              <input type="number" value={maxPages} onChange={e => setMaxPages(Number(e.target.value))} min={1} max={1000}
                className="px-3 py-2 rounded-lg border border-input bg-background text-sm w-24" title="সর্বোচ্চ পেজ" />
              <label className="flex items-center gap-1.5 text-xs">
                <input type="checkbox" checked={discoverLinks} onChange={e => setDiscoverLinks(e.target.checked)} />
                লিংক ডিসকভার (৫০০+)
              </label>
              <button onClick={handleScrape} disabled={isScraping}
                className="flex items-center gap-1.5 px-4 py-2 rounded-lg bg-primary text-primary-foreground text-sm font-medium disabled:opacity-50">
                {isScraping ? <RefreshCw className="h-4 w-4 animate-spin" /> : <Search className="h-4 w-4" />}
                {isScraping ? "স্ক্র্যাপিং..." : "স্ক্র্যাপ করুন"}
              </button>
            </div>
          </div>

          {/* This Day scraper */}
          <div className="bg-card rounded-xl border border-border p-4">
            <h3 className="font-heading font-semibold text-sm mb-3 flex items-center gap-2">
              <Calendar className="h-4 w-4 text-primary" /> এই দিনে — ঐতিহাসিক ঘটনা স্ক্র্যাপার
            </h3>
            <p className="text-xs text-muted-foreground mb-3">
              বাংলা উইকিপিডিয়া থেকে প্রতিদিনের ঐতিহাসিক ঘটনা, জন্ম ও মৃত্যু তথ্য স্ক্র্যাপ করে ডেটাবেসে সেভ করবে।
            </p>
            <div className="flex gap-2 items-center flex-wrap mb-3">
              <label className="text-xs">শুরু মাস:</label>
              <select value={thisDayStartMonth} onChange={e => setThisDayStartMonth(Number(e.target.value))}
                className="px-2 py-1 rounded border border-input bg-background text-sm">
                {bengaliMonthNames.map((m, i) => <option key={i} value={i + 1}>{m}</option>)}
              </select>
              <label className="text-xs">শেষ মাস:</label>
              <select value={thisDayEndMonth} onChange={e => setThisDayEndMonth(Number(e.target.value))}
                className="px-2 py-1 rounded border border-input bg-background text-sm">
                {bengaliMonthNames.map((m, i) => <option key={i} value={i + 1}>{m}</option>)}
              </select>
              <button onClick={handleScrapeThisDay} disabled={isScrapingThisDay}
                className="flex items-center gap-1.5 px-4 py-2 rounded-lg bg-primary text-primary-foreground text-sm font-medium disabled:opacity-50">
                {isScrapingThisDay ? <RefreshCw className="h-4 w-4 animate-spin" /> : <Calendar className="h-4 w-4" />}
                {isScrapingThisDay ? "স্ক্র্যাপিং..." : "এই দিনে স্ক্র্যাপ করুন"}
              </button>
            </div>
          </div>

          {/* World Days scraper */}
          <div className="bg-card rounded-xl border border-border p-4">
            <h3 className="font-heading font-semibold text-sm mb-3 flex items-center gap-2">
              <Globe className="h-4 w-4 text-primary" /> বিশ্ব দিবস তালিকা স্ক্র্যাপার
            </h3>
            <p className="text-xs text-muted-foreground mb-3">
              বাংলা উইকিপিডিয়ার <span className="font-mono">বিশ্ব দিবস তালিকা</span> পেজ থেকে সকল দিবসের লিংক ডিসকভার করে প্রতিটি দিবসের সম্পূর্ণ তথ্য আর্কাইভে সেভ করবে।
            </p>
            <button
              onClick={async () => {
                setIsScraping(true);
                try {
                  const { data, error } = await supabase.functions.invoke("archive-scraper", {
                    body: {
                      urls: ["https://bn.wikipedia.org/wiki/বিশ্ব_দিবস_তালিকা"],
                      category: "বিশ্ব দিবস",
                      discover_links: true,
                      max_pages: 500,
                    },
                  });
                  if (error) throw error;
                  toast.success(`${data?.successCount ?? 0} টি দিবস আর্কাইভ হয়েছে`);
                  qc.invalidateQueries({ queryKey: ["archive-contents"] });
                } catch (e: any) {
                  toast.error(e.message || "স্ক্র্যাপ ব্যর্থ");
                } finally {
                  setIsScraping(false);
                }
              }}
              disabled={isScraping}
              className="flex items-center gap-1.5 px-4 py-2 rounded-lg bg-primary text-primary-foreground text-sm font-medium disabled:opacity-50">
              {isScraping ? <RefreshCw className="h-4 w-4 animate-spin" /> : <Globe className="h-4 w-4" />}
              {isScraping ? "স্ক্র্যাপিং..." : "বিশ্ব দিবস স্ক্র্যাপ করুন"}
            </button>
          </div>

          {/* Bangladeshi People List scraper */}
          <div className="bg-card rounded-xl border border-border p-4">
            <h3 className="font-heading font-semibold text-sm mb-3 flex items-center gap-2">
              <Users className="h-4 w-4 text-primary" /> বাংলাদেশী ব্যক্তিবর্গের তালিকা স্ক্র্যাপার
            </h3>
            <p className="text-xs text-muted-foreground mb-3">
              বাংলা উইকিপিডিয়ার <span className="font-mono">বাংলাদেশী ব্যক্তিবর্গের তালিকা</span> পেজ থেকে সকল ব্যক্তির লিংক ডিসকভার করে প্রতিটির পূর্ণ প্রোফাইল (ইনফোবক্স, ছবি, সেকশন সহ) আর্কাইভে সেভ করবে।
            </p>
            <button
              onClick={async () => {
                setIsScrapingPeople(true);
                try {
                  const { data, error } = await supabase.functions.invoke("scrape-wiki-people", {
                    body: {
                      list_urls: ["https://bn.wikipedia.org/wiki/বাংলাদেশী_ব্যক্তিবর্গের_তালিকা"],
                      category_tag: "বাংলাদেশী",
                      max_people: 500,
                      auto_sync: true,
                      background: true,
                      publish_category_id: peopleAutoPublish ? peoplePubCatId : undefined,
                    },
                  });
                  if (error) throw error;
                  toast.success(`ব্যাকগ্রাউন্ডে ${data?.total ?? 0} জনের প্রোফাইল স্ক্র্যাপিং শুরু হয়েছে`);
                  qc.invalidateQueries({ queryKey: ["archive-contents"] });
                } catch (e: any) {
                  toast.error(e.message || "স্ক্র্যাপ ব্যর্থ");
                } finally {
                  setIsScrapingPeople(false);
                }
              }}
              disabled={isScrapingPeople}
              className="flex items-center gap-1.5 px-4 py-2 rounded-lg bg-primary text-primary-foreground text-sm font-medium disabled:opacity-50">
              {isScrapingPeople ? <RefreshCw className="h-4 w-4 animate-spin" /> : <Users className="h-4 w-4" />}
              {isScrapingPeople ? "শুরু হচ্ছে..." : "বাংলাদেশী ব্যক্তিবর্গ স্ক্র্যাপ করুন"}
            </button>
          </div>

          {/* Wiki People scraper */}
          <div className="bg-card rounded-xl border border-border p-4">
            <h3 className="font-heading font-semibold text-sm mb-3 flex items-center gap-2">
              <Users className="h-4 w-4 text-primary" /> পিপল — বিশ্ববরেণ্য ব্যক্তি স্ক্র্যাপার
            </h3>
            <p className="text-xs text-muted-foreground mb-3">
              বাংলা উইকিপিডিয়া থেকে কবি, সাহিত্যিক, রাজনীতিবিদ ও বরণ্য ব্যক্তিদের প্রোফাইল স্ক্র্যাপ করে আর্কাইভে সেভ ও পোস্ট করবে।
            </p>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 mb-3">
              <div>
                <label className="text-xs text-muted-foreground">ক্যাটাগরি ফিল্টার</label>
                <select value={peopleCategoryTag} onChange={e => setPeopleCategoryTag(e.target.value)}
                  className="w-full px-2 py-1.5 rounded border border-input bg-background text-sm">
                  <option value="">সব ক্যাটাগরি</option>
                  {['কবি','সাহিত্যিক','রাজনীতিবিদ','বিজ্ঞানী','শিল্পী','সংগীতশিল্পী','অভিনেতা','বিশ্ববরেণ্য'].map(c => (
                    <option key={c} value={c}>{c}</option>
                  ))}
                </select>
              </div>
              <div>
                <label className="text-xs text-muted-foreground">সর্বোচ্চ সংখ্যা</label>
                <input type="number" value={peopleMaxCount} onChange={e => setPeopleMaxCount(Number(e.target.value))} min={1} max={500}
                  className="w-full px-2 py-1.5 rounded border border-input bg-background text-sm" />
              </div>
            </div>
            <div className="mb-3">
              <label className="text-xs text-muted-foreground">
                কাস্টম উইকিপিডিয়া URL (একাধিক হলে নতুন লাইন, কমা, অথবা 👉 দিয়ে আলাদা করুন)
              </label>
              <textarea value={peopleCustomUrls} onChange={e => setPeopleCustomUrls(e.target.value)} rows={4}
                placeholder={"https://bn.wikipedia.org/wiki/আব্রাহাম_লিংকন👉https://bn.wikipedia.org/wiki/যোসেফ_স্ট্যালিন👉https://bn.wikipedia.org/wiki/বেনিতো_হুয়ারেস"}
                className="w-full px-2 py-1.5 rounded border border-input bg-background text-sm resize-y" />
              <p className="text-[10px] text-muted-foreground mt-1">
                হুবহু উইকিপিডিয়া পেজের সম্পূর্ণ HTML (ইনফোবক্স, ছবি, সেকশন সহ) সেভ হবে। স্বয়ংক্রিয় সিঙ্ক চালু থাকবে — উইকিপিডিয়া আপডেট হলে এখানেও আপডেট হবে।
              </p>
            </div>
            <div className="flex gap-2 items-center flex-wrap mb-3">
              <label className="flex items-center gap-1.5 text-xs">
                <input type="checkbox" checked={peopleAutoPublish} onChange={e => setPeopleAutoPublish(e.target.checked)} />
                অটো-পাবলিশ পোস্ট হিসেবে
              </label>
              {peopleAutoPublish && (
                <select value={peoplePubCatId} onChange={e => setPeoplePubCatId(e.target.value)}
                  className="px-2 py-1 rounded border border-input bg-background text-sm">
                  <option value="">পোস্ট ক্যাটাগরি নির্বাচন</option>
                  {categoryTree.map(p => (
                    <optgroup key={p.id} label={`${p.name} (${p.type})`}>
                      <option value={p.id}>{p.name}</option>
                      {p.children.map((c: any) => <option key={c.id} value={c.id}>↳ {c.name}</option>)}
                    </optgroup>
                  ))}
                </select>
              )}
            </div>
            <div className="flex flex-wrap gap-2">
              <button onClick={handleScrapePeople} disabled={isScrapingPeople}
                className="flex items-center gap-1.5 px-4 py-2 rounded-lg bg-primary text-primary-foreground text-sm font-medium disabled:opacity-50">
                {isScrapingPeople ? <RefreshCw className="h-4 w-4 animate-spin" /> : <Users className="h-4 w-4" />}
                {isScrapingPeople ? "স্ক্র্যাপিং চলছে..." : "পিপল স্ক্র্যাপ করুন"}
              </button>
              <button onClick={handleSyncWikiPeople} disabled={isScrapingPeople}
                title="যেসব উইকি প্রোফাইলে অটো-সিঙ্ক চালু আছে সেগুলো এখনই আপডেট করুন"
                className="flex items-center gap-1.5 px-4 py-2 rounded-lg border border-input bg-background text-sm font-medium disabled:opacity-50">
                <RefreshCw className={`h-4 w-4 ${isScrapingPeople ? 'animate-spin' : ''}`} />
                সব উইকি সিঙ্ক করুন
              </button>
            </div>
          </div>
        </div>
      )}
      {tab === "archive" && (
        <div className="space-y-3">
          {/* Category filter */}
          <div className="flex gap-2 flex-wrap items-center">
            <button onClick={() => setFilterCat("")} className={`px-2 py-1 rounded text-xs ${!filterCat ? "bg-primary text-primary-foreground" : "bg-muted"}`}>সব</button>
            {archiveCategories.map(c => (
              <button key={c} onClick={() => setFilterCat(c)} className={`px-2 py-1 rounded text-xs ${filterCat === c ? "bg-primary text-primary-foreground" : "bg-muted"}`}>{c}</button>
            ))}
          </div>

          {/* Bulk actions bar */}
          {unpublishedItems.length > 0 && (
            <div className="flex items-center gap-2 bg-card rounded-xl border border-border p-3">
              <button onClick={toggleSelectAll} className="flex items-center gap-1.5 text-xs text-muted-foreground hover:text-foreground">
                {selectedIds.size === unpublishedItems.length && unpublishedItems.length > 0
                  ? <CheckSquare className="h-4 w-4 text-primary" />
                  : <Square className="h-4 w-4" />}
                {selectedIds.size > 0 ? `${selectedIds.size}টি সিলেক্টেড` : "সব সিলেক্ট"}
              </button>
               {selectedIds.size > 0 && (
                <>
                  <div className="flex-1" />
                  <button onClick={() => { const items = contents?.filter(c => selectedIds.has(c.id)) ?? []; refetchItems(items); }}
                    disabled={isRefetching}
                    className="flex items-center gap-1 px-3 py-1.5 rounded-lg bg-amber-600 text-white text-xs font-medium disabled:opacity-50">
                    <RefreshCw className={`h-3.5 w-3.5 ${isRefetching ? "animate-spin" : ""}`} /> রি-আপডেট ({selectedIds.size})
                  </button>
                  <button onClick={() => setShowBulkPublish(!showBulkPublish)}
                    className="flex items-center gap-1 px-3 py-1.5 rounded-lg bg-green-600 text-white text-xs font-medium">
                    <ChevronsUp className="h-3.5 w-3.5" /> বাল্ক পাবলিশ ({selectedIds.size})
                  </button>
                  <button onClick={async () => {
                    if (!confirm(`${selectedIds.size}টি কন্টেন্ট ডিলিট করবেন?`)) return;
                    const { error } = await supabase.from("archived_contents").delete().in("id", [...selectedIds]);
                    if (error) { toast.error(error.message); return; }
                    toast.success(`${selectedIds.size}টি মুছে ফেলা হয়েছে`);
                    setSelectedIds(new Set());
                    qc.invalidateQueries({ queryKey: ["archive-contents"] });
                  }}
                    className="flex items-center gap-1 px-3 py-1.5 rounded-lg bg-destructive text-destructive-foreground text-xs font-medium">
                    <Trash2 className="h-3.5 w-3.5" /> ডিলিট ({selectedIds.size})
                  </button>
                </>
              )}
            </div>
          )}

          {/* Bulk delete options */}
          <div className="flex gap-2 flex-wrap">
            <button onClick={refetchAll} disabled={isRefetching}
              className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-amber-500/10 text-amber-600 hover:bg-amber-500/20 text-xs font-medium disabled:opacity-50 transition-colors">
              <RefreshCw className={`h-3.5 w-3.5 ${isRefetching ? "animate-spin" : ""}`} />
              সব ভাঙ্গা কন্টেন্ট রি-আপডেট
            </button>
            <button onClick={async () => {
              const target = filterCat ? contents?.filter(c => c.category === filterCat) : contents;
              if (!target?.length) return toast.error("কন্টেন্ট নেই");
              if (!confirm(`${filterCat || "সব"} — ${target.length}টি কন্টেন্ট ডিলিট করবেন?`)) return;
              const { error } = await supabase.from("archived_contents").delete().in("id", target.map(c => c.id));
              if (error) { toast.error(error.message); return; }
              toast.success(`${target.length}টি ডিলিট হয়েছে`);
              qc.invalidateQueries({ queryKey: ["archive-contents"] });
              setSelectedIds(new Set());
            }}
              className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-destructive/10 text-destructive hover:bg-destructive/20 text-xs font-medium transition-colors">
              <Trash2 className="h-3.5 w-3.5" />
              {filterCat ? `"${filterCat}" সব ডিলিট` : "সব ডিলিট"}
            </button>
          </div>

          {/* Bulk publish panel */}
          {showBulkPublish && selectedIds.size > 0 && (
            <div className="bg-green-50 dark:bg-green-950/30 rounded-xl border border-green-200 dark:border-green-800 p-4">
              <p className="text-sm font-medium mb-2">📦 {selectedIds.size}টি কন্টেন্ট একসাথে পাবলিশ করুন</p>
              <div className="flex items-center gap-2">
                <select value={bulkPublishCatId} onChange={e => setBulkPublishCatId(e.target.value)}
                  className="flex-1 px-2 py-1.5 rounded-lg border border-input bg-background text-xs">
                  <option value="">ক্যাটাগরি (অটো ম্যাচ)</option>
                  {categoryTree.map(parent => (
                    <optgroup key={parent.id} label={`${parent.name} (${parent.type})`}>
                      <option value={parent.id}>{parent.name}</option>
                      {parent.children.map(child => (
                        <option key={child.id} value={child.id}>↳ {child.name}</option>
                      ))}
                    </optgroup>
                  ))}
                </select>
                <button onClick={handleBulkPublish} disabled={bulkPublish.isPending}
                  className="px-4 py-1.5 rounded-lg bg-green-600 text-white text-xs font-medium disabled:opacity-50">
                  {bulkPublish.isPending ? "পাবলিশ হচ্ছে..." : "পাবলিশ করুন"}
                </button>
                <button onClick={() => { setShowBulkPublish(false); setBulkPublishCatId(""); }}
                  className="px-2 py-1.5 rounded-lg bg-muted text-xs">বাতিল</button>
              </div>
            </div>
          )}

          {isLoading ? <p className="text-sm text-muted-foreground p-4">লোড হচ্ছে...</p> : (
            <div className="space-y-2">
              {contents?.map(item => (
                <div key={item.id} className={`bg-card rounded-xl border p-3 ${selectedIds.has(item.id) ? "border-primary bg-primary/5" : "border-border"}`}>
                  <div className="flex gap-3">
                    {/* Checkbox for unpublished */}
                    {item.status !== "published" && (
                      <button onClick={() => toggleSelect(item.id)} className="mt-1 shrink-0">
                        {selectedIds.has(item.id)
                          ? <CheckSquare className="h-4 w-4 text-primary" />
                          : <Square className="h-4 w-4 text-muted-foreground" />}
                      </button>
                    )}
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
                      <div className="flex items-center gap-2 mt-1.5 text-[10px] text-muted-foreground flex-wrap">
                        {item.category && <span className="flex items-center gap-0.5"><FolderOpen className="h-3 w-3" />{item.category}</span>}
                        {item.tags?.length > 0 && <span className="flex items-center gap-0.5"><Tag className="h-3 w-3" />{item.tags.length}</span>}
                        {(() => { try { const imgs = typeof item.images === 'string' ? JSON.parse(item.images) : item.images; return imgs?.length > 0 ? <span className="flex items-center gap-0.5"><Image className="h-3 w-3" />{imgs.length}</span> : null; } catch { return null; } })()}
                        {item.source_name && <span>{item.source_name}</span>}
                      </div>
                      {item.source_url && (
                        <a href={item.source_url} target="_blank" rel="noopener noreferrer"
                          className="flex items-center gap-1 mt-1 text-[10px] text-primary/70 hover:text-primary hover:underline truncate max-w-full">
                          <Globe className="h-3 w-3 shrink-0" />
                          <span className="truncate">{item.source_url}</span>
                        </a>
                      )}
                      {/* Quality Score */}
                      {(() => {
                        const contentLen = item.content?.length || 0;
                        let imgCount = 0;
                        try { const imgs = typeof item.images === 'string' ? JSON.parse(item.images) : item.images; imgCount = imgs?.length || 0; } catch {}
                        const tagCount = (item.tags?.length || 0) + (item.ai_tags?.length || 0);
                        const hasImage = item.featured_image ? 1 : 0;
                        const hasExcerpt = item.excerpt && item.excerpt.length > 20 ? 1 : 0;

                        let score = 0;
                        if (contentLen > 2000) score += 40; else if (contentLen > 500) score += 25; else if (contentLen > 100) score += 10;
                        score += Math.min(imgCount * 5, 15);
                        score += hasImage * 15;
                        score += Math.min(tagCount * 3, 15);
                        score += hasExcerpt ? 10 : 0;
                        score += item.ai_summary ? 5 : 0;
                        score = Math.min(score, 100);

                        const color = score >= 70 ? "text-green-500 bg-green-500/10" : score >= 40 ? "text-amber-500 bg-amber-500/10" : "text-red-500 bg-red-500/10";
                        const label = score >= 70 ? "ভালো" : score >= 40 ? "মাঝারি" : "দুর্বল";

                        return (
                          <div className={`inline-flex items-center gap-1 mt-1 px-1.5 py-0.5 rounded text-[10px] font-medium ${color}`}>
                            <span className="font-bold">{score}</span>/100 — {label}
                            <span className="text-muted-foreground ml-1">({contentLen} অক্ষর • {imgCount} ছবি • {tagCount} ট্যাগ)</span>
                          </div>
                        );
                      })()}
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
                      <>
                        <button onClick={() => refetchItems([item])} disabled={isRefetching}
                          className="p-1.5 hover:bg-amber-500/10 rounded text-amber-600" title="রি-আপডেট">
                          <RefreshCw className={`h-3.5 w-3.5 ${isRefetching ? "animate-spin" : ""}`} />
                        </button>
                        <button onClick={() => { setPublishingItem(item.id); setPublishCatId(autoMatchCategory(item.category)); }}
                          className="p-1.5 hover:bg-green-500/10 rounded text-green-600" title="পোস্টে পাবলিশ">
                          <Send className="h-3.5 w-3.5" />
                        </button>
                      </>
                    )}
                    <button onClick={() => aiProcess(item)} className="p-1.5 hover:bg-primary/10 rounded text-primary" title="AI প্রসেস">
                      <Sparkles className="h-3.5 w-3.5" />
                    </button>
                    <button onClick={() => { if (confirm("নিশ্চিত?")) deleteContent.mutate(item.id); }} className="p-1.5 hover:bg-destructive/10 rounded text-destructive">
                      <Trash2 className="h-3.5 w-3.5" />
                    </button>
                  </div>
                  {publishingItem === item.id && (
                    <div className="flex items-center gap-2 mt-2 border-t border-border pt-2 bg-muted/30 rounded p-2">
                      <select value={publishCatId} onChange={e => setPublishCatId(e.target.value)}
                        className="flex-1 px-2 py-1.5 rounded-lg border border-input bg-background text-xs">
                        <option value="">ক্যাটাগরি নির্বাচন (অটো: {item.category || "নেই"})</option>
                        {categoryTree.map(parent => (
                          <optgroup key={parent.id} label={`${parent.name} (${parent.type})`}>
                            <option value={parent.id}>{parent.name}</option>
                            {parent.children.map(child => (
                              <option key={child.id} value={child.id}>↳ {child.name}</option>
                            ))}
                          </optgroup>
                        ))}
                      </select>
                      <button onClick={() => publishAsPost.mutate({ item, categoryId: publishCatId })}
                        disabled={publishAsPost.isPending}
                        className="px-3 py-1.5 rounded-lg bg-primary text-primary-foreground text-xs font-medium disabled:opacity-50">
                        {publishAsPost.isPending ? "..." : "পাবলিশ"}
                      </button>
                      <button onClick={() => { setPublishingItem(null); setPublishCatId(""); }}
                        className="px-2 py-1.5 rounded-lg bg-muted text-xs">বাতিল</button>
                    </div>
                  )}
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
              <select value={schedForm.category_id} onChange={e => {
                  const catId = e.target.value;
                  const catName = dbCategories?.find(c => c.id === catId)?.name || "";
                  setSchedForm(p => ({ ...p, category_id: catId, category: catName }));
                }}
                className="px-3 py-2 rounded-lg border border-input bg-background text-sm">
                <option value="">ক্যাটাগরি নির্বাচন</option>
                {categoryTree.map(parent => (
                  <optgroup key={parent.id} label={`${parent.name} (${parent.type})`}>
                    <option value={parent.id}>{parent.name}</option>
                    {parent.children.map(child => (
                      <option key={child.id} value={child.id}>↳ {child.name}</option>
                    ))}
                  </optgroup>
                ))}
              </select>
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
