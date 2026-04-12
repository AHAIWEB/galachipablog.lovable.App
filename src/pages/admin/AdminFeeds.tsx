import { useState, useMemo } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import { Plus, Trash2, RefreshCw, Play, Pause, Sparkles, FolderOpen, Edit2, Check, X, ToggleLeft, ToggleRight } from "lucide-react";

export default function AdminFeeds() {
  const queryClient = useQueryClient();
  const [form, setForm] = useState({ name: "", url: "", type: "rss" as "rss" | "scrape", fetch_interval_minutes: 5, category_id: "" });
  const [editingArticle, setEditingArticle] = useState<string | null>(null);
  const [editForm, setEditForm] = useState({ title: "", content: "", excerpt: "" });
  const [autoPublish, setAutoPublish] = useState(true);
  const [articleLimit, setArticleLimit] = useState(20);

  const { data: feeds, isLoading } = useQuery({
    queryKey: ["admin-feeds"],
    queryFn: async () => {
      const { data, error } = await supabase.from("feed_sources").select("*, categories(name)").order("created_at", { ascending: false });
      if (error) throw error;
      return data;
    },
  });

  const { data: categories } = useQuery({
    queryKey: ["categories-full"],
    queryFn: async () => {
      const { data } = await supabase.from("categories").select("id, name, type, parent_id, slug").is("deleted_at", null).order("sort_order").order("name");
      return data ?? [];
    },
  });

  const { data: articles } = useQuery({
    queryKey: ["admin-fetched-articles", articleLimit],
    queryFn: async () => {
      const { data, error } = await supabase.from("fetched_articles").select("*, feed_sources(name)").order("created_at", { ascending: false }).limit(articleLimit);
      if (error) throw error;
      return data;
    },
  });

  const { data: totalArticleCount } = useQuery({
    queryKey: ["admin-fetched-articles-count"],
    queryFn: async () => {
      const { count } = await supabase.from("fetched_articles").select("*", { count: "exact", head: true });
      return count ?? 0;
    },
  });

  const categoryTree = useMemo(() => {
    if (!categories) return [];
    const parents = categories.filter(c => !c.parent_id);
    return parents.map(p => ({
      ...p,
      children: categories.filter(c => c.parent_id === p.id),
    }));
  }, [categories]);

  const addFeed = useMutation({
    mutationFn: async () => {
      const { error } = await supabase.from("feed_sources").insert({
        name: form.name,
        url: form.url,
        type: form.type,
        fetch_interval_minutes: form.fetch_interval_minutes,
        category_id: form.category_id || null,
      });
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["admin-feeds"] });
      toast.success("ফিড সোর্স যোগ হয়েছে");
      setForm({ name: "", url: "", type: "rss", fetch_interval_minutes: 5, category_id: "" });
    },
    onError: (err: any) => toast.error(err.message),
  });

  const toggleActive = useMutation({
    mutationFn: async ({ id, is_active }: { id: string; is_active: boolean }) => {
      const { error } = await supabase.from("feed_sources").update({ is_active }).eq("id", id);
      if (error) throw error;
    },
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ["admin-feeds"] }),
  });

  const deleteFeed = useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase.from("feed_sources").delete().eq("id", id);
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["admin-feeds"] });
      toast.success("মুছে ফেলা হয়েছে");
    },
  });

  // Article mutations
  const updateArticle = useMutation({
    mutationFn: async ({ id, title, content, excerpt }: { id: string; title: string; content: string; excerpt: string }) => {
      const { error } = await supabase.from("fetched_articles").update({ title, content, excerpt }).eq("id", id);
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["admin-fetched-articles"] });
      toast.success("আর্টিকেল আপডেট হয়েছে");
      setEditingArticle(null);
    },
    onError: (err: any) => toast.error(err.message),
  });

  const deleteArticle = useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase.from("fetched_articles").delete().eq("id", id);
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["admin-fetched-articles"] });
      queryClient.invalidateQueries({ queryKey: ["admin-fetched-articles-count"] });
      toast.success("আর্টিকেল মুছে ফেলা হয়েছে");
    },
  });

  const toggleArticlePublish = useMutation({
    mutationFn: async ({ id, status }: { id: string; status: string }) => {
      const newStatus = status === "published" ? "fetched" : "published";
      const { error } = await supabase.from("fetched_articles").update({ status: newStatus }).eq("id", id);
      if (error) throw error;

      // If publishing, also create/update post
      if (newStatus === "published") {
        const article = articles?.find(a => a.id === id);
        if (article) {
          const slug = article.title.toLowerCase().replace(/[^a-z0-9\u0980-\u09FF]+/g, "-").replace(/^-|-$/g, "") || `post-${Date.now()}`;
          const { error: postErr } = await supabase.from("posts").insert({
            title: article.title,
            slug: slug + "-" + Date.now(),
            content: article.content || "",
            excerpt: article.excerpt || "",
            featured_image: article.featured_image || null,
            status: "published",
          });
          if (postErr && !postErr.message.includes("duplicate")) throw postErr;
        }
      }
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["admin-fetched-articles"] });
      toast.success("স্ট্যাটাস পরিবর্তন হয়েছে");
    },
    onError: (err: any) => toast.error(err.message),
  });

  const publishAllPending = useMutation({
    mutationFn: async () => {
      const pending = articles?.filter(a => a.status !== "published") ?? [];
      for (const article of pending) {
        const slug = article.title.toLowerCase().replace(/[^a-z0-9\u0980-\u09FF]+/g, "-").replace(/^-|-$/g, "") || `post-${Date.now()}`;
        await supabase.from("posts").insert({
          title: article.title,
          slug: slug + "-" + Date.now(),
          content: article.content || "",
          excerpt: article.excerpt || "",
          featured_image: article.featured_image || null,
          status: "published",
        });
        await supabase.from("fetched_articles").update({ status: "published" }).eq("id", article.id);
      }
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["admin-fetched-articles"] });
      toast.success("সকল পেন্ডিং আর্টিকেল প্রকাশিত হয়েছে");
    },
  });

  const [fetchingId, setFetchingId] = useState<string | null>(null);
  const fetchNow = async (sourceId: string) => {
    setFetchingId(sourceId);
    try {
      const { data, error } = await supabase.functions.invoke("auto-fetch");
      if (error) throw error;
      toast.success(`ফেচ সম্পন্ন! ${data?.results?.length ?? 0}টি সোর্স প্রসেস হয়েছে`);
      queryClient.invalidateQueries({ queryKey: ["admin-feeds"] });
      queryClient.invalidateQueries({ queryKey: ["admin-fetched-articles"] });
    } catch (e: any) {
      toast.error(e.message || "ফেচ ব্যর্থ");
    } finally {
      setFetchingId(null);
    }
  };

  const getCategoryName = (catId: string | null) => {
    if (!catId || !categories) return null;
    const cat = categories.find(c => c.id === catId);
    if (!cat) return null;
    if (cat.parent_id) {
      const parent = categories.find(c => c.id === cat.parent_id);
      return parent ? `${parent.name} › ${cat.name}` : cat.name;
    }
    return cat.name;
  };

  const startEdit = (a: any) => {
    setEditingArticle(a.id);
    setEditForm({ title: a.title, content: a.content || "", excerpt: a.excerpt || "" });
  };

  return (
    <div>
      <h1 className="font-heading font-bold text-2xl mb-6">⚡ ফিড সোর্স ও URL ফেচার</h1>

      {/* Cron status */}
      <div className="bg-green-500/10 border border-green-500/20 rounded-xl p-3 mb-4 text-sm text-green-700 dark:text-green-400">
        ✅ অটো-ফেচ সক্রিয় — প্রতি ৫ মিনিটে স্বয়ংক্রিয়ভাবে ফিড চেক হচ্ছে। এডমিন প্যানেল বন্ধ থাকলেও কাজ করবে।
      </div>

      {/* Add form */}
      <div className="bg-card rounded-xl border border-border p-4 mb-6">
        <h2 className="font-heading font-semibold text-sm mb-3">নতুন ফিড সোর্স যোগ করুন</h2>
        <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-3">
          <input value={form.name} onChange={e => setForm(p => ({ ...p, name: e.target.value }))} placeholder="সোর্সের নাম" className="px-3 py-2 rounded-lg border border-input bg-background text-sm focus:outline-none focus:ring-2 focus:ring-ring" />
          <input value={form.url} onChange={e => setForm(p => ({ ...p, url: e.target.value }))} placeholder="URL (RSS বা ওয়েব পেজ)" className="px-3 py-2 rounded-lg border border-input bg-background text-sm focus:outline-none focus:ring-2 focus:ring-ring" />
          <select value={form.type} onChange={e => setForm(p => ({ ...p, type: e.target.value as any }))} className="px-3 py-2 rounded-lg border border-input bg-background text-sm">
            <option value="rss">RSS ফিড</option>
            <option value="scrape">URL স্ক্র্যাপ</option>
          </select>
          <select value={form.category_id} onChange={e => setForm(p => ({ ...p, category_id: e.target.value }))} className="px-3 py-2 rounded-lg border border-input bg-background text-sm">
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
            <label className="text-xs text-muted-foreground whitespace-nowrap">ইন্টারভাল (মিনিট):</label>
            <input type="number" value={form.fetch_interval_minutes} onChange={e => setForm(p => ({ ...p, fetch_interval_minutes: parseInt(e.target.value) || 5 }))} min={1} className="w-20 px-3 py-2 rounded-lg border border-input bg-background text-sm" />
          </div>
          <button onClick={() => addFeed.mutate()} disabled={!form.name || !form.url} className="flex items-center justify-center gap-1 px-4 py-2 rounded-lg bg-primary text-primary-foreground text-sm font-medium disabled:opacity-50">
            <Plus className="h-4 w-4" /> যোগ করুন
          </button>
        </div>
      </div>

      {/* Feeds list */}
      <div className="bg-card rounded-xl border border-border overflow-hidden mb-6">
        <div className="px-4 py-2.5 bg-muted border-b border-border font-heading font-semibold text-sm">
          সক্রিয় ফিড সোর্স ({feeds?.length ?? 0})
        </div>
        {isLoading ? (
          <p className="p-4 text-sm text-muted-foreground">লোড হচ্ছে...</p>
        ) : feeds && feeds.length > 0 ? (
          <div className="divide-y divide-border">
            {feeds.map(feed => (
              <div key={feed.id} className="flex items-center justify-between px-4 py-3">
                <div>
                  <p className="text-sm font-medium">{feed.name}</p>
                  <p className="text-xs text-muted-foreground">{feed.url}</p>
                  <div className="flex items-center gap-2 mt-0.5 text-xs text-muted-foreground flex-wrap">
                    <span>{feed.type === "rss" ? "RSS" : "স্ক্র্যাপ"} • প্রতি {feed.fetch_interval_minutes} মিনিট</span>
                    {feed.category_id && (
                      <span className="flex items-center gap-0.5 text-primary">
                        <FolderOpen className="h-3 w-3" />
                        {getCategoryName(feed.category_id) || (feed as any).categories?.name}
                      </span>
                    )}
                    {feed.last_fetched_at && <span>শেষ ফেচ: {new Date(feed.last_fetched_at).toLocaleString("bn-BD")}</span>}
                  </div>
                </div>
                <div className="flex items-center gap-1">
                  <button onClick={() => fetchNow(feed.id)} disabled={fetchingId === feed.id} className="p-1.5 hover:bg-muted rounded" title="এখনই ফেচ করুন">
                    <RefreshCw className={`h-3.5 w-3.5 ${fetchingId === feed.id ? "animate-spin" : ""}`} />
                  </button>
                  <button onClick={() => toggleActive.mutate({ id: feed.id, is_active: !feed.is_active })} className={`p-1.5 rounded ${feed.is_active ? "hover:bg-muted" : "hover:bg-muted text-muted-foreground"}`}>
                    {feed.is_active ? <Pause className="h-3.5 w-3.5" /> : <Play className="h-3.5 w-3.5" />}
                  </button>
                  <button onClick={() => { if (confirm("নিশ্চিত?")) deleteFeed.mutate(feed.id); }} className="p-1.5 hover:bg-destructive/10 rounded text-destructive">
                    <Trash2 className="h-3.5 w-3.5" />
                  </button>
                </div>
              </div>
            ))}
          </div>
        ) : (
          <p className="p-4 text-sm text-muted-foreground">কোনো ফিড সোর্স নেই</p>
        )}
      </div>

      {/* Fetched articles with full CRUD */}
      <div className="bg-card rounded-xl border border-border overflow-hidden">
        <div className="px-4 py-2.5 bg-muted border-b border-border flex items-center justify-between">
          <span className="font-heading font-semibold text-sm">
            ফেচ করা আর্টিকেল ({totalArticleCount ?? 0})
          </span>
          <div className="flex items-center gap-2">
            <button
              onClick={() => setAutoPublish(!autoPublish)}
              className={`flex items-center gap-1 px-2.5 py-1 rounded text-xs font-medium ${autoPublish ? "bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-300" : "bg-muted text-muted-foreground"}`}
              title="অটো প্রকাশ অন/অফ"
            >
              {autoPublish ? <ToggleRight className="h-3.5 w-3.5" /> : <ToggleLeft className="h-3.5 w-3.5" />}
              অটো প্রকাশ {autoPublish ? "অন" : "অফ"}
            </button>
            <button
              onClick={() => publishAllPending.mutate()}
              disabled={publishAllPending.isPending}
              className="px-2.5 py-1 rounded text-xs font-medium bg-primary text-primary-foreground hover:bg-primary/90 disabled:opacity-50"
            >
              সব প্রকাশ করুন
            </button>
          </div>
        </div>

        {articles && articles.length > 0 ? (
          <div className="divide-y divide-border">
            {articles.map(a => (
              <div key={a.id} className="px-4 py-3">
                {editingArticle === a.id ? (
                  /* Edit mode */
                  <div className="space-y-2">
                    <input
                      value={editForm.title}
                      onChange={e => setEditForm(p => ({ ...p, title: e.target.value }))}
                      className="w-full px-3 py-2 rounded-lg border border-input bg-background text-sm focus:outline-none focus:ring-2 focus:ring-ring"
                      placeholder="শিরোনাম"
                    />
                    <textarea
                      value={editForm.excerpt}
                      onChange={e => setEditForm(p => ({ ...p, excerpt: e.target.value }))}
                      rows={2}
                      className="w-full px-3 py-2 rounded-lg border border-input bg-background text-sm focus:outline-none focus:ring-2 focus:ring-ring"
                      placeholder="সারসংক্ষেপ"
                    />
                    <textarea
                      value={editForm.content}
                      onChange={e => setEditForm(p => ({ ...p, content: e.target.value }))}
                      rows={5}
                      className="w-full px-3 py-2 rounded-lg border border-input bg-background text-sm focus:outline-none focus:ring-2 focus:ring-ring"
                      placeholder="কন্টেন্ট"
                    />
                    <div className="flex gap-2">
                      <button
                        onClick={() => updateArticle.mutate({ id: a.id, ...editForm })}
                        disabled={updateArticle.isPending}
                        className="flex items-center gap-1 px-3 py-1.5 rounded bg-primary text-primary-foreground text-xs font-medium"
                      >
                        <Check className="h-3 w-3" /> সেভ
                      </button>
                      <button onClick={() => setEditingArticle(null)} className="flex items-center gap-1 px-3 py-1.5 rounded bg-muted text-xs">
                        <X className="h-3 w-3" /> বাতিল
                      </button>
                    </div>
                  </div>
                ) : (
                  /* View mode */
                  <div className="flex items-center justify-between gap-3">
                    <div className="flex items-center gap-3 min-w-0 flex-1">
                      {a.featured_image && (
                        <img src={a.featured_image} alt="" className="w-12 h-9 object-cover rounded shrink-0" />
                      )}
                      <div className="min-w-0">
                        <p className="text-sm font-medium truncate">{a.title}</p>
                        <p className="text-[10px] text-muted-foreground">
                          {(a as any).feed_sources?.name} • {new Date(a.created_at).toLocaleString("bn-BD")}
                        </p>
                      </div>
                    </div>
                    <div className="flex items-center gap-1 shrink-0">
                      <span className={`text-[10px] px-1.5 py-0.5 rounded ${a.status === "published" ? "bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-300" : "bg-yellow-100 text-yellow-700 dark:bg-yellow-900/30 dark:text-yellow-300"}`}>
                        {a.status === "published" ? "প্রকাশিত" : "অপেক্ষায়"}
                      </span>
                      <button onClick={() => toggleArticlePublish.mutate({ id: a.id, status: a.status })} className="p-1.5 hover:bg-muted rounded" title={a.status === "published" ? "আনপাবলিশ" : "প্রকাশ করুন"}>
                        {a.status === "published" ? <ToggleRight className="h-3.5 w-3.5 text-green-600" /> : <ToggleLeft className="h-3.5 w-3.5" />}
                      </button>
                      <button onClick={() => startEdit(a)} className="p-1.5 hover:bg-muted rounded" title="এডিট">
                        <Edit2 className="h-3.5 w-3.5" />
                      </button>
                      <button onClick={async () => {
                        toast.info("AI প্রসেসিং...");
                        const { data, error } = await supabase.functions.invoke("ai-process", { body: { title: a.title, content: a.content || a.excerpt || "" } });
                        if (error) toast.error("AI ব্যর্থ"); else toast.success(`সারসংক্ষেপ: ${data?.data?.summary?.slice(0, 80)}...`);
                      }} className="p-1.5 hover:bg-primary/10 rounded text-primary" title="AI সারসংক্ষেপ">
                        <Sparkles className="h-3.5 w-3.5" />
                      </button>
                      <button onClick={() => { if (confirm("মুছে ফেলতে চান?")) deleteArticle.mutate(a.id); }} className="p-1.5 hover:bg-destructive/10 rounded text-destructive" title="মুছুন">
                        <Trash2 className="h-3.5 w-3.5" />
                      </button>
                    </div>
                  </div>
                )}
              </div>
            ))}
          </div>
        ) : (
          <p className="p-4 text-sm text-muted-foreground">এখনো কোনো আর্টিকেল ফেচ হয়নি</p>
        )}

        {/* Load more */}
        {articles && totalArticleCount && articles.length < totalArticleCount && (
          <div className="p-3 text-center border-t border-border">
            <button onClick={() => setArticleLimit(l => l + 50)} className="text-xs text-primary hover:underline">
              আরও দেখুন ({totalArticleCount - articles.length}টি বাকি)
            </button>
          </div>
        )}
      </div>
    </div>
  );
}
