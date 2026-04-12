import { useState, useMemo } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import { Plus, Trash2, ExternalLink, Globe, Search, Download, CheckSquare, Square, ToggleLeft, ToggleRight, CheckCircle, XCircle, Clock } from "lucide-react";

export default function AdminWebsiteLinks() {
  const qc = useQueryClient();
  const [form, setForm] = useState({ title: "", url: "", description: "", letter: "", category_id: "" });
  const [letterFilter, setLetterFilter] = useState("");
  const [statusFilter, setStatusFilter] = useState<string>("all");
  const [search, setSearch] = useState("");
  const [scrapeUrl, setScrapeUrl] = useState("");
  const [scraping, setScraping] = useState(false);
  const [scrapedLinks, setScrapedLinks] = useState<{ title: string; url: string; favicon_url: string }[]>([]);
  const [selectedScrape, setSelectedScrape] = useState<Set<number>>(new Set());
  const [scrapeCategory, setScrapeCategory] = useState("");
  const [scrapeLetter, setScrapeLetter] = useState("");
  const [autoPublishLinks, setAutoPublishLinks] = useState(false);

  const { data: links, isLoading } = useQuery({
    queryKey: ["admin-website-links"],
    queryFn: async () => {
      const { data, error } = await supabase.from("website_links").select("*, categories(name)").order("created_at", { ascending: false });
      if (error) throw error;
      return data;
    },
  });

  const { data: categories } = useQuery({
    queryKey: ["categories-directory"],
    queryFn: async () => {
      const { data } = await supabase.from("categories").select("id, name, parent_id").eq("type", "directory").is("deleted_at", null).order("name");
      return data ?? [];
    },
  });

  const letters = useMemo(() => {
    if (!links) return [];
    return [...new Set(links.map(l => l.letter).filter(Boolean))].sort();
  }, [links]);

  const pendingCount = useMemo(() => links?.filter(l => l.status === "pending").length ?? 0, [links]);
  const activeCount = useMemo(() => links?.filter(l => l.status === "active").length ?? 0, [links]);

  const filtered = useMemo(() => {
    let items = links ?? [];
    if (statusFilter !== "all") items = items.filter(l => l.status === statusFilter);
    if (letterFilter) items = items.filter(l => l.letter === letterFilter);
    if (search) items = items.filter(l => l.title.toLowerCase().includes(search.toLowerCase()) || l.url.toLowerCase().includes(search.toLowerCase()));
    return items;
  }, [links, letterFilter, search, statusFilter]);

  const addMutation = useMutation({
    mutationFn: async () => {
      let favicon_url = "";
      try { favicon_url = `https://www.google.com/s2/favicons?domain=${new URL(form.url).hostname}&sz=64`; } catch {}
      const { error } = await supabase.from("website_links").insert({
        title: form.title, url: form.url, description: form.description || null,
        letter: form.letter || "", category_id: form.category_id || null, favicon_url,
        status: autoPublishLinks ? "active" : "active",
      });
      if (error) throw error;
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["admin-website-links"] });
      toast.success("লিংক যোগ হয়েছে");
      setForm({ title: "", url: "", description: "", letter: "", category_id: "" });
    },
    onError: (e: any) => toast.error(e.message),
  });

  const deleteMutation = useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase.from("website_links").delete().eq("id", id);
      if (error) throw error;
    },
    onSuccess: () => { qc.invalidateQueries({ queryKey: ["admin-website-links"] }); toast.success("মুছে ফেলা হয়েছে"); },
  });

  const updateStatus = useMutation({
    mutationFn: async ({ id, status }: { id: string; status: string }) => {
      const { error } = await supabase.from("website_links").update({ status }).eq("id", id);
      if (error) throw error;
    },
    onSuccess: () => { qc.invalidateQueries({ queryKey: ["admin-website-links"] }); toast.success("স্ট্যাটাস আপডেট হয়েছে"); },
  });

  const approveAll = useMutation({
    mutationFn: async () => {
      const pending = links?.filter(l => l.status === "pending") ?? [];
      for (const l of pending) {
        await supabase.from("website_links").update({ status: "active" }).eq("id", l.id);
      }
    },
    onSuccess: () => { qc.invalidateQueries({ queryKey: ["admin-website-links"] }); toast.success("সকল পেন্ডিং লিংক অনুমোদিত"); },
  });

  const handleScrape = async () => {
    if (!scrapeUrl) return;
    setScraping(true);
    setScrapedLinks([]);
    setSelectedScrape(new Set());
    try {
      const { data, error } = await supabase.functions.invoke("scrape-links", { body: { url: scrapeUrl } });
      if (error) throw error;
      if (data?.links) {
        setScrapedLinks(data.links);
        setSelectedScrape(new Set(data.links.map((_: any, i: number) => i)));
        toast.success(`${data.links.length}টি লিংক পাওয়া গেছে`);
      }
    } catch (e: any) {
      toast.error(e.message || "স্ক্র্যাপ ব্যর্থ");
    }
    setScraping(false);
  };

  const importSelected = async () => {
    const toImport = scrapedLinks.filter((_, i) => selectedScrape.has(i));
    if (toImport.length === 0) return toast.error("লিংক সিলেক্ট করুন");
    let success = 0;
    for (const link of toImport) {
      const { error } = await supabase.from("website_links").insert({
        title: link.title, url: link.url, favicon_url: link.favicon_url,
        letter: scrapeLetter || "", category_id: scrapeCategory || null,
        status: autoPublishLinks ? "active" : "pending",
      });
      if (!error) success++;
    }
    toast.success(`${success}টি লিংক ইমপোর্ট হয়েছে${autoPublishLinks ? "" : " (অনুমোদন প্রয়োজন)"}`);
    qc.invalidateQueries({ queryKey: ["admin-website-links"] });
    setScrapedLinks([]);
    setSelectedScrape(new Set());
  };

  const toggleScrapeSelect = (idx: number) => {
    setSelectedScrape(prev => {
      const next = new Set(prev);
      if (next.has(idx)) next.delete(idx); else next.add(idx);
      return next;
    });
  };

  const bengaliLetters = "অ আ ই ঈ উ ঊ এ ঐ ও ঔ ক খ গ ঘ চ ছ জ ঝ ট ঠ ড ঢ ণ ত থ দ ধ ন প ফ ব ভ ম য র ল শ ষ স হ".split(" ");
  const englishLetters = "A B C D E F G H I J K L M N O P Q R S T U V W X Y Z".split(" ");

  const getStatusBadge = (status: string) => {
    switch (status) {
      case "active": return <span className="inline-flex items-center gap-0.5 text-[10px] px-1.5 py-0.5 rounded bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-300"><CheckCircle className="h-2.5 w-2.5" /> সক্রিয়</span>;
      case "pending": return <span className="inline-flex items-center gap-0.5 text-[10px] px-1.5 py-0.5 rounded bg-yellow-100 text-yellow-700 dark:bg-yellow-900/30 dark:text-yellow-300"><Clock className="h-2.5 w-2.5" /> অপেক্ষায়</span>;
      default: return <span className="inline-flex items-center gap-0.5 text-[10px] px-1.5 py-0.5 rounded bg-red-100 text-red-700 dark:bg-red-900/30 dark:text-red-300"><XCircle className="h-2.5 w-2.5" /> নিষ্ক্রিয়</span>;
    }
  };

  return (
    <div>
      <h1 className="font-heading font-bold text-2xl mb-6">🔗 ওয়েবসাইট লিংক আর্কাইভ</h1>

      {/* Auto publish toggle + approve all */}
      <div className="flex items-center gap-3 mb-4 flex-wrap">
        <button
          onClick={() => setAutoPublishLinks(!autoPublishLinks)}
          className={`flex items-center gap-1.5 px-3 py-2 rounded-lg text-sm font-medium border ${autoPublishLinks ? "bg-green-100 text-green-700 border-green-200 dark:bg-green-900/30 dark:text-green-300 dark:border-green-800" : "bg-card text-muted-foreground border-border"}`}
        >
          {autoPublishLinks ? <ToggleRight className="h-4 w-4" /> : <ToggleLeft className="h-4 w-4" />}
          অটো পাবলিশ {autoPublishLinks ? "অন" : "অফ"}
        </button>
        {pendingCount > 0 && (
          <button onClick={() => approveAll.mutate()} disabled={approveAll.isPending}
            className="flex items-center gap-1.5 px-3 py-2 rounded-lg text-sm font-medium bg-primary text-primary-foreground disabled:opacity-50">
            <CheckCircle className="h-4 w-4" /> সব অনুমোদন করুন ({pendingCount})
          </button>
        )}
        <div className="ml-auto flex items-center gap-2 text-xs text-muted-foreground">
          <span className="text-green-600 font-medium">{activeCount} সক্রিয়</span>
          <span>•</span>
          <span className="text-yellow-600 font-medium">{pendingCount} অপেক্ষায়</span>
        </div>
      </div>

      {/* Scraper section */}
      <div className="bg-card rounded-xl border border-border p-4 mb-6">
        <h2 className="font-heading font-semibold text-sm mb-3">🌐 ওয়েবসাইট থেকে লিংক স্ক্র্যাপ করুন</h2>
        <div className="flex gap-2 items-end flex-wrap">
          <div className="flex-1 min-w-[250px]">
            <input value={scrapeUrl} onChange={e => setScrapeUrl(e.target.value)} placeholder="https://allbanglapaper.com"
              className="w-full px-3 py-2 rounded-lg border border-input bg-background text-sm" />
          </div>
          <select value={scrapeLetter} onChange={e => setScrapeLetter(e.target.value)} className="px-3 py-2 rounded-lg border border-input bg-background text-sm">
            <option value="">অক্ষর</option>
            <optgroup label="বাংলা">{bengaliLetters.map(l => <option key={l} value={l}>{l}</option>)}</optgroup>
            <optgroup label="English">{englishLetters.map(l => <option key={l} value={l}>{l}</option>)}</optgroup>
          </select>
          <select value={scrapeCategory} onChange={e => setScrapeCategory(e.target.value)} className="px-3 py-2 rounded-lg border border-input bg-background text-sm">
            <option value="">ক্যাটাগরি</option>
            {categories?.filter(c => !c.parent_id).map(p => (
              <optgroup key={p.id} label={p.name}>
                <option value={p.id}>{p.name}</option>
                {categories.filter(c => c.parent_id === p.id).map(ch => (
                  <option key={ch.id} value={ch.id}>↳ {ch.name}</option>
                ))}
              </optgroup>
            ))}
          </select>
          <button onClick={handleScrape} disabled={!scrapeUrl || scraping}
            className="flex items-center gap-1 px-4 py-2 rounded-lg bg-accent text-accent-foreground text-sm font-medium disabled:opacity-50">
            <Download className="h-4 w-4" /> {scraping ? "স্ক্র্যাপ হচ্ছে..." : "স্ক্র্যাপ"}
          </button>
        </div>

        {scrapedLinks.length > 0 && (
          <div className="mt-4">
            <div className="flex items-center justify-between mb-2">
              <p className="text-sm font-medium">{selectedScrape.size}/{scrapedLinks.length}টি সিলেক্ট</p>
              <div className="flex gap-2">
                <button onClick={() => setSelectedScrape(new Set(scrapedLinks.map((_, i) => i)))} className="text-xs text-primary hover:underline">সব সিলেক্ট</button>
                <button onClick={() => setSelectedScrape(new Set())} className="text-xs text-muted-foreground hover:underline">ক্লিয়ার</button>
                <button onClick={importSelected} className="flex items-center gap-1 px-3 py-1 rounded bg-primary text-primary-foreground text-xs font-medium">
                  <Plus className="h-3 w-3" /> ইমপোর্ট {autoPublishLinks ? "" : "(পেন্ডিং)"}
                </button>
              </div>
            </div>
            <div className="max-h-60 overflow-y-auto border border-border rounded-lg divide-y divide-border">
              {scrapedLinks.map((link, i) => (
                <div key={i} className="flex items-center gap-2 px-3 py-2 hover:bg-muted/50">
                  <button onClick={() => toggleScrapeSelect(i)}>
                    {selectedScrape.has(i) ? <CheckSquare className="h-4 w-4 text-primary" /> : <Square className="h-4 w-4 text-muted-foreground" />}
                  </button>
                  {link.favicon_url && <img src={link.favicon_url} alt="" className="w-4 h-4 rounded shrink-0" />}
                  <div className="flex-1 min-w-0">
                    <p className="text-sm truncate">{link.title}</p>
                    <p className="text-xs text-muted-foreground truncate">{link.url}</p>
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}
      </div>

      {/* Add form */}
      <div className="bg-card rounded-xl border border-border p-4 mb-6">
        <h2 className="font-heading font-semibold text-sm mb-3">➕ ম্যানুয়ালি লিংক যোগ করুন</h2>
        <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-3 items-end">
          <div>
            <label className="text-xs font-medium text-muted-foreground">শিরোনাম *</label>
            <input value={form.title} onChange={e => setForm(p => ({ ...p, title: e.target.value }))} placeholder="ওয়েবসাইটের নাম"
              className="w-full mt-1 px-3 py-2 rounded-lg border border-input bg-background text-sm" />
          </div>
          <div>
            <label className="text-xs font-medium text-muted-foreground">URL *</label>
            <input value={form.url} onChange={e => setForm(p => ({ ...p, url: e.target.value }))} placeholder="https://example.com"
              className="w-full mt-1 px-3 py-2 rounded-lg border border-input bg-background text-sm" />
          </div>
          <div>
            <label className="text-xs font-medium text-muted-foreground">বিবরণ</label>
            <input value={form.description} onChange={e => setForm(p => ({ ...p, description: e.target.value }))} placeholder="সংক্ষিপ্ত বিবরণ"
              className="w-full mt-1 px-3 py-2 rounded-lg border border-input bg-background text-sm" />
          </div>
          <div>
            <label className="text-xs font-medium text-muted-foreground">অক্ষর</label>
            <select value={form.letter} onChange={e => setForm(p => ({ ...p, letter: e.target.value }))}
              className="w-full mt-1 px-3 py-2 rounded-lg border border-input bg-background text-sm">
              <option value="">নির্বাচন করুন</option>
              <optgroup label="বাংলা">{bengaliLetters.map(l => <option key={l} value={l}>{l}</option>)}</optgroup>
              <optgroup label="ইংরেজি">{englishLetters.map(l => <option key={l} value={l}>{l}</option>)}</optgroup>
            </select>
          </div>
          <div>
            <label className="text-xs font-medium text-muted-foreground">ক্যাটাগরি</label>
            <select value={form.category_id} onChange={e => setForm(p => ({ ...p, category_id: e.target.value }))}
              className="w-full mt-1 px-3 py-2 rounded-lg border border-input bg-background text-sm">
              <option value="">নির্বাচন করুন</option>
              {categories?.filter(c => !c.parent_id).map(p => (
                <optgroup key={p.id} label={p.name}>
                  <option value={p.id}>{p.name}</option>
                  {categories.filter(c => c.parent_id === p.id).map(child => (
                    <option key={child.id} value={child.id}>↳ {child.name}</option>
                  ))}
                </optgroup>
              ))}
            </select>
          </div>
          <button onClick={() => addMutation.mutate()} disabled={!form.title || !form.url || addMutation.isPending}
            className="flex items-center justify-center gap-1 px-4 py-2 rounded-lg bg-primary text-primary-foreground text-sm font-medium disabled:opacity-50">
            <Plus className="h-4 w-4" /> যোগ করুন
          </button>
        </div>
      </div>

      {/* Status + Letter filter */}
      <div className="flex gap-2 flex-wrap mb-3">
        <button onClick={() => setStatusFilter("all")} className={`px-2.5 py-1 rounded text-xs font-medium ${statusFilter === "all" ? "bg-primary text-primary-foreground" : "bg-muted"}`}>
          সব ({links?.length ?? 0})
        </button>
        <button onClick={() => setStatusFilter("active")} className={`px-2.5 py-1 rounded text-xs font-medium ${statusFilter === "active" ? "bg-green-600 text-white" : "bg-muted"}`}>
          সক্রিয় ({activeCount})
        </button>
        <button onClick={() => setStatusFilter("pending")} className={`px-2.5 py-1 rounded text-xs font-medium ${statusFilter === "pending" ? "bg-yellow-600 text-white" : "bg-muted"}`}>
          অপেক্ষায় ({pendingCount})
        </button>
      </div>

      <div className="flex gap-1 flex-wrap mb-4">
        <button onClick={() => setLetterFilter("")} className={`px-2 py-1 rounded text-xs ${!letterFilter ? "bg-primary text-primary-foreground" : "bg-muted"}`}>সব</button>
        {letters.map(l => (
          <button key={l} onClick={() => setLetterFilter(l)} className={`px-2 py-1 rounded text-xs ${letterFilter === l ? "bg-primary text-primary-foreground" : "bg-muted"}`}>{l}</button>
        ))}
      </div>

      {/* Search */}
      <div className="relative mb-4">
        <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
        <input value={search} onChange={e => setSearch(e.target.value)} placeholder="খুঁজুন..."
          className="w-full pl-9 pr-3 py-2 rounded-lg border border-input bg-background text-sm" />
      </div>

      {/* Links list */}
      <div className="bg-card rounded-xl border border-border overflow-hidden">
        <div className="px-4 py-2.5 bg-muted border-b border-border font-heading font-semibold text-sm">
          লিংক তালিকা ({filtered.length})
        </div>
        {isLoading ? (
          <p className="p-4 text-sm text-muted-foreground">লোড হচ্ছে...</p>
        ) : filtered.length > 0 ? (
          <div className="divide-y divide-border">
            {filtered.map(link => (
              <div key={link.id} className="flex items-center gap-3 px-4 py-2.5">
                {link.favicon_url ? (
                  <img src={link.favicon_url} alt="" className="w-5 h-5 rounded shrink-0" />
                ) : (
                  <Globe className="h-5 w-5 text-muted-foreground shrink-0" />
                )}
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2">
                    {link.letter && <span className="text-xs font-bold text-primary">{link.letter}</span>}
                    <p className="text-sm font-medium truncate">{link.title}</p>
                  </div>
                  <p className="text-xs text-muted-foreground truncate">{link.url}</p>
                </div>
                <div className="flex items-center gap-1 shrink-0">
                  {getStatusBadge(link.status)}
                  {link.status === "pending" && (
                    <button onClick={() => updateStatus.mutate({ id: link.id, status: "active" })}
                      className="p-1 hover:bg-green-100 dark:hover:bg-green-900/30 rounded text-green-600" title="অনুমোদন">
                      <CheckCircle className="h-3.5 w-3.5" />
                    </button>
                  )}
                  {link.status === "active" && (
                    <button onClick={() => updateStatus.mutate({ id: link.id, status: "pending" })}
                      className="p-1 hover:bg-yellow-100 dark:hover:bg-yellow-900/30 rounded text-yellow-600" title="পেন্ডিং করুন">
                      <Clock className="h-3.5 w-3.5" />
                    </button>
                  )}
                  <a href={link.url} target="_blank" rel="noopener" className="p-1 hover:bg-muted rounded"><ExternalLink className="h-3.5 w-3.5" /></a>
                  <button onClick={() => { if (confirm("নিশ্চিত?")) deleteMutation.mutate(link.id); }}
                    className="p-1 hover:bg-destructive/10 rounded text-destructive"><Trash2 className="h-3.5 w-3.5" /></button>
                </div>
              </div>
            ))}
          </div>
        ) : (
          <p className="p-4 text-sm text-muted-foreground">কোনো লিংক নেই</p>
        )}
      </div>
    </div>
  );
}
