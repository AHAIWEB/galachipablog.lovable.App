import { useState, useMemo } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import { Plus, Trash2, Pencil, ChevronRight, ChevronDown, FolderOpen, FolderPlus, GripVertical, X, Check } from "lucide-react";

type Category = {
  id: string;
  name: string;
  slug: string;
  type: "news" | "blog" | "directory";
  parent_id: string | null;
  letter: string | null;
  sort_order: number;
  is_locked: boolean;
  created_at: string;
};

export default function AdminCategories() {
  const queryClient = useQueryClient();
  const [form, setForm] = useState({ name: "", type: "news" as "news" | "blog" | "directory", letter: "", parent_id: "" });
  const [expandedIds, setExpandedIds] = useState<Set<string>>(new Set());
  const [editingId, setEditingId] = useState<string | null>(null);
  const [editForm, setEditForm] = useState({ name: "", letter: "", type: "news" as string });
  const [addSubParentId, setAddSubParentId] = useState<string | null>(null);
  const [subForm, setSubForm] = useState({ name: "", letter: "" });

  const { data: categories, isLoading } = useQuery({
    queryKey: ["admin-categories"],
    queryFn: async () => {
      const { data, error } = await supabase.from("categories").select("*").is("deleted_at", null).order("sort_order").order("name");
      if (error) throw error;
      return data as Category[];
    },
  });

  // Build tree grouped by type
  const tree = useMemo(() => {
    if (!categories) return { news: [], blog: [], directory: [] };
    const result: Record<string, (Category & { children: Category[] })[]> = { news: [], blog: [], directory: [] };
    const parents = categories.filter(c => !c.parent_id);
    for (const p of parents) {
      const children = categories.filter(c => c.parent_id === p.id).sort((a, b) => a.sort_order - b.sort_order || a.name.localeCompare(b.name, "bn"));
      if (result[p.type]) {
        result[p.type].push({ ...p, children });
      }
    }
    return result;
  }, [categories]);

  const toggleExpand = (id: string) => {
    setExpandedIds(prev => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id); else next.add(id);
      return next;
    });
  };

  const addMutation = useMutation({
    mutationFn: async () => {
      const slug = form.name.toLowerCase().replace(/\s+/g, "-").replace(/[^\w\u0980-\u09FF-]/g, "") + "-" + Date.now();
      const { error } = await supabase.from("categories").insert({
        name: form.name, slug, type: form.type, letter: form.letter || null,
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

  const addSubMutation = useMutation({
    mutationFn: async (parentId: string) => {
      const parent = categories?.find(c => c.id === parentId);
      if (!parent) throw new Error("Parent not found");
      const slug = subForm.name.toLowerCase().replace(/\s+/g, "-").replace(/[^\w\u0980-\u09FF-]/g, "") + "-" + Date.now();
      const { error } = await supabase.from("categories").insert({
        name: subForm.name, slug, type: parent.type, letter: subForm.letter || null,
        parent_id: parentId,
      });
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["admin-categories"] });
      toast.success("সাব-ক্যাটাগরি যোগ হয়েছে");
      setSubForm({ name: "", letter: "" });
      setAddSubParentId(null);
    },
    onError: (err: any) => toast.error(err.message),
  });

  const updateMutation = useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase.from("categories").update({
        name: editForm.name, letter: editForm.letter || null,
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
      // Soft delete
      const { error } = await supabase.from("categories").update({ deleted_at: new Date().toISOString() }).eq("id", id);
      if (error) throw error;
      // Also soft delete children
      await supabase.from("categories").update({ deleted_at: new Date().toISOString() }).eq("parent_id", id);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["admin-categories"] });
      toast.success("মুছে ফেলা হয়েছে");
    },
  });

  const startEdit = (cat: Category) => {
    setEditingId(cat.id);
    setEditForm({ name: cat.name, letter: cat.letter || "", type: cat.type });
  };

  const typeLabels: Record<string, string> = { news: "📰 খবর", blog: "💡 ব্লগ", directory: "📂 ডিরেক্টরি" };
  const typeColors: Record<string, string> = { news: "border-blue-500/30", blog: "border-green-500/30", directory: "border-purple-500/30" };

  const renderCategory = (cat: Category & { children: Category[] }, depth = 0) => {
    const isExpanded = expandedIds.has(cat.id);
    const hasChildren = cat.children.length > 0;
    const isEditing = editingId === cat.id;
    const isAddingSub = addSubParentId === cat.id;

    return (
      <div key={cat.id}>
        <div className={`flex items-center gap-1.5 px-3 py-2 hover:bg-muted/50 transition-colors ${depth > 0 ? "border-l-2 border-muted ml-4" : ""}`}>
          {/* Expand/collapse */}
          {hasChildren || depth === 0 ? (
            <button onClick={() => toggleExpand(cat.id)} className="p-0.5 hover:bg-muted rounded shrink-0">
              {isExpanded ? <ChevronDown className="h-3.5 w-3.5" /> : <ChevronRight className="h-3.5 w-3.5" />}
            </button>
          ) : (
            <span className="w-5" />
          )}

          {depth === 0 ? <FolderOpen className="h-3.5 w-3.5 text-primary shrink-0" /> : <span className="w-1.5 h-1.5 rounded-full bg-muted-foreground/40 shrink-0" />}

          {isEditing ? (
            <div className="flex items-center gap-2 flex-1">
              <input value={editForm.name} onChange={e => setEditForm(p => ({ ...p, name: e.target.value }))}
                className="px-2 py-1 rounded border border-input bg-background text-sm flex-1" autoFocus />
              <input value={editForm.letter} onChange={e => setEditForm(p => ({ ...p, letter: e.target.value }))}
                placeholder="অক্ষর" maxLength={2}
                className="w-14 px-2 py-1 rounded border border-input bg-background text-sm" />
              <button onClick={() => updateMutation.mutate(cat.id)} className="p-1 hover:bg-green-500/10 rounded text-green-600">
                <Check className="h-3.5 w-3.5" />
              </button>
              <button onClick={() => setEditingId(null)} className="p-1 hover:bg-muted rounded">
                <X className="h-3.5 w-3.5" />
              </button>
            </div>
          ) : (
            <>
              <span className="text-sm flex-1">
                {cat.letter && <span className="font-bold mr-1.5 text-primary">{cat.letter}</span>}
                {cat.name}
                {hasChildren && <span className="text-xs text-muted-foreground ml-1">({cat.children.length})</span>}
              </span>
              <div className="flex items-center gap-0.5 shrink-0 opacity-0 group-hover:opacity-100 transition-opacity">
                {depth === 0 && (
                  <button onClick={() => { setAddSubParentId(addSubParentId === cat.id ? null : cat.id); setExpandedIds(prev => new Set([...prev, cat.id])); }}
                    className="p-1 hover:bg-primary/10 rounded text-primary" title="সাব-ক্যাটাগরি যোগ">
                    <FolderPlus className="h-3.5 w-3.5" />
                  </button>
                )}
                <button onClick={() => startEdit(cat)} className="p-1 hover:bg-muted rounded" title="এডিট">
                  <Pencil className="h-3.5 w-3.5" />
                </button>
                {!cat.is_locked && (
                  <button onClick={() => { if (confirm(`"${cat.name}" ${hasChildren ? "ও সব সাব-ক্যাটাগরি " : ""}মুছে ফেলবেন?`)) deleteMutation.mutate(cat.id); }}
                    className="p-1 hover:bg-destructive/10 rounded text-destructive" title="মুছুন">
                    <Trash2 className="h-3.5 w-3.5" />
                  </button>
                )}
              </div>
            </>
          )}
        </div>

        {/* Add sub-category form */}
        {isAddingSub && (
          <div className="flex items-center gap-2 ml-10 px-3 py-2 bg-muted/30 rounded-lg mx-3 my-1">
            <input value={subForm.name} onChange={e => setSubForm(p => ({ ...p, name: e.target.value }))}
              placeholder="সাব-ক্যাটাগরির নাম" className="px-2 py-1 rounded border border-input bg-background text-sm flex-1" autoFocus />
            <input value={subForm.letter} onChange={e => setSubForm(p => ({ ...p, letter: e.target.value }))}
              placeholder="অক্ষর" maxLength={2} className="w-14 px-2 py-1 rounded border border-input bg-background text-sm" />
            <button onClick={() => addSubMutation.mutate(cat.id)} disabled={!subForm.name}
              className="p-1 hover:bg-green-500/10 rounded text-green-600 disabled:opacity-50">
              <Check className="h-4 w-4" />
            </button>
            <button onClick={() => { setAddSubParentId(null); setSubForm({ name: "", letter: "" }); }} className="p-1 hover:bg-muted rounded">
              <X className="h-4 w-4" />
            </button>
          </div>
        )}

        {/* Children */}
        {isExpanded && cat.children.map(child => (
          <div key={child.id} className="group">
            <div className="flex items-center gap-1.5 px-3 py-1.5 hover:bg-muted/50 transition-colors ml-8 border-l-2 border-muted">
              <span className="w-1.5 h-1.5 rounded-full bg-muted-foreground/40 shrink-0" />
              {editingId === child.id ? (
                <div className="flex items-center gap-2 flex-1">
                  <input value={editForm.name} onChange={e => setEditForm(p => ({ ...p, name: e.target.value }))}
                    className="px-2 py-1 rounded border border-input bg-background text-sm flex-1" autoFocus />
                  <input value={editForm.letter} onChange={e => setEditForm(p => ({ ...p, letter: e.target.value }))}
                    placeholder="অক্ষর" maxLength={2}
                    className="w-14 px-2 py-1 rounded border border-input bg-background text-sm" />
                  <button onClick={() => updateMutation.mutate(child.id)} className="p-1 hover:bg-green-500/10 rounded text-green-600">
                    <Check className="h-3.5 w-3.5" />
                  </button>
                  <button onClick={() => setEditingId(null)} className="p-1 hover:bg-muted rounded">
                    <X className="h-3.5 w-3.5" />
                  </button>
                </div>
              ) : (
                <>
                  <span className="text-sm flex-1">
                    {child.letter && <span className="font-bold mr-1.5 text-muted-foreground">{child.letter}</span>}
                    {child.name}
                  </span>
                  <div className="flex items-center gap-0.5 shrink-0 opacity-0 group-hover:opacity-100 transition-opacity">
                    <button onClick={() => startEdit(child)} className="p-1 hover:bg-muted rounded"><Pencil className="h-3 w-3" /></button>
                    {!child.is_locked && (
                      <button onClick={() => { if (confirm("নিশ্চিত?")) deleteMutation.mutate(child.id); }}
                        className="p-1 hover:bg-destructive/10 rounded text-destructive"><Trash2 className="h-3 w-3" /></button>
                    )}
                  </div>
                </>
              )}
            </div>
          </div>
        ))}
      </div>
    );
  };

  return (
    <div>
      <h1 className="font-heading font-bold text-2xl mb-6">📂 ক্যাটাগরি ম্যানেজমেন্ট</h1>

      {/* Add new category */}
      <div className="bg-card rounded-xl border border-border p-4 mb-6">
        <h2 className="font-heading font-semibold text-sm mb-3">নতুন ক্যাটাগরি যোগ</h2>
        <div className="flex flex-wrap gap-3 items-end">
          <div className="flex-1 min-w-[150px]">
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
            <label className="text-xs font-medium text-muted-foreground">প্যারেন্ট</label>
            <select value={form.parent_id} onChange={e => setForm(p => ({ ...p, parent_id: e.target.value }))}
              className="w-full mt-1 px-3 py-2 rounded-lg border border-input bg-background text-sm">
              <option value="">রুট (প্যারেন্ট নয়)</option>
              {categories?.filter(c => !c.parent_id).map(c => (
                <option key={c.id} value={c.id}>{c.name} ({c.type})</option>
              ))}
            </select>
          </div>
          <div>
            <label className="text-xs font-medium text-muted-foreground">অক্ষর</label>
            <input value={form.letter} onChange={e => setForm(p => ({ ...p, letter: e.target.value }))} placeholder="ক" maxLength={2}
              className="w-20 mt-1 px-3 py-2 rounded-lg border border-input bg-background text-sm focus:outline-none focus:ring-2 focus:ring-ring" />
          </div>
          <button onClick={() => addMutation.mutate()} disabled={!form.name || addMutation.isPending}
            className="flex items-center gap-1 px-4 py-2 rounded-lg bg-primary text-primary-foreground text-sm font-medium disabled:opacity-50">
            <Plus className="h-4 w-4" /> যোগ করুন
          </button>
        </div>
      </div>

      {isLoading ? (
        <p className="text-muted-foreground text-sm">লোড হচ্ছে...</p>
      ) : (
        <div className="space-y-4">
          {(["news", "blog", "directory"] as const).map(type => {
            const items = tree[type] || [];
            const totalCount = items.reduce((sum, p) => sum + 1 + p.children.length, 0);
            return (
              <div key={type} className={`bg-card rounded-xl border ${typeColors[type]} overflow-hidden`}>
                <div className="px-4 py-2.5 bg-muted border-b border-border font-heading font-semibold text-sm flex items-center justify-between">
                  <span>{typeLabels[type]} ({totalCount})</span>
                  <button onClick={() => {
                    const allIds = items.map(i => i.id);
                    const allExpanded = allIds.every(id => expandedIds.has(id));
                    if (allExpanded) {
                      setExpandedIds(prev => { const next = new Set(prev); allIds.forEach(id => next.delete(id)); return next; });
                    } else {
                      setExpandedIds(prev => new Set([...prev, ...allIds]));
                    }
                  }} className="text-xs text-muted-foreground hover:text-foreground">
                    {items.some(i => expandedIds.has(i.id)) ? "সব বন্ধ" : "সব খুলুন"}
                  </button>
                </div>
                <div>
                  {items.length > 0 ? items.map(cat => (
                    <div key={cat.id} className="group border-b border-border last:border-0">
                      {renderCategory(cat)}
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
