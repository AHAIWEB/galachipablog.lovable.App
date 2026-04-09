import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import { Plus, Trash2, GripVertical, ToggleLeft, ToggleRight } from "lucide-react";

const WIDGET_TYPES = [
  { value: "latest_posts", label: "সর্বশেষ পোস্ট" },
  { value: "news_posts", label: "খবর" },
  { value: "blog_posts", label: "ব্লগ" },
  { value: "directory_index", label: "ইনডেক্স লিস্ট" },
  { value: "photo_gallery", label: "ফটো গ্যালারি" },
  { value: "website_links", label: "ওয়েবসাইট লিংক" },
  { value: "business_cards", label: "বিজনেস কার্ড" },
  { value: "ad_slot", label: "বিজ্ঞাপন" },
  { value: "custom_html", label: "কাস্টম HTML" },
];

export default function AdminSidebarWidgets() {
  const qc = useQueryClient();
  const [showForm, setShowForm] = useState(false);
  const [form, setForm] = useState({ widget_type: "latest_posts", title: "", sidebar: "left", config: "{}" });

  const { data: widgets = [], isLoading } = useQuery({
    queryKey: ["sidebar-widgets"],
    queryFn: async () => {
      const { data } = await supabase.from("sidebar_widgets").select("*").order("sidebar").order("sort_order");
      return data ?? [];
    },
  });

  const addMutation = useMutation({
    mutationFn: async () => {
      const type = WIDGET_TYPES.find(w => w.value === form.widget_type);
      const { error } = await supabase.from("sidebar_widgets").insert({
        widget_type: form.widget_type,
        title: form.title || type?.label || form.widget_type,
        sidebar: form.sidebar,
        config: JSON.parse(form.config || "{}"),
        sort_order: widgets.filter(w => w.sidebar === form.sidebar).length,
      });
      if (error) throw error;
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["sidebar-widgets"] });
      toast.success("উইজেট যোগ হয়েছে");
      setShowForm(false);
      setForm({ widget_type: "latest_posts", title: "", sidebar: "left", config: "{}" });
    },
    onError: (err: any) => toast.error(err.message),
  });

  const toggleMutation = useMutation({
    mutationFn: async ({ id, is_active }: { id: string; is_active: boolean }) => {
      const { error } = await supabase.from("sidebar_widgets").update({ is_active }).eq("id", id);
      if (error) throw error;
    },
    onSuccess: () => qc.invalidateQueries({ queryKey: ["sidebar-widgets"] }),
  });

  const deleteMutation = useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase.from("sidebar_widgets").delete().eq("id", id);
      if (error) throw error;
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["sidebar-widgets"] });
      toast.success("মুছে ফেলা হয়েছে");
    },
  });

  const moveMutation = useMutation({
    mutationFn: async ({ id, direction }: { id: string; direction: "up" | "down" }) => {
      const widget = widgets.find(w => w.id === id);
      if (!widget) return;
      const sameBar = widgets.filter(w => w.sidebar === widget.sidebar).sort((a, b) => a.sort_order - b.sort_order);
      const idx = sameBar.findIndex(w => w.id === id);
      const swapIdx = direction === "up" ? idx - 1 : idx + 1;
      if (swapIdx < 0 || swapIdx >= sameBar.length) return;

      await supabase.from("sidebar_widgets").update({ sort_order: sameBar[swapIdx].sort_order }).eq("id", id);
      await supabase.from("sidebar_widgets").update({ sort_order: sameBar[idx].sort_order }).eq("id", sameBar[swapIdx].id);
    },
    onSuccess: () => qc.invalidateQueries({ queryKey: ["sidebar-widgets"] }),
  });

  const leftWidgets = widgets.filter(w => w.sidebar === "left").sort((a, b) => a.sort_order - b.sort_order);
  const rightWidgets = widgets.filter(w => w.sidebar === "right").sort((a, b) => a.sort_order - b.sort_order);

  const WidgetList = ({ items, side }: { items: any[]; side: string }) => (
    <div className="space-y-2">
      <h3 className="font-heading font-semibold text-sm text-muted-foreground">{side === "left" ? "⬅ বাম সাইডবার" : "➡ ডান সাইডবার"}</h3>
      {items.length === 0 ? (
        <p className="text-xs text-muted-foreground p-3 bg-muted/30 rounded-lg">কোনো উইজেট নেই</p>
      ) : (
        items.map((w, i) => (
          <div key={w.id} className="flex items-center gap-2 p-2.5 bg-card rounded-lg border border-border">
            <div className="flex flex-col gap-0.5">
              <button onClick={() => moveMutation.mutate({ id: w.id, direction: "up" })} className="text-[10px] hover:text-primary" disabled={i === 0}>↑</button>
              <button onClick={() => moveMutation.mutate({ id: w.id, direction: "down" })} className="text-[10px] hover:text-primary" disabled={i === items.length - 1}>↓</button>
            </div>
            <div className="flex-1 min-w-0">
              <p className="text-sm font-medium truncate">{w.title}</p>
              <p className="text-[10px] text-muted-foreground">{WIDGET_TYPES.find(t => t.value === w.widget_type)?.label || w.widget_type}</p>
            </div>
            <button onClick={() => toggleMutation.mutate({ id: w.id, is_active: !w.is_active })} className="p-1">
              {w.is_active ? <ToggleRight className="h-5 w-5 text-primary" /> : <ToggleLeft className="h-5 w-5 text-muted-foreground" />}
            </button>
            <button onClick={() => { if (confirm("মুছে ফেলবেন?")) deleteMutation.mutate(w.id); }} className="p-1 text-destructive hover:bg-destructive/10 rounded">
              <Trash2 className="h-3.5 w-3.5" />
            </button>
          </div>
        ))
      )}
    </div>
  );

  return (
    <div>
      <div className="flex items-center justify-between mb-4">
        <h1 className="font-heading font-bold text-2xl">🧩 সাইডবার উইজেট</h1>
        <button onClick={() => setShowForm(!showForm)} className="flex items-center gap-1.5 px-4 py-2 rounded-lg bg-primary text-primary-foreground text-sm font-medium">
          <Plus className="h-4 w-4" /> নতুন উইজেট
        </button>
      </div>

      {showForm && (
        <div className="bg-card rounded-xl border border-border p-5 mb-5">
          <div className="grid sm:grid-cols-2 gap-4">
            <div>
              <label className="text-xs font-medium text-muted-foreground">উইজেট টাইপ</label>
              <select value={form.widget_type} onChange={e => setForm(p => ({ ...p, widget_type: e.target.value }))} className="w-full mt-1 px-3 py-2 rounded-lg border border-input bg-background text-sm">
                {WIDGET_TYPES.map(w => <option key={w.value} value={w.value}>{w.label}</option>)}
              </select>
            </div>
            <div>
              <label className="text-xs font-medium text-muted-foreground">শিরোনাম</label>
              <input value={form.title} onChange={e => setForm(p => ({ ...p, title: e.target.value }))} placeholder="অটো" className="w-full mt-1 px-3 py-2 rounded-lg border border-input bg-background text-sm" />
            </div>
            <div>
              <label className="text-xs font-medium text-muted-foreground">সাইডবার</label>
              <select value={form.sidebar} onChange={e => setForm(p => ({ ...p, sidebar: e.target.value }))} className="w-full mt-1 px-3 py-2 rounded-lg border border-input bg-background text-sm">
                <option value="left">বাম</option>
                <option value="right">ডান</option>
              </select>
            </div>
          </div>
          <div className="flex gap-2 mt-4">
            <button onClick={() => addMutation.mutate()} disabled={addMutation.isPending} className="px-4 py-2 rounded-lg bg-primary text-primary-foreground text-sm font-medium disabled:opacity-50">যোগ করুন</button>
            <button onClick={() => setShowForm(false)} className="px-4 py-2 rounded-lg bg-muted text-sm">বাতিল</button>
          </div>
        </div>
      )}

      {isLoading ? (
        <p className="text-sm text-muted-foreground">লোড হচ্ছে...</p>
      ) : (
        <div className="grid md:grid-cols-2 gap-6">
          <WidgetList items={leftWidgets} side="left" />
          <WidgetList items={rightWidgets} side="right" />
        </div>
      )}
    </div>
  );
}
