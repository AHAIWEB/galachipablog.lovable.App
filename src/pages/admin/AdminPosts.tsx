import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import { Plus, Pencil, Trash2, Send } from "lucide-react";
import type { Tables } from "@/integrations/supabase/types";

type Post = Tables<"posts">;

export default function AdminPosts() {
  const queryClient = useQueryClient();
  const [showForm, setShowForm] = useState(false);
  const [editing, setEditing] = useState<Post | null>(null);
  const [form, setForm] = useState({ title: "", slug: "", content: "", excerpt: "", featured_image: "", category_id: "", status: "draft" as "draft" | "published" | "archived", is_featured: false });

  const { data: posts, isLoading } = useQuery({
    queryKey: ["admin-posts"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("posts")
        .select("*, categories(name)")
        .order("created_at", { ascending: false });
      if (error) throw error;
      return data;
    },
  });

  const { data: categories } = useQuery({
    queryKey: ["categories-list"],
    queryFn: async () => {
      const { data } = await supabase.from("categories").select("id, name, type").order("name");
      return data ?? [];
    },
  });

  const saveMutation = useMutation({
    mutationFn: async () => {
      const slug = form.slug || form.title.toLowerCase().replace(/\s+/g, "-").replace(/[^\w-]/g, "");
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
      const { error } = await supabase.from("posts").delete().eq("id", id);
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["admin-posts"] });
      toast.success("মুছে ফেলা হয়েছে");
    },
  });

  const resetForm = () => {
    setForm({ title: "", slug: "", content: "", excerpt: "", featured_image: "", category_id: "", status: "draft", is_featured: false });
    setEditing(null);
    setShowForm(false);
  };

  const startEdit = (post: Post) => {
    setForm({
      title: post.title,
      slug: post.slug,
      content: post.content || "",
      excerpt: post.excerpt || "",
      featured_image: post.featured_image || "",
      category_id: post.category_id || "",
      status: post.status,
      is_featured: post.is_featured,
    });
    setEditing(post);
    setShowForm(true);
  };

  return (
    <div>
      <div className="flex items-center justify-between mb-6">
        <h1 className="font-heading font-bold text-2xl">📝 কন্টেন্ট হাব</h1>
        <button
          onClick={() => { resetForm(); setShowForm(!showForm); }}
          className="flex items-center gap-1.5 px-4 py-2 rounded-lg bg-primary text-primary-foreground text-sm font-medium"
        >
          <Plus className="h-4 w-4" /> নতুন পোস্ট
        </button>
      </div>

      {showForm && (
        <div className="bg-card rounded-xl border border-border p-5 mb-6 animate-slide-up">
          <h2 className="font-heading font-semibold mb-4">{editing ? "পোস্ট সম্পাদনা" : "নতুন পোস্ট"}</h2>
          <div className="grid md:grid-cols-2 gap-4">
            <div>
              <label className="text-xs font-medium text-muted-foreground">শিরোনাম *</label>
              <input value={form.title} onChange={e => setForm(p => ({ ...p, title: e.target.value }))} className="w-full mt-1 px-3 py-2 rounded-lg border border-input bg-background text-sm focus:outline-none focus:ring-2 focus:ring-ring" />
            </div>
            <div>
              <label className="text-xs font-medium text-muted-foreground">ক্যাটাগরি</label>
              <select value={form.category_id} onChange={e => setForm(p => ({ ...p, category_id: e.target.value }))} className="w-full mt-1 px-3 py-2 rounded-lg border border-input bg-background text-sm focus:outline-none focus:ring-2 focus:ring-ring">
                <option value="">নির্বাচন করুন</option>
                {categories?.map(c => <option key={c.id} value={c.id}>{c.name} ({c.type})</option>)}
              </select>
            </div>
            <div className="md:col-span-2">
              <label className="text-xs font-medium text-muted-foreground">সারসংক্ষেপ</label>
              <input value={form.excerpt} onChange={e => setForm(p => ({ ...p, excerpt: e.target.value }))} className="w-full mt-1 px-3 py-2 rounded-lg border border-input bg-background text-sm focus:outline-none focus:ring-2 focus:ring-ring" />
            </div>
            <div className="md:col-span-2">
              <label className="text-xs font-medium text-muted-foreground">কন্টেন্ট</label>
              <textarea value={form.content} onChange={e => setForm(p => ({ ...p, content: e.target.value }))} rows={8} className="w-full mt-1 px-3 py-2 rounded-lg border border-input bg-background text-sm focus:outline-none focus:ring-2 focus:ring-ring" />
            </div>
            <div>
              <label className="text-xs font-medium text-muted-foreground">ছবি URL</label>
              <input value={form.featured_image} onChange={e => setForm(p => ({ ...p, featured_image: e.target.value }))} className="w-full mt-1 px-3 py-2 rounded-lg border border-input bg-background text-sm focus:outline-none focus:ring-2 focus:ring-ring" />
            </div>
            <div className="flex items-center gap-4">
              <label className="flex items-center gap-2 text-sm">
                <select value={form.status} onChange={e => setForm(p => ({ ...p, status: e.target.value as any }))} className="px-3 py-2 rounded-lg border border-input bg-background text-sm">
                  <option value="draft">ড্রাফট</option>
                  <option value="published">প্রকাশিত</option>
                  <option value="archived">আর্কাইভ</option>
                </select>
              </label>
              <label className="flex items-center gap-2 text-sm">
                <input type="checkbox" checked={form.is_featured} onChange={e => setForm(p => ({ ...p, is_featured: e.target.checked }))} />
                ফিচার্ড
              </label>
            </div>
          </div>
          <div className="flex gap-2 mt-4">
            <button onClick={() => saveMutation.mutate()} disabled={saveMutation.isPending || !form.title} className="px-4 py-2 rounded-lg bg-primary text-primary-foreground text-sm font-medium disabled:opacity-50">
              {saveMutation.isPending ? "সেভ হচ্ছে..." : "সেভ করুন"}
            </button>
            <button onClick={resetForm} className="px-4 py-2 rounded-lg bg-muted text-foreground text-sm">বাতিল</button>
          </div>
        </div>
      )}

      <div className="bg-card rounded-xl border border-border overflow-hidden">
        {isLoading ? (
          <p className="p-4 text-sm text-muted-foreground">লোড হচ্ছে...</p>
        ) : posts && posts.length > 0 ? (
          <table className="w-full text-sm">
            <thead className="bg-muted">
              <tr>
                <th className="text-left px-4 py-2 font-medium">শিরোনাম</th>
                <th className="text-left px-4 py-2 font-medium hidden md:table-cell">ক্যাটাগরি</th>
                <th className="text-left px-4 py-2 font-medium">স্ট্যাটাস</th>
                <th className="px-4 py-2"></th>
              </tr>
            </thead>
            <tbody className="divide-y divide-border">
              {posts.map(post => (
                <tr key={post.id} className="hover:bg-muted/50">
                  <td className="px-4 py-2">{post.title}</td>
                  <td className="px-4 py-2 hidden md:table-cell text-muted-foreground">
                    {(post as any).categories?.name || "—"}
                  </td>
                  <td className="px-4 py-2">
                    <span className={`text-xs px-2 py-0.5 rounded-full ${
                      post.status === "published" ? "tag-blog" : post.status === "draft" ? "tag-news" : "tag-directory"
                    }`}>
                      {post.status === "published" ? "প্রকাশিত" : post.status === "draft" ? "ড্রাফট" : "আর্কাইভ"}
                    </span>
                  </td>
                  <td className="px-4 py-2 text-right whitespace-nowrap">
                    <button
                      onClick={async () => {
                        toast.info("Blogger-এ পাবলিশ হচ্ছে...");
                        const { data, error } = await supabase.functions.invoke("publish-blogger", {
                          body: { title: post.title, content: post.content || post.excerpt || "" },
                        });
                        if (error || data?.error) {
                          toast.error(data?.error || "Blogger পাবলিশ ব্যর্থ");
                        } else {
                          toast.success("Blogger-এ পাবলিশ হয়েছে!");
                        }
                      }}
                      className="p-1.5 hover:bg-muted rounded" title="Blogger-এ পাবলিশ"
                    >
                      <Send className="h-3.5 w-3.5" />
                    </button>
                    <button onClick={() => startEdit(post)} className="p-1.5 hover:bg-muted rounded"><Pencil className="h-3.5 w-3.5" /></button>
                    <button
                      onClick={() => {
                        if (confirm("নিশ্চিত? এটি মুছে ফেলা হবে!")) deleteMutation.mutate(post.id);
                      }}
                      className="p-1.5 hover:bg-destructive/10 rounded text-destructive"
                    >
                      <Trash2 className="h-3.5 w-3.5" />
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        ) : (
          <p className="p-4 text-sm text-muted-foreground">এখনো কোনো পোস্ট নেই</p>
        )}
      </div>
    </div>
  );
}
