import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import { Plus, Trash2, GripVertical, Eye, EyeOff, ArrowUp, ArrowDown, Copy } from "lucide-react";

const WIDGET_TYPES = [
  { value: "latest_posts", label: "সর্বশেষ পোস্ট" },
  { value: "news", label: "খবর" },
  { value: "blog", label: "ব্লগ" },
  { value: "directory", label: "ডিরেক্টরি" },
  { value: "category_posts", label: "নির্দিষ্ট ক্যাটাগরি পোস্ট" },
  { value: "photo_gallery", label: "ফটো গ্যালারি" },
  { value: "website_links", label: "ওয়েবসাইট লিংক" },
  { value: "business_cards", label: "বিজনেস কার্ড" },
  { value: "ads", label: "বিজ্ঞাপন" },
  { value: "this_day", label: "এই দিনে" },
  { value: "custom_html", label: "কাস্টম HTML" },
];

export default function AdminSidebarWidgets() {
  const qc = useQueryClient();
  const [form, setForm] = useState({ title: "", widget_type: "latest_posts", sidebar: "left", config: "{}", category_id: "" });
  const [sidebarFilter, setSidebarFilter] = useState<"left" | "right">("left");
  const [showCategoryHelper, setShowCategoryHelper] = useState(false);

  const { data: widgets, isLoading } = useQuery({
    queryKey: ["sidebar-widgets"],
    queryFn: async () => {
      const { data, error } = await supabase.from("sidebar_widgets").select("*").order("sidebar").order("sort_order");
      if (error) throw error;
      return data;
    },
  });

  const { data: categories = [] } = useQuery({
    queryKey: ["all-categories"],
    queryFn: async () => {
      const { data } = await supabase.from("categories").select("id, name, type").order("type").order("name");
      return data ?? [];
    },
  });

  const filtered = widgets?.filter(w => w.sidebar === sidebarFilter) ?? [];

  const needsCategory = form.widget_type === "category_posts";

  const addMutation = useMutation({
    mutationFn: async () => {
      const maxOrder = Math.max(0, ...(filtered.map(w => w.sort_order) || [0]));
      let config: any = {};
      try { config = JSON.parse(form.config); } catch {}
      if (needsCategory && form.category_id) {
        config.category_id = form.category_id;
      }
      const { error } = await supabase.from("sidebar_widgets").insert({
        title: form.title, widget_type: form.widget_type, sidebar: form.sidebar,
        config, sort_order: maxOrder + 1,
      });
      if (error) throw error;
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["sidebar-widgets"] });
      toast.success("উইজেট যোগ হয়েছে");
      setForm({ title: "", widget_type: "latest_posts", sidebar: sidebarFilter, config: "{}", category_id: "" });
    },
    onError: (e: any) => toast.error(e.message),
  });

  const toggleActive = useMutation({
    mutationFn: async ({ id, is_active }: { id: string; is_active: boolean }) => {
      const { error } = await supabase.from("sidebar_widgets").update({ is_active }).eq("id", id);
      if (error) throw error;
    },
    onSuccess: () => qc.invalidateQueries({ queryKey: ["sidebar-widgets"] }),
  });

  const moveWidget = useMutation({
    mutationFn: async ({ id, direction }: { id: string; direction: "up" | "down" }) => {
      const idx = filtered.findIndex(w => w.id === id);
      if (idx < 0) return;
      const swapIdx = direction === "up" ? idx - 1 : idx + 1;
      if (swapIdx < 0 || swapIdx >= filtered.length) return;
      const a = filtered[idx], b = filtered[swapIdx];
      await supabase.from("sidebar_widgets").update({ sort_order: b.sort_order }).eq("id", a.id);
      await supabase.from("sidebar_widgets").update({ sort_order: a.sort_order }).eq("id", b.id);
    },
    onSuccess: () => qc.invalidateQueries({ queryKey: ["sidebar-widgets"] }),
  });

  const deleteMutation = useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase.from("sidebar_widgets").delete().eq("id", id);
      if (error) throw error;
    },
    onSuccess: () => { qc.invalidateQueries({ queryKey: ["sidebar-widgets"] }); toast.success("মুছে ফেলা হয়েছে"); },
  });

  const copyId = (id: string) => {
    navigator.clipboard.writeText(id);
    toast.success("আইডি কপি হয়েছে!");
  };

  return (
    <div>
      <h1 className="font-heading font-bold text-2xl mb-6">📐 সাইডবার উইজেট</h1>

      {/* Sidebar toggle */}
      <div className="flex gap-1 mb-4 bg-muted rounded-lg p-1 w-fit">
        {(["left", "right"] as const).map(s => (
          <button key={s} onClick={() => { setSidebarFilter(s); setForm(p => ({ ...p, sidebar: s })); }}
            className={`px-4 py-1.5 rounded-md text-sm font-medium transition-colors ${sidebarFilter === s ? "bg-primary text-primary-foreground" : "text-muted-foreground"}`}>
            {s === "left" ? "বাম সাইডবার" : "ডান সাইডবার"}
          </button>
        ))}
      </div>

      {/* Category ID Helper */}
      <div className="mb-4">
        <button onClick={() => setShowCategoryHelper(!showCategoryHelper)}
          className="text-xs text-primary hover:underline flex items-center gap-1">
          📋 ক্যাটাগরি আইডি দেখুন (সাইডবারে বসানোর জন্য)
        </button>
        {showCategoryHelper && (
          <div className="mt-2 bg-card rounded-xl border border-border overflow-hidden max-h-60 overflow-y-auto">
            <div className="px-3 py-2 bg-muted border-b border-border text-xs font-heading font-semibold">
              ক্যাটাগরি → আইডি (ক্লিক করে কপি)
            </div>
            <div className="divide-y divide-border">
              {categories.map(c => (
                <button key={c.id} onClick={() => copyId(c.id)}
                  className="flex items-center justify-between w-full px-3 py-2 hover:bg-muted/50 transition-colors text-left">
                  <span className="text-xs">
                    {c.name}
                    <span className="text-muted-foreground ml-1">
                      ({c.type === 'news' ? 'খবর' : c.type === 'blog' ? 'ব্লগ' : 'ডিরেক্টরি'})
                    </span>
                  </span>
                  <span className="flex items-center gap-1 text-[10px] font-mono text-muted-foreground">
                    {c.id.slice(0, 8)}…
                    <Copy className="h-3 w-3" />
                  </span>
                </button>
              ))}
            </div>
          </div>
        )}
      </div>

      {/* Add form */}
      <div className="bg-card rounded-xl border border-border p-4 mb-6">
        <div className="grid sm:grid-cols-2 lg:grid-cols-4 gap-3 items-end">
          <div>
            <label className="text-xs font-medium text-muted-foreground">শিরোনাম *</label>
            <input value={form.title} onChange={e => setForm(p => ({ ...p, title: e.target.value }))} placeholder="উইজেটের নাম"
              className="w-full mt-1 px-3 py-2 rounded-lg border border-input bg-background text-sm" />
          </div>
          <div>
            <label className="text-xs font-medium text-muted-foreground">টাইপ</label>
            <select value={form.widget_type} onChange={e => setForm(p => ({ ...p, widget_type: e.target.value }))}
              className="w-full mt-1 px-3 py-2 rounded-lg border border-input bg-background text-sm">
              {WIDGET_TYPES.map(t => <option key={t.value} value={t.value}>{t.label}</option>)}
            </select>
          </div>
          {needsCategory && (
            <div>
              <label className="text-xs font-medium text-muted-foreground">ক্যাটাগরি নির্বাচন *</label>
              <select value={form.category_id} onChange={e => setForm(p => ({ ...p, category_id: e.target.value }))}
                className="w-full mt-1 px-3 py-2 rounded-lg border border-input bg-background text-sm">
                <option value="">-- ক্যাটাগরি বেছে নিন --</option>
                {categories.map(c => (
                  <option key={c.id} value={c.id}>
                    {c.name} ({c.type === 'news' ? 'খবর' : c.type === 'blog' ? 'ব্লগ' : 'ডিরেক্টরি'})
                  </option>
                ))}
              </select>
            </div>
          )}
          <div>
            <label className="text-xs font-medium text-muted-foreground">কনফিগ (JSON)</label>
            <input value={form.config} onChange={e => setForm(p => ({ ...p, config: e.target.value }))} placeholder='{"limit": 5}'
              className="w-full mt-1 px-3 py-2 rounded-lg border border-input bg-background text-sm font-mono text-xs" />
          </div>
          <button onClick={() => addMutation.mutate()} disabled={!form.title || (needsCategory && !form.category_id) || addMutation.isPending}
            className="flex items-center justify-center gap-1 px-4 py-2 rounded-lg bg-primary text-primary-foreground text-sm font-medium disabled:opacity-50">
            <Plus className="h-4 w-4" /> যোগ করুন
          </button>
        </div>
      </div>

      {/* Widget list */}
      <div className="bg-card rounded-xl border border-border overflow-hidden">
        <div className="px-4 py-2.5 bg-muted border-b border-border font-heading font-semibold text-sm">
          {sidebarFilter === "left" ? "বাম" : "ডান"} সাইডবার উইজেট ({filtered.length})
        </div>
        {isLoading ? (
          <p className="p-4 text-sm text-muted-foreground">লোড হচ্ছে...</p>
        ) : filtered.length > 0 ? (
          <div className="divide-y divide-border">
            {filtered.map((w, idx) => (
              <div key={w.id} className={`flex items-center gap-3 px-4 py-3 ${!w.is_active ? "opacity-50" : ""}`}>
                <GripVertical className="h-4 w-4 text-muted-foreground shrink-0" />
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-medium">{w.title}</p>
                  <p className="text-xs text-muted-foreground">
                    {WIDGET_TYPES.find(t => t.value === w.widget_type)?.label || w.widget_type}
                    {(w.config as any)?.category_id && (
                      <span className="ml-1 text-primary">
                        • {categories.find(c => c.id === (w.config as any).category_id)?.name || 'ক্যাটাগরি'}
                      </span>
                    )}
                  </p>
                </div>
                <div className="flex items-center gap-0.5 shrink-0">
                  <button onClick={() => moveWidget.mutate({ id: w.id, direction: "up" })} disabled={idx === 0}
                    className="p-1 hover:bg-muted rounded disabled:opacity-30"><ArrowUp className="h-3.5 w-3.5" /></button>
                  <button onClick={() => moveWidget.mutate({ id: w.id, direction: "down" })} disabled={idx === filtered.length - 1}
                    className="p-1 hover:bg-muted rounded disabled:opacity-30"><ArrowDown className="h-3.5 w-3.5" /></button>
                  <button onClick={() => toggleActive.mutate({ id: w.id, is_active: !w.is_active })}
                    className="p-1.5 hover:bg-muted rounded">
                    {w.is_active ? <Eye className="h-3.5 w-3.5 text-green-500" /> : <EyeOff className="h-3.5 w-3.5" />}
                  </button>
                  <button onClick={() => { if (confirm("নিশ্চিত?")) deleteMutation.mutate(w.id); }}
                    className="p-1.5 hover:bg-destructive/10 rounded text-destructive"><Trash2 className="h-3.5 w-3.5" /></button>
                </div>
              </div>
            ))}
          </div>
        ) : (
          <p className="p-4 text-sm text-muted-foreground">কোনো উইজেট নেই</p>
        )}
      </div>
    </div>
  );
}
