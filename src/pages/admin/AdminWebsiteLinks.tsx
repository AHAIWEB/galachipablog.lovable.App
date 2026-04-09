import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import { Plus, Pencil, Trash2, Search, Globe, ExternalLink } from "lucide-react";

export default function AdminWebsiteLinks() {
  const qc = useQueryClient();
  const [showForm, setShowForm] = useState(false);
  const [editing, setEditing] = useState<any>(null);
  const [form, setForm] = useState({ url: "", title: "", description: "", favicon_url: "", letter: "", category_id: "", status: "active" });
  const [search, setSearch] = useState("");
  const [letterFilter, setLetterFilter] = useState("all");

  const { data: links = [], isLoading } = useQuery({
    queryKey: ["admin-website-links"],
    queryFn: async () => {
      const { data } = await supabase.from("website_links").select("*, categories(name)").order("title");
      return data ?? [];
    },
  });

  const { data: categories = [] } = useQuery({
    queryKey: ["categories-list"],
    queryFn: async () => {
      const { data } = await supabase.from("categories").select("id, name").order("name");
      return data ?? [];
    },
  });

  const saveMutation = useMutation({
    mutationFn: async () => {
      // Auto-detect letter from title
      const letter = form.letter || (form.title.charAt(0).toUpperCase());
      const payload = { ...form, letter, category_id: form.category_id || null };
      if (editing) {
        const { error } = await supabase.from("website_links").update(payload).eq("id", editing.id);
        if (error) throw error;
      } else {
        const { error } = await supabase.from("website_links").insert(payload);
        if (error) throw error;
      }
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["admin-website-links"] });
      toast.success(editing ? "আপডেট হয়েছে" : "লিংক যোগ হয়েছে");
      resetForm();
    },
    onError: (err: any) => toast.error(err.message),
  });

  const deleteMutation = useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase.from("website_links").delete().eq("id", id);
      if (error) throw error;
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["admin-website-links"] });
      toast.success("মুছে ফেলা হয়েছে");
    },
  });

  const fetchFavicon = async () => {
    if (!form.url) return;
    try {
      const domain = new URL(form.url.startsWith("http") ? form.url : `https://${form.url}`).hostname;
      setForm(p => ({ ...p, favicon_url: `https://www.google.com/s2/favicons?domain=${domain}&sz=32` }));
    } catch { /* ignore */ }
  };

  const resetForm = () => {
    setForm({ url: "", title: "", description: "", favicon_url: "", letter: "", category_id: "", status: "active" });
    setEditing(null);
    setShowForm(false);
  };

  const startEdit = (link: any) => {
    setForm({
      url: link.url, title: link.title, description: link.description || "",
      favicon_url: link.favicon_url || "", letter: link.letter || "",
      category_id: link.category_id || "", status: link.status,
    });
    setEditing(link);
    setShowForm(true);
  };

  const filtered = links.filter((l: any) => {
    if (search && !l.title.toLowerCase().includes(search.toLowerCase()) && !l.url.toLowerCase().includes(search.toLowerCase())) return false;
    if (letterFilter !== "all" && l.letter !== letterFilter) return false;
    return true;
  });

  const uniqueLetters = [...new Set(links.map((l: any) => l.letter).filter(Boolean))].sort();

  return (
    <div>
      <div className="flex items-center justify-between mb-4 flex-wrap gap-2">
        <h1 className="font-heading font-bold text-2xl">🔗 ওয়েবসাইট লিংক আর্কাইভ</h1>
        <button onClick={() => { resetForm(); setShowForm(!showForm); }} className="flex items-center gap-1.5 px-4 py-2 rounded-lg bg-primary text-primary-foreground text-sm font-medium">
          <Plus className="h-4 w-4" /> নতুন লিংক
        </button>
      </div>

      <div className="flex gap-2 mb-4 flex-wrap">
        <div className="relative flex-1 min-w-[200px]">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
          <input value={search} onChange={e => setSearch(e.target.value)} placeholder="খুঁজুন..." className="w-full pl-9 pr-3 py-2 rounded-lg border border-input bg-background text-sm" />
        </div>
        <select value={letterFilter} onChange={e => setLetterFilter(e.target.value)} className="px-3 py-2 rounded-lg border border-input bg-background text-sm">
          <option value="all">সব Letter</option>
          {uniqueLetters.map(l => <option key={l} value={l}>{l}</option>)}
        </select>
      </div>

      {showForm && (
        <div className="bg-card rounded-xl border border-border p-5 mb-5 animate-slide-up">
          <h2 className="font-heading font-semibold mb-4">{editing ? "লিংক সম্পাদনা" : "নতুন লিংক"}</h2>
          <div className="grid md:grid-cols-2 gap-4">
            <div>
              <label className="text-xs font-medium text-muted-foreground">URL *</label>
              <div className="flex gap-1 mt-1">
                <input value={form.url} onChange={e => setForm(p => ({ ...p, url: e.target.value }))} placeholder="https://example.com" className="flex-1 px-3 py-2 rounded-lg border border-input bg-background text-sm" />
                <button onClick={fetchFavicon} className="px-2 py-2 rounded-lg bg-muted text-xs" title="Favicon আনো">
                  <Globe className="h-4 w-4" />
                </button>
              </div>
            </div>
            <div>
              <label className="text-xs font-medium text-muted-foreground">শিরোনাম *</label>
              <input value={form.title} onChange={e => setForm(p => ({ ...p, title: e.target.value }))} className="w-full mt-1 px-3 py-2 rounded-lg border border-input bg-background text-sm" />
            </div>
            <div>
              <label className="text-xs font-medium text-muted-foreground">বিবরণ</label>
              <input value={form.description} onChange={e => setForm(p => ({ ...p, description: e.target.value }))} className="w-full mt-1 px-3 py-2 rounded-lg border border-input bg-background text-sm" />
            </div>
            <div className="flex gap-2">
              <div className="flex-1">
                <label className="text-xs font-medium text-muted-foreground">Letter</label>
                <input value={form.letter} onChange={e => setForm(p => ({ ...p, letter: e.target.value }))} placeholder="অটো" className="w-full mt-1 px-3 py-2 rounded-lg border border-input bg-background text-sm" />
              </div>
              <div className="flex-1">
                <label className="text-xs font-medium text-muted-foreground">ক্যাটাগরি</label>
                <select value={form.category_id} onChange={e => setForm(p => ({ ...p, category_id: e.target.value }))} className="w-full mt-1 px-3 py-2 rounded-lg border border-input bg-background text-sm">
                  <option value="">নির্বাচন করুন</option>
                  {categories.map((c: any) => <option key={c.id} value={c.id}>{c.name}</option>)}
                </select>
              </div>
            </div>
          </div>
          <div className="flex gap-2 mt-4">
            <button onClick={() => saveMutation.mutate()} disabled={saveMutation.isPending || !form.url || !form.title} className="px-4 py-2 rounded-lg bg-primary text-primary-foreground text-sm font-medium disabled:opacity-50">
              {saveMutation.isPending ? "সেভ হচ্ছে..." : "সেভ"}
            </button>
            <button onClick={resetForm} className="px-4 py-2 rounded-lg bg-muted text-sm">বাতিল</button>
          </div>
        </div>
      )}

      <div className="bg-card rounded-xl border border-border overflow-hidden">
        {isLoading ? (
          <p className="p-4 text-sm text-muted-foreground">লোড হচ্ছে...</p>
        ) : filtered.length > 0 ? (
          <div className="divide-y divide-border">
            {filtered.map((link: any) => (
              <div key={link.id} className="p-3 flex items-center gap-2 hover:bg-muted/50 transition-colors">
                {link.favicon_url ? (
                  <img src={link.favicon_url} alt="" className="w-5 h-5 rounded shrink-0" />
                ) : (
                  <ExternalLink className="h-4 w-4 text-muted-foreground shrink-0" />
                )}
                <div className="flex-1 min-w-0">
                  <h3 className="font-medium text-sm truncate">{link.title}</h3>
                  <p className="text-[10px] text-muted-foreground truncate">{link.url}</p>
                </div>
                <span className="text-[10px] bg-muted px-1.5 py-0.5 rounded shrink-0">{link.letter}</span>
                <div className="flex gap-0.5 shrink-0">
                  <button onClick={() => startEdit(link)} className="p-1.5 hover:bg-muted rounded"><Pencil className="h-3.5 w-3.5" /></button>
                  <button onClick={() => { if (confirm("মুছে ফেলবেন?")) deleteMutation.mutate(link.id); }} className="p-1.5 hover:bg-destructive/10 rounded text-destructive"><Trash2 className="h-3.5 w-3.5" /></button>
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
