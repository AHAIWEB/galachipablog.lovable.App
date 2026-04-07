import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import { Plus, Trash2 } from "lucide-react";

export default function AdminCategories() {
  const queryClient = useQueryClient();
  const [form, setForm] = useState({ name: "", type: "news" as "news" | "blog" | "directory", letter: "" });

  const { data: categories, isLoading } = useQuery({
    queryKey: ["admin-categories"],
    queryFn: async () => {
      const { data, error } = await supabase.from("categories").select("*").order("type").order("letter").order("name");
      if (error) throw error;
      return data;
    },
  });

  const addMutation = useMutation({
    mutationFn: async () => {
      const slug = form.name.toLowerCase().replace(/\s+/g, "-").replace(/[^\w\u0980-\u09FF-]/g, "") + "-" + Date.now();
      const { error } = await supabase.from("categories").insert({ name: form.name, slug, type: form.type, letter: form.letter || null });
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["admin-categories"] });
      toast.success("ক্যাটাগরি যোগ হয়েছে");
      setForm({ name: "", type: "news", letter: "" });
    },
    onError: (err: any) => toast.error(err.message),
  });

  const deleteMutation = useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase.from("categories").delete().eq("id", id);
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["admin-categories"] });
      toast.success("মুছে ফেলা হয়েছে");
    },
  });

  const typeLabels = { news: "📰 খবর", blog: "💡 ব্লগ", directory: "📂 ডিরেক্টরি" };

  return (
    <div>
      <h1 className="font-heading font-bold text-2xl mb-6">📂 ক্যাটাগরি ম্যানেজমেন্ট</h1>

      <div className="bg-card rounded-xl border border-border p-4 mb-6">
        <div className="flex flex-wrap gap-3 items-end">
          <div>
            <label className="text-xs font-medium text-muted-foreground">নাম *</label>
            <input value={form.name} onChange={e => setForm(p => ({ ...p, name: e.target.value }))} placeholder="ক্যাটাগরির নাম" className="w-full mt-1 px-3 py-2 rounded-lg border border-input bg-background text-sm focus:outline-none focus:ring-2 focus:ring-ring" />
          </div>
          <div>
            <label className="text-xs font-medium text-muted-foreground">ধরন</label>
            <select value={form.type} onChange={e => setForm(p => ({ ...p, type: e.target.value as any }))} className="w-full mt-1 px-3 py-2 rounded-lg border border-input bg-background text-sm">
              <option value="news">খবর</option>
              <option value="blog">ব্লগ</option>
              <option value="directory">ডিরেক্টরি</option>
            </select>
          </div>
          <div>
            <label className="text-xs font-medium text-muted-foreground">অক্ষর</label>
            <input value={form.letter} onChange={e => setForm(p => ({ ...p, letter: e.target.value }))} placeholder="ক" maxLength={2} className="w-20 mt-1 px-3 py-2 rounded-lg border border-input bg-background text-sm focus:outline-none focus:ring-2 focus:ring-ring" />
          </div>
          <button onClick={() => addMutation.mutate()} disabled={!form.name || addMutation.isPending} className="flex items-center gap-1 px-4 py-2 rounded-lg bg-primary text-primary-foreground text-sm font-medium disabled:opacity-50">
            <Plus className="h-4 w-4" /> যোগ করুন
          </button>
        </div>
      </div>

      {isLoading ? (
        <p className="text-muted-foreground text-sm">লোড হচ্ছে...</p>
      ) : (
        <div className="space-y-4">
          {(["news", "blog", "directory"] as const).map(type => {
            const filtered = categories?.filter(c => c.type === type) ?? [];
            return (
              <div key={type} className="bg-card rounded-xl border border-border overflow-hidden">
                <div className="px-4 py-2.5 bg-muted border-b border-border font-heading font-semibold text-sm">
                  {typeLabels[type]} ({filtered.length})
                </div>
                <div className="divide-y divide-border">
                  {filtered.length > 0 ? filtered.map(c => (
                    <div key={c.id} className="flex items-center justify-between px-4 py-2 text-sm">
                      <div>
                        {c.letter && <span className="font-bold mr-2">{c.letter}</span>}
                        {c.name}
                      </div>
                      <button
                        onClick={() => { if (confirm("নিশ্চিত?")) deleteMutation.mutate(c.id); }}
                        className="p-1 hover:bg-destructive/10 rounded text-destructive"
                      >
                        <Trash2 className="h-3.5 w-3.5" />
                      </button>
                    </div>
                  )) : (
                    <p className="p-3 text-xs text-muted-foreground">কোনো ক্যাটাগরি নেই</p>
                  )}
                </div>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}
