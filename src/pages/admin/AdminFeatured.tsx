import { useState } from "react";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Switch } from "@/components/ui/switch";
import { toast } from "sonner";
import { Star, Rss, Globe, Play, Trash2, Loader2, StarOff } from "lucide-react";

type SourceType = "rss" | "scrape";

export default function AdminFeatured() {
  const qc = useQueryClient();
  const [name, setName] = useState("");
  const [url, setUrl] = useState("");
  const [type, setType] = useState<SourceType>("rss");
  const [categoryId, setCategoryId] = useState("");
  const [interval, setInterval] = useState(60);
  const [runningId, setRunningId] = useState<string | null>(null);

  const { data: categories = [] } = useQuery({
    queryKey: ["featured-cats"],
    queryFn: async () => (await supabase.from("categories").select("id, name").is("deleted_at", null).order("name")).data ?? [],
  });

  const { data: sources = [] } = useQuery({
    queryKey: ["featured-sources"],
    queryFn: async () =>
      (await supabase.from("feed_sources").select("*, categories(name)").eq("is_featured", true).order("created_at", { ascending: false })).data ?? [],
  });

  const { data: posts = [] } = useQuery({
    queryKey: ["featured-panel-posts"],
    queryFn: async () =>
      (await supabase.from("posts").select("id, title, slug, featured_image, created_at").eq("is_featured", true).eq("status", "published").order("created_at", { ascending: false }).limit(30)).data ?? [],
  });

  const refresh = () => {
    qc.invalidateQueries({ queryKey: ["featured-sources"] });
    qc.invalidateQueries({ queryKey: ["featured-panel-posts"] });
    qc.invalidateQueries({ queryKey: ["featured-posts"] });
  };

  const addSource = async () => {
    if (!url.trim()) return toast.error("লিংক দিন");
    let u = url.trim();
    if (!/^https?:\/\//i.test(u)) u = "https://" + u;
    try { new URL(u); } catch { return toast.error("সঠিক লিংক দিন"); }
    const { error } = await supabase.from("feed_sources").insert({
      name: name.trim() || new URL(u).hostname,
      url: u,
      type,
      category_id: categoryId || null,
      fetch_interval_minutes: Math.max(15, interval),
      is_active: true,
      is_featured: true,
    });
    if (error) return toast.error(error.message);
    toast.success("ফিচার সোর্স যোগ হয়েছে");
    setName(""); setUrl("");
    refresh();
  };

  const runNow = async (id: string) => {
    setRunningId(id);
    const { data, error } = await supabase.functions.invoke("auto-fetch", { body: { source_id: id } });
    setRunningId(null);
    if (error) return toast.error("ফেচ ব্যর্থ হয়েছে");
    const r = (data as any)?.results?.[0];
    if (r?.error) toast.error(r.error);
    else toast.success(`${r?.inserted ?? 0}টি নতুন পোস্ট ফিচারে যোগ হয়েছে`);
    refresh();
  };

  const toggleActive = async (id: string, v: boolean) => {
    await supabase.from("feed_sources").update({ is_active: v }).eq("id", id);
    refresh();
  };

  const remove = async (id: string) => {
    if (!confirm("সোর্সটি মুছবেন?")) return;
    const { error } = await supabase.from("feed_sources").update({ is_featured: false, is_active: false }).eq("id", id);
    if (error) return toast.error(error.message);
    refresh();
  };

  const unfeature = async (id: string) => {
    await supabase.from("posts").update({ is_featured: false }).eq("id", id);
    refresh();
  };

  return (
    <div className="space-y-6 max-w-5xl">
      <div>
        <h1 className="font-heading text-2xl font-bold flex items-center gap-2"><Star className="h-6 w-6 text-primary" /> ফিচার পোস্ট প্যানেল</h1>
        <p className="text-sm text-muted-foreground mt-1">RSS লিংক, ক্যাটাগরি পেজের লিংক বা যেকোনো সাইটের লিংক দিন — সেখানকার নতুন পোস্ট স্বয়ংক্রিয়ভাবে হোমপেজের ফিচার স্লাইডারে আসবে।</p>
      </div>

      <div className="bg-card border border-border rounded-xl p-4 space-y-3">
        <h2 className="font-heading font-semibold">নতুন ফিচার সোর্স</h2>
        <div className="flex gap-2">
          <Button type="button" size="sm" variant={type === "rss" ? "default" : "outline"} onClick={() => setType("rss")}><Rss className="h-4 w-4 mr-1" />RSS ফিড</Button>
          <Button type="button" size="sm" variant={type === "scrape" ? "default" : "outline"} onClick={() => setType("scrape")}><Globe className="h-4 w-4 mr-1" />ক্যাটাগরি / URL স্ক্র্যাপ</Button>
        </div>
        <div className="grid sm:grid-cols-2 gap-3">
          <Input placeholder="নাম (ঐচ্ছিক)" value={name} onChange={e => setName(e.target.value)} />
          <Input placeholder={type === "rss" ? "https://site.com/feed" : "https://site.com/category/news"} value={url} onChange={e => setUrl(e.target.value)} />
          <select className="h-10 rounded-md border border-input bg-background px-3 text-sm" value={categoryId} onChange={e => setCategoryId(e.target.value)}>
            <option value="">কোন ক্যাটাগরিতে পোস্ট হবে?</option>
            {categories.map((c: any) => <option key={c.id} value={c.id}>{c.name}</option>)}
          </select>
          <div className="flex items-center gap-2">
            <Input type="number" min={15} value={interval} onChange={e => setInterval(Number(e.target.value))} />
            <span className="text-xs text-muted-foreground whitespace-nowrap">মিনিট পরপর</span>
          </div>
        </div>
        <Button onClick={addSource}>যোগ করুন</Button>
      </div>

      <div className="bg-card border border-border rounded-xl p-4">
        <h2 className="font-heading font-semibold mb-3">ফিচার সোর্স ({sources.length})</h2>
        {sources.length === 0 && <p className="text-sm text-muted-foreground">এখনও কোনো সোর্স নেই।</p>}
        <div className="divide-y divide-border">
          {sources.map((s: any) => (
            <div key={s.id} className="py-3 flex flex-wrap items-center gap-3">
              {s.type === "rss" ? <Rss className="h-4 w-4 text-primary" /> : <Globe className="h-4 w-4 text-primary" />}
              <div className="flex-1 min-w-0">
                <p className="font-medium text-sm truncate">{s.name}</p>
                <p className="text-xs text-muted-foreground truncate">{s.url}</p>
                <p className="text-xs text-muted-foreground">
                  {s.categories?.name ?? "ক্যাটাগরি নেই"} · শেষ ফেচ: {s.last_fetched_at ? new Date(s.last_fetched_at).toLocaleString("bn-BD") : "হয়নি"}
                </p>
              </div>
              <Switch checked={s.is_active} onCheckedChange={v => toggleActive(s.id, v)} />
              <Button size="sm" variant="outline" disabled={runningId === s.id} onClick={() => runNow(s.id)}>
                {runningId === s.id ? <Loader2 className="h-4 w-4 animate-spin" /> : <Play className="h-4 w-4" />}<span className="ml-1">এখনই ফেচ</span>
              </Button>
              <Button size="icon" variant="ghost" onClick={() => remove(s.id)}><Trash2 className="h-4 w-4 text-destructive" /></Button>
            </div>
          ))}
        </div>
      </div>

      <div className="bg-card border border-border rounded-xl p-4">
        <h2 className="font-heading font-semibold mb-3">বর্তমান ফিচার পোস্ট</h2>
        <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-3">
          {posts.map((p: any) => (
            <div key={p.id} className="border border-border rounded-lg overflow-hidden">
              {p.featured_image && <img src={p.featured_image} alt={p.title} className="w-full aspect-video object-cover" loading="lazy" />}
              <div className="p-2 flex gap-2 items-start">
                <a href={`/post/${p.slug}`} target="_blank" rel="noreferrer" className="text-sm font-medium line-clamp-2 flex-1 hover:underline">{p.title}</a>
                <Button size="icon" variant="ghost" title="ফিচার থেকে সরান" onClick={() => unfeature(p.id)}><StarOff className="h-4 w-4" /></Button>
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
