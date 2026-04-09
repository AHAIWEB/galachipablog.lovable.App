import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import { Plus, Trash2, RefreshCw, Play, Pause, Sparkles } from "lucide-react";

export default function AdminFeeds() {
  const queryClient = useQueryClient();
  const [form, setForm] = useState({ name: "", url: "", type: "rss" as "rss" | "scrape", fetch_interval_minutes: 5, category_id: "" });

  const { data: feeds, isLoading } = useQuery({
    queryKey: ["admin-feeds"],
    queryFn: async () => {
      const { data, error } = await supabase.from("feed_sources").select("*, categories(name)").order("created_at", { ascending: false });
      if (error) throw error;
      return data;
    },
  });

  const { data: categories } = useQuery({
    queryKey: ["categories-list"],
    queryFn: async () => {
      const { data } = await supabase.from("categories").select("id, name").order("name");
      return data ?? [];
    },
  });

  const { data: articles } = useQuery({
    queryKey: ["admin-fetched-articles"],
    queryFn: async () => {
      const { data, error } = await supabase.from("fetched_articles").select("*, feed_sources(name)").order("created_at", { ascending: false }).limit(20);
      if (error) throw error;
      return data;
    },
  });

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
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["admin-feeds"] });
    },
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

  const fetchNow = async (sourceId: string) => {
    toast.info("ফেচ শুরু হচ্ছে... (edge function প্রয়োজন)");
  };

  return (
    <div>
      <h1 className="font-heading font-bold text-2xl mb-6">⚡ ফিড সোর্স ও URL ফেচার</h1>

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
            {categories?.map(c => <option key={c.id} value={c.id}>{c.name}</option>)}
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
                  <p className="text-xs text-muted-foreground">
                    {feed.type === "rss" ? "RSS" : "স্ক্র্যাপ"} • প্রতি {feed.fetch_interval_minutes} মিনিট
                    {feed.last_fetched_at && ` • শেষ ফেচ: ${new Date(feed.last_fetched_at).toLocaleString("bn-BD")}`}
                  </p>
                </div>
                <div className="flex items-center gap-1">
                  <button onClick={() => fetchNow(feed.id)} className="p-1.5 hover:bg-muted rounded" title="এখনই ফেচ করুন">
                    <RefreshCw className="h-3.5 w-3.5" />
                  </button>
                  <button
                    onClick={() => toggleActive.mutate({ id: feed.id, is_active: !feed.is_active })}
                    className={`p-1.5 rounded ${feed.is_active ? "hover:bg-muted" : "hover:bg-muted text-muted-foreground"}`}
                  >
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

      {/* Fetched articles */}
      <div className="bg-card rounded-xl border border-border overflow-hidden">
        <div className="px-4 py-2.5 bg-muted border-b border-border font-heading font-semibold text-sm">
          ফেচ করা আর্টিকেল ({articles?.length ?? 0})
        </div>
        {articles && articles.length > 0 ? (
          <div className="divide-y divide-border">
            {articles.map(a => (
              <div key={a.id} className="flex items-center justify-between px-4 py-3 text-sm">
                <div>
                  <p className="font-medium">{a.title}</p>
                  <p className="text-xs text-muted-foreground">{(a as any).feed_sources?.name} • {a.status}</p>
                </div>
                <button
                  onClick={async () => {
                    toast.info("AI প্রসেসিং শুরু হচ্ছে...");
                    const { data, error } = await supabase.functions.invoke("ai-process", {
                      body: { title: a.title, content: a.content || a.excerpt || "" },
                    });
                    if (error) {
                      toast.error("AI প্রসেসিং ব্যর্থ");
                    } else {
                      toast.success(`সারসংক্ষেপ: ${data?.data?.summary?.slice(0, 80)}...`);
                    }
                  }}
                  className="p-1.5 hover:bg-primary/10 rounded text-primary shrink-0"
                  title="AI সারসংক্ষেপ ও ট্যাগ"
                >
                  <Sparkles className="h-4 w-4" />
                </button>
              </div>
            ))}
          </div>
        ) : (
          <p className="p-4 text-sm text-muted-foreground">এখনো কোনো আর্টিকেল ফেচ হয়নি</p>
        )}
      </div>
    </div>
  );
}
