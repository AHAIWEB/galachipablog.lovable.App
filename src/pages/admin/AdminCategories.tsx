import { useState, useMemo } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import { Plus, Trash2, ChevronRight, ChevronDown, FolderTree, Pencil } from "lucide-react";

type Category = {
  id: string;
  name: string;
  slug: string;
  type: "news" | "blog" | "directory";
  letter: string | null;
  parent_id: string | null;
  sort_order: number;
  is_locked: boolean;
  created_at: string;
};

function buildTree(cats: Category[]): (Category & { children: Category[] })[] {
  const map = new Map<string | null, Category[]>();
  for (const c of cats) {
    const pid = c.parent_id || null;
    if (!map.has(pid)) map.set(pid, []);
    map.get(pid)!.push(c);
  }
  const attach = (parentId: string | null): (Category & { children: Category[] })[] => {
    return (map.get(parentId) || []).map(c => ({ ...c, children: attach(c.id) }));
  };
  return attach(null);
}

export default function AdminCategories() {
  const queryClient = useQueryClient();
  const [form, setForm] = useState({ name: "", type: "news" as "news" | "blog" | "directory", letter: "", parent_id: "" });
  const [editingId, setEditingId] = useState<string | null>(null);
  const [editForm, setEditForm] = useState({ name: "", parent_id: "", letter: "" });
  const [expanded, setExpanded] = useState<Set<string>>(new Set());

  const { data: categories, isLoading } = useQuery({
    queryKey: ["admin-categories"],
    queryFn: async () => {
      const { data, error } = await supabase.from("categories").select("*").is("deleted_at", null).order("sort_order").order("name");
      if (error) throw error;
      return data as Category[];
    },
  });

  const addMutation = useMutation({
    mutationFn: async () => {
      const slug = form.name.toLowerCase().replace(/\s+/g, "-").replace(/[^\w\u0980-\u09FF-]/g, "") + "-" + Date.now();
      const { error } = await supabase.from("categories").insert({
        name: form.name, slug, type: form.type,
        letter: form.letter || null,
        parent_id: form.parent_id || null,
      });
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["admin-categories"] });
      toast.success("ক্যাটাগরি যোগ হয়েছে");
      setForm({ name: "", type: "news", letter: "", parent_id: "" });
    },
    onError: (err: any) => toast.error(err.message),
  });

  const updateMutation = useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase.from("categories").update({
        name: editForm.name,
        parent_id: editForm.parent_id || null,
        letter: editForm.letter || null,
      }).eq("id", id);
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["admin-categories"] });
      toast.success("আপডেট হয়েছে");
      setEditingId(null);
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

  const toggleExpand = (id: string) => {
    setExpanded(prev => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id); else next.add(id);
      return next;
    });
  };

  const startEdit = (cat: Category) => {
    setEditingId(cat.id);
    setEditForm({ name: cat.name, parent_id: cat.parent_id || "", letter: cat.letter || "" });
  };

  // Get flat list for parent selector (exclude self and descendants)
  const getParentOptions = (excludeId?: string) => {
    if (!categories) return [];
    const excluded = new Set<string>();
    if (excludeId) {
      const collectDescendants = (pid: string) => {
        excluded.add(pid);
        categories.filter(c => c.parent_id === pid).forEach(c => collectDescendants(c.id));
      };
      collectDescendants(excludeId);
    }
    return categories.filter(c => !excluded.has(c.id));
  };

  const renderCategoryItem = (cat: Category & { children: Category[] }, depth: number, type: string) => {
    const hasChildren = cat.children.length > 0;
    const isExpanded = expanded.has(cat.id);
    const isEditing = editingId === cat.id;

    return (
      <div key={cat.id}>
        <div className={`flex items-center justify-between px-4 py-2 text-sm hover:bg-muted/50 ${depth > 0 ? "border-l-2 border-primary/20" : ""}`}
          style={{ paddingLeft: `${16 + depth * 24}px` }}>
          <div className="flex items-center gap-2 flex-1 min-w-0">
            {hasChildren ? (
              <button onClick={() => toggleExpand(cat.id)} className="p-0.5 hover:bg-muted rounded">
                {isExpanded ? <ChevronDown className="h-3.5 w-3.5" /> : <ChevronRight className="h-3.5 w-3.5" />}
              </button>
            ) : <span className="w-5" />}
            {cat.letter && <span className="font-bold text-xs bg-primary/10 px-1.5 py-0.5 rounded">{cat.letter}</span>}
            {isEditing ? (
              <div className="flex gap-2 items-center flex-1">
                <input value={editForm.name} onChange={e => setEditForm(p => ({ ...p, name: e.target.value }))}
                  className="px-2 py-1 rounded border border-input bg-background text-xs w-32" />
                <select value={editForm.parent_id} onChange={e => setEditForm(p => ({ ...p, parent_id: e.target.value }))}
                  className="px-2 py-1 rounded border border-input bg-background text-xs">
                  <option value="">— রুট —</option>
                  {getParentOptions(cat.id).filter(c => c.type === type).map(c => (
                    <option key={c.id} value={c.id}>{c.name}</option>
                  ))}
                </select>
                <input value={editForm.letter} onChange={e => setEditForm(p => ({ ...p, letter: e.target.value }))}
                  placeholder="অক্ষর" maxLength={2}
                  className="px-2 py-1 rounded border border-input bg-background text-xs w-12" />
                <button onClick={() => updateMutation.mutate(cat.id)} className="text-xs text-primary font-medium">সেভ</button>
                <button onClick={() => setEditingId(null)} className="text-xs text-muted-foreground">বাতিল</button>
              </div>
            ) : (
              <span className="truncate">{cat.name}</span>
            )}
            {hasChildren && !isEditing && (
              <span className="text-[10px] text-muted-foreground">({cat.children.length})</span>
            )}
          </div>
          {!isEditing && (
            <div className="flex gap-0.5 shrink-0">
              <button onClick={() => startEdit(cat)} className="p-1 hover:bg-muted rounded text-muted-foreground hover:text-foreground">
                <Pencil className="h-3 w-3" />
              </button>
              {!cat.is_locked && (
                <button
                  onClick={() => { if (confirm("নিশ্চিত?")) deleteMutation.mutate(cat.id); }}
                  className="p-1 hover:bg-destructive/10 rounded text-destructive"
                >
                  <Trash2 className="h-3 w-3" />
                </button>
              )}
            </div>
          )}
        </div>
        {hasChildren && isExpanded && cat.children.map(child => renderCategoryItem({ ...child, children: buildTree(categories?.filter(c => c.parent_id === child.id) || []).length > 0 ? buildTree(categories!).flatMap(function findChild(n: any): any[] { if (n.id === child.id) return n.children; return n.children.flatMap(findChild); }) : [] }, depth + 1, type))}
      </div>
    );
  };

  // Build proper trees per type
  const treesByType = useMemo(() => {
    if (!categories) return {};
    const result: Record<string, (Category & { children: Category[] })[]> = {};
    for (const type of ["news", "blog", "directory"] as const) {
      const typed = categories.filter(c => c.type === type);
      const map = new Map<string | null, Category[]>();
      for (const c of typed) {
        const pid = c.parent_id && typed.find(t => t.id === c.parent_id) ? c.parent_id : null;
        if (!map.has(pid)) map.set(pid, []);
        map.get(pid)!.push(c);
      }
      const attach = (parentId: string | null): (Category & { children: Category[] })[] =>
        (map.get(parentId) || []).map(c => ({ ...c, children: attach(c.id) }));
      result[type] = attach(null);
    }
    return result;
  }, [categories]);

  return (
    <div>
      <h1 className="font-heading font-bold text-2xl mb-6">📂 ক্যাটাগরি ম্যানেজমেন্ট</h1>

      <div className="bg-card rounded-xl border border-border p-4 mb-6">
        <div className="flex items-center gap-2 mb-3">
          <FolderTree className="h-4 w-4 text-primary" />
          <h2 className="font-heading font-semibold text-sm">নতুন ক্যাটাগরি / সাব-ক্যাটাগরি যোগ</h2>
        </div>
        <div className="grid sm:grid-cols-2 lg:grid-cols-5 gap-3">
          <div>
            <label className="text-xs font-medium text-muted-foreground">নাম *</label>
            <input value={form.name} onChange={e => setForm(p => ({ ...p, name: e.target.value }))} placeholder="ক্যাটাগরির নাম"
              className="w-full mt-1 px-3 py-2 rounded-lg border border-input bg-background text-sm focus:outline-none focus:ring-2 focus:ring-ring" />
          </div>
          <div>
            <label className="text-xs font-medium text-muted-foreground">ধরন</label>
            <select value={form.type} onChange={e => setForm(p => ({ ...p, type: e.target.value as any }))}
              className="w-full mt-1 px-3 py-2 rounded-lg border border-input bg-background text-sm">
              <option value="news">খবর</option>
              <option value="blog">ব্লগ</option>
              <option value="directory">ডিরেক্টরি</option>
            </select>
          </div>
          <div>
            <label className="text-xs font-medium text-muted-foreground">প্যারেন্ট ক্যাটাগরি</label>
            <select value={form.parent_id} onChange={e => setForm(p => ({ ...p, parent_id: e.target.value }))}
              className="w-full mt-1 px-3 py-2 rounded-lg border border-input bg-background text-sm">
              <option value="">— রুট (কোনো প্যারেন্ট নেই) —</option>
              {categories?.filter(c => c.type === form.type).map(c => (
                <option key={c.id} value={c.id}>
                  {c.parent_id ? "└─ " : ""}{c.name}
                </option>
              ))}
            </select>
          </div>
          <div>
            <label className="text-xs font-medium text-muted-foreground">অক্ষর</label>
            <input value={form.letter} onChange={e => setForm(p => ({ ...p, letter: e.target.value }))} placeholder="ক" maxLength={2}
              className="w-full mt-1 px-3 py-2 rounded-lg border border-input bg-background text-sm focus:outline-none focus:ring-2 focus:ring-ring" />
          </div>
          <div className="flex items-end">
            <button onClick={() => addMutation.mutate()} disabled={!form.name || addMutation.isPending}
              className="flex items-center gap-1 px-4 py-2 rounded-lg bg-primary text-primary-foreground text-sm font-medium disabled:opacity-50 w-full justify-center">
              <Plus className="h-4 w-4" /> যোগ করুন
            </button>
          </div>
        </div>
      </div>

      {isLoading ? (
        <p className="text-muted-foreground text-sm">লোড হচ্ছে...</p>
      ) : (
        <div className="space-y-4">
          {(["news", "blog", "directory"] as const).map(type => {
            const tree = treesByType[type] || [];
            const total = categories?.filter(c => c.type === type).length ?? 0;
            return (
              <div key={type} className="bg-card rounded-xl border border-border overflow-hidden">
                <div className="px-4 py-2.5 bg-muted border-b border-border font-heading font-semibold text-sm flex justify-between">
                  <span>{typeLabels[type]} ({total})</span>
                  <span className="text-xs text-muted-foreground font-normal">
                    {tree.length} রুট, {total - tree.length} সাব
                  </span>
                </div>
                <div className="divide-y divide-border">
                  {tree.length > 0 ? tree.map(c => renderCategoryItem(c, 0, type)) : (
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
