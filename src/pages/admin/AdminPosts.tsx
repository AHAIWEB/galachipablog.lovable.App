import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import { Plus, Pencil, Trash2, Globe, Share2, Search, CheckSquare, Square, RotateCcw, Filter } from "lucide-react";
import type { Tables } from "@/integrations/supabase/types";

type Post = Tables<"posts">;

export default function AdminPosts() {
  const queryClient = useQueryClient();
  const [showForm, setShowForm] = useState(false);
  const [editing, setEditing] = useState<Post | null>(null);
  const [form, setForm] = useState({ title: "", slug: "", content: "", excerpt: "", featured_image: "", category_id: "", status: "draft" as "draft" | "published" | "archived", is_featured: false });
  const [search, setSearch] = useState("");
  const [statusFilter, setStatusFilter] = useState("all");
  const [categoryFilter, setCategoryFilter] = useState("all");
  const [sortOrder, setSortOrder] = useState<"desc" | "asc">("desc");
  const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set());

  const { data: posts, isLoading } = useQuery({
    queryKey: ["admin-posts", sortOrder],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("posts")
        .select("*, categories(name)")
        .is("deleted_at", null)
        .order("title", { ascending: sortOrder === "asc" });
      if (error) throw error;
      return data;
    },
  });

  const { data: categories } = useQuery({
    queryKey: ["categories-list"],
    queryFn: async () => {
      const { data } = await supabase.from("categories").select("id, name, type, parent_id").is("deleted_at", null).order("name");
      return data ?? [];
    },
  });

  const saveMutation = useMutation({
    mutationFn: async () => {
      const slug = form.slug || form.title.toLowerCase().replace(/\s+/g, "-").replace(/[^\u0980-\u09FF\w-]/g, "");
      const payload = { ...form, slug, category_id: form.category_id || null };
      if (editing) {
        const { error } = await supabase.from("posts").update(payload).eq("id", editing.id);
        if (error) throw error;
      } else {
        const { error } = await supabase.from("posts").insert(payload);
        if (error) throw error;
      }
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["admin-posts"] });
      toast.success(editing ? "আপডেট হয়েছে" : "পোস্ট তৈরি হয়েছে");
      resetForm();
    },
    onError: (err: any) => toast.error(err.message),
  });

  const deleteMutation = useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase.from("posts").update({ deleted_at: new Date().toISOString() }).eq("id", id);
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["admin-posts"] });
      toast.success("বিনে সরানো হয়েছে");
    },
  });

  // Bulk delete
  const bulkDelete = useMutation({
    mutationFn: async (ids: string[]) => {
      const { error } = await supabase.from("posts").update({ deleted_at: new Date().toISOString() }).in("id", ids);
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["admin-posts"] });
      setSelectedIds(new Set());
      toast.success("সিলেক্টেড পোস্ট বিনে সরানো হয়েছে");
    },
  });

  // Permanent delete
  const permanentDelete = useMutation({
    mutationFn: async (ids: string[]) => {
      const { error } = await supabase.from("posts").delete().in("id", ids);
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["admin-posts"] });
      setSelectedIds(new Set());
      toast.success("স্থায়ীভাবে মুছে ফেলা হয়েছে");
    },
  });

  // Reset content (clear content, keep title/category)
  const resetContent = useMutation({
    mutationFn: async (ids: string[]) => {
      const { error } = await supabase.from("posts").update({ content: null, excerpt: null, featured_image: null, status: "draft" as const }).in("id", ids);
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["admin-posts"] });
      setSelectedIds(new Set());
      toast.success("কন্টেন্ট রিসেট হয়েছে");
    },
  });

  const publishBlogger = async (post: Post) => {
    toast.info("Blogger-এ পাবলিশ হচ্ছে...");
    const { data, error } = await supabase.functions.invoke("publish-blogger", {
      body: { title: post.title, content: post.content || post.excerpt || "" },
    });
    if (error || data?.error) toast.error(data?.error || "Blogger পাবলিশ ব্যর্থ");
    else toast.success("Blogger-এ পাবলিশ হয়েছে!");
  };

  const [isBulkPublishing, setIsBulkPublishing] = useState(false);

  const bulkPublishBlogger = async () => {
    const selected = (posts ?? []).filter(p => selectedIds.has(p.id));
    if (selected.length === 0) return toast.error("পোস্ট সিলেক্ট করুন");
    if (!confirm(`${selected.length}টি পোস্ট Blogger-এ পাবলিশ করবেন?`)) return;
    setIsBulkPublishing(true);
    let success = 0, fail = 0;
    for (const post of selected) {
      try {
        const { data, error } = await supabase.functions.invoke("publish-blogger", {
          body: { title: post.title, content: post.content || post.excerpt || "" },
        });
        if (error || data?.error) fail++; else success++;
      } catch { fail++; }
    }
    setIsBulkPublishing(false);
    setSelectedIds(new Set());
    toast.success(`Blogger: ${success} সফল, ${fail} ব্যর্থ`);
  };

  const sharePost = async (post: Post) => {
    const url = `${window.location.origin}/post/${post.slug}`;
    if (navigator.share) {
      try { await navigator.share({ title: post.title, text: post.excerpt || "", url }); } catch { /* cancelled */ }
    } else {
      await navigator.clipboard.writeText(url);
      toast.success("লিংক কপি হয়েছে!");
    }
  };

  const resetForm = () => {
    setForm({ title: "", slug: "", content: "", excerpt: "", featured_image: "", category_id: "", status: "draft", is_featured: false });
    setEditing(null);
    setShowForm(false);
  };

  const startEdit = (post: Post) => {
    setForm({
      title: post.title, slug: post.slug, content: post.content || "",
      excerpt: post.excerpt || "", featured_image: post.featured_image || "",
      category_id: post.category_id || "", status: post.status, is_featured: post.is_featured,
    });
    setEditing(post);
    setShowForm(true);
  };

  const filtered = (posts ?? []).filter(p => {
    if (search && !p.title.toLowerCase().includes(search.toLowerCase())) return false;
    if (statusFilter !== "all" && p.status !== statusFilter) return false;
    if (categoryFilter !== "all" && p.category_id !== categoryFilter) return false;
    return true;
  });

  const toggleSelect = (id: string) => {
    setSelectedIds(prev => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id); else next.add(id);
      return next;
    });
  };

  const toggleSelectAll = () => {
    if (selectedIds.size === filtered.length) setSelectedIds(new Set());
    else setSelectedIds(new Set(filtered.map(p => p.id)));
  };

  return (
    <div>
      <div className="flex items-center justify-between mb-4 flex-wrap gap-2">
        <h1 className="font-heading font-bold text-2xl">📝 কন্টেন্ট হাব</h1>
        <div className="flex gap-2 flex-wrap">
          {selectedIds.size > 0 && (
            <>
              <button onClick={() => { if (confirm(`${selectedIds.size}টি পোস্ট রিসেট করবেন?`)) resetContent.mutate(Array.from(selectedIds)); }}
                className="flex items-center gap-1.5 px-3 py-2 rounded-lg bg-amber-600 text-white text-sm font-medium">
                <RotateCcw className="h-3.5 w-3.5" /> রিসেট ({selectedIds.size})
              </button>
              <button onClick={() => { if (confirm(`${selectedIds.size}টি পোস্ট বিনে সরাবেন?`)) bulkDelete.mutate(Array.from(selectedIds)); }}
                className="flex items-center gap-1.5 px-3 py-2 rounded-lg bg-destructive text-destructive-foreground text-sm font-medium">
                <Trash2 className="h-3.5 w-3.5" /> ডিলিট ({selectedIds.size})
              </button>
              <button onClick={bulkPublishBlogger} disabled={isBulkPublishing}
                className="flex items-center gap-1.5 px-3 py-2 rounded-lg bg-orange-600 text-white text-sm font-medium disabled:opacity-50">
                <Globe className="h-3.5 w-3.5" /> {isBulkPublishing ? "..." : `Blogger (${selectedIds.size})`}
              </button>
            </>
          )}
          <button onClick={() => { resetForm(); setShowForm(!showForm); }}
            className="flex items-center gap-1.5 px-4 py-2 rounded-lg bg-primary text-primary-foreground text-sm font-medium">
            <Plus className="h-4 w-4" /> নতুন পোস্ট
          </button>
        </div>
      </div>

      {/* Search & filter */}
      <div className="flex gap-2 mb-4 flex-wrap">
        <div className="relative flex-1 min-w-[180px]">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
          <input value={search} onChange={e => setSearch(e.target.value)} placeholder="খুঁজুন..."
            className="w-full pl-9 pr-3 py-2 rounded-lg border border-input bg-background text-sm" />
        </div>
        <select value={statusFilter} onChange={e => setStatusFilter(e.target.value)}
          className="px-3 py-2 rounded-lg border border-input bg-background text-sm">
          <option value="all">সব স্ট্যাটাস</option>
          <option value="draft">ড্রাফট</option>
          <option value="published">প্রকাশিত</option>
          <option value="archived">আর্কাইভ</option>
        </select>
        <select value={categoryFilter} onChange={e => setCategoryFilter(e.target.value)}
          className="px-3 py-2 rounded-lg border border-input bg-background text-sm">
          <option value="all">সব ক্যাটাগরি</option>
          {categories?.map(c => <option key={c.id} value={c.id}>{c.parent_id ? "└─ " : ""}{c.name}</option>)}
        </select>
        <button onClick={() => setSortOrder(o => o === "desc" ? "asc" : "desc")}
          className="px-3 py-2 rounded-lg border border-input bg-background text-sm flex items-center gap-1">
          <Filter className="h-3.5 w-3.5" />
          {sortOrder === "asc" ? "ক→হ" : "হ→ক"}
        </button>
      </div>

      {showForm && (
        <div className="bg-card rounded-xl border border-border p-5 mb-5 animate-slide-up">
          <h2 className="font-heading font-semibold mb-4">{editing ? "পোস্ট সম্পাদনা" : "নতুন পোস্ট"}</h2>
          <div className="grid md:grid-cols-2 gap-4">
            <div>
              <label className="text-xs font-medium text-muted-foreground">শিরোনাম *</label>
              <input value={form.title} onChange={e => setForm(p => ({ ...p, title: e.target.value }))}
                className="w-full mt-1 px-3 py-2 rounded-lg border border-input bg-background text-sm" />
            </div>
            <div>
              <label className="text-xs font-medium text-muted-foreground">ক্যাটাগরি</label>
              <select value={form.category_id} onChange={e => setForm(p => ({ ...p, category_id: e.target.value }))}
                className="w-full mt-1 px-3 py-2 rounded-lg border border-input bg-background text-sm">
                <option value="">নির্বাচন করুন</option>
                {categories?.map(c => <option key={c.id} value={c.id}>{c.parent_id ? "└─ " : ""}{c.name} ({c.type})</option>)}
              </select>
            </div>
            <div className="md:col-span-2">
              <label className="text-xs font-medium text-muted-foreground">সারসংক্ষেপ</label>
              <input value={form.excerpt} onChange={e => setForm(p => ({ ...p, excerpt: e.target.value }))}
                className="w-full mt-1 px-3 py-2 rounded-lg border border-input bg-background text-sm" />
            </div>
            <div className="md:col-span-2">
              <label className="text-xs font-medium text-muted-foreground">কন্টেন্ট</label>
              <textarea value={form.content} onChange={e => setForm(p => ({ ...p, content: e.target.value }))} rows={8}
                className="w-full mt-1 px-3 py-2 rounded-lg border border-input bg-background text-sm" />
            </div>
            <div>
              <label className="text-xs font-medium text-muted-foreground">ছবি URL</label>
              <input value={form.featured_image} onChange={e => setForm(p => ({ ...p, featured_image: e.target.value }))}
                className="w-full mt-1 px-3 py-2 rounded-lg border border-input bg-background text-sm" />
            </div>
            <div className="flex items-center gap-4">
              <select value={form.status} onChange={e => setForm(p => ({ ...p, status: e.target.value as any }))}
                className="px-3 py-2 rounded-lg border border-input bg-background text-sm">
                <option value="draft">ড্রাফট</option>
                <option value="published">প্রকাশিত</option>
                <option value="archived">আর্কাইভ</option>
              </select>
              <label className="flex items-center gap-2 text-sm">
                <input type="checkbox" checked={form.is_featured} onChange={e => setForm(p => ({ ...p, is_featured: e.target.checked }))} />
                ফিচার্ড
              </label>
            </div>
          </div>
          <div className="flex gap-2 mt-4">
            <button onClick={() => saveMutation.mutate()} disabled={saveMutation.isPending || !form.title}
              className="px-4 py-2 rounded-lg bg-primary text-primary-foreground text-sm font-medium disabled:opacity-50">
              {saveMutation.isPending ? "সেভ হচ্ছে..." : "সেভ"}
            </button>
            <button onClick={resetForm} className="px-4 py-2 rounded-lg bg-muted text-sm">বাতিল</button>
          </div>
        </div>
      )}

      <div className="bg-card rounded-xl border border-border overflow-hidden">
        <div className="flex items-center justify-between px-3 py-2 border-b border-border bg-muted/30">
          <button onClick={toggleSelectAll} className="flex items-center gap-1.5 text-xs text-muted-foreground hover:text-foreground">
            {selectedIds.size === filtered.length && filtered.length > 0
              ? <CheckSquare className="h-4 w-4 text-primary" />
              : <Square className="h-4 w-4" />}
            {selectedIds.size > 0 ? `${selectedIds.size}টি সিলেক্টেড` : "সব সিলেক্ট"}
          </button>
          <span className="text-xs text-muted-foreground">{filtered.length} পোস্ট</span>
        </div>

        {isLoading ? (
          <p className="p-4 text-sm text-muted-foreground">লোড হচ্ছে...</p>
        ) : filtered.length > 0 ? (
          <div className="divide-y divide-border">
            {filtered.map(post => (
              <div key={post.id} className="p-3 sm:p-4 flex items-center gap-2 hover:bg-muted/50 transition-colors">
                <button onClick={() => toggleSelect(post.id)} className="shrink-0">
                  {selectedIds.has(post.id)
                    ? <CheckSquare className="h-4 w-4 text-primary" />
                    : <Square className="h-4 w-4 text-muted-foreground" />}
                </button>
                <div className="flex-1 min-w-0">
                  <h3 className="font-medium text-sm truncate">{post.title}</h3>
                  <div className="flex items-center gap-2 mt-1">
                    <span className={`text-[10px] px-1.5 py-0.5 rounded-full ${
                      post.status === "published" ? "tag-blog" : post.status === "draft" ? "tag-news" : "tag-directory"
                    }`}>
                      {post.status === "published" ? "প্রকাশিত" : post.status === "draft" ? "ড্রাফট" : "আর্কাইভ"}
                    </span>
                    {(post as any).categories?.name && (
                      <span className="text-[10px] text-muted-foreground">{(post as any).categories.name}</span>
                    )}
                  </div>
                </div>
                <div className="flex gap-0.5 shrink-0">
                  <button onClick={() => sharePost(post)} className="p-1.5 hover:bg-muted rounded" title="শেয়ার"><Share2 className="h-3.5 w-3.5" /></button>
                  <button onClick={() => publishBlogger(post)} className="p-1.5 hover:bg-muted rounded" title="Blogger"><Globe className="h-3.5 w-3.5" /></button>
                  <button onClick={() => startEdit(post)} className="p-1.5 hover:bg-muted rounded" title="সম্পাদনা"><Pencil className="h-3.5 w-3.5" /></button>
                  <button onClick={() => { if (confirm("বিনে সরাবেন?")) deleteMutation.mutate(post.id); }}
                    className="p-1.5 hover:bg-destructive/10 rounded text-destructive" title="মুছুন"><Trash2 className="h-3.5 w-3.5" /></button>
                </div>
              </div>
            ))}
          </div>
        ) : (
          <p className="p-4 text-sm text-muted-foreground">কোনো পোস্ট নেই</p>
        )}
      </div>
    </div>
  );
}
