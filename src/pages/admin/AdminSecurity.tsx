import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import { Shield, Lock, Unlock, Trash2, AlertTriangle, Archive, RotateCcw, Clock } from "lucide-react";

type TabType = "protection" | "archive" | "bin";

export default function AdminSecurity() {
  const queryClient = useQueryClient();
  const [tab, setTab] = useState<TabType>("protection");
  const [confirmDelete, setConfirmDelete] = useState<string | null>(null);
  const [confirmCode, setConfirmCode] = useState("");

  const { data: posts } = useQuery({
    queryKey: ["security-posts"],
    queryFn: async () => {
      const { data } = await supabase
        .from("posts")
        .select("id, title, status, is_locked, deleted_at")
        .order("created_at", { ascending: false })
        .limit(100);
      return data ?? [];
    },
  });

  const { data: categories } = useQuery({
    queryKey: ["security-categories"],
    queryFn: async () => {
      const { data } = await supabase
        .from("categories")
        .select("id, name, type, is_locked, deleted_at")
        .order("name");
      return data ?? [];
    },
  });

  const invalidateAll = () => {
    queryClient.invalidateQueries({ queryKey: ["security-posts"] });
    queryClient.invalidateQueries({ queryKey: ["security-categories"] });
    queryClient.invalidateQueries({ queryKey: ["admin-posts"] });
  };

  const toggleLock = useMutation({
    mutationFn: async ({ table, id, locked }: { table: "posts" | "categories"; id: string; locked: boolean }) => {
      const { error } = await supabase.from(table).update({ is_locked: locked } as any).eq("id", id);
      if (error) throw error;
    },
    onSuccess: () => { invalidateAll(); toast.success("লক স্ট্যাটাস আপডেট হয়েছে"); },
  });

  const archivePost = useMutation({
    mutationFn: async ({ id }: { id: string }) => {
      const { error } = await supabase.from("posts").update({ status: "archived" as any }).eq("id", id);
      if (error) throw error;
    },
    onSuccess: () => { invalidateAll(); toast.success("আর্কাইভ হয়েছে"); },
  });

  const softDelete = useMutation({
    mutationFn: async ({ table, id }: { table: "posts" | "categories"; id: string }) => {
      const { error } = await supabase.from(table).update({ deleted_at: new Date().toISOString() } as any).eq("id", id);
      if (error) throw error;
    },
    onSuccess: () => { invalidateAll(); setConfirmDelete(null); setConfirmCode(""); toast.success("বিন-এ সরানো হয়েছে"); },
  });

  const restore = useMutation({
    mutationFn: async ({ table, id }: { table: "posts" | "categories"; id: string }) => {
      const { error } = await supabase.from(table).update({ deleted_at: null } as any).eq("id", id);
      if (error) throw error;
    },
    onSuccess: () => { invalidateAll(); toast.success("পুনরুদ্ধার হয়েছে"); },
  });

  const permanentDelete = useMutation({
    mutationFn: async ({ table, id }: { table: "posts" | "categories"; id: string }) => {
      const { error } = await supabase.from(table).delete().eq("id", id);
      if (error) throw error;
    },
    onSuccess: () => { invalidateAll(); setConfirmDelete(null); setConfirmCode(""); toast.success("স্থায়ীভাবে মুছে ফেলা হয়েছে"); },
    onError: (e: any) => toast.error(e.message),
  });

  const activePosts = posts?.filter(p => !p.deleted_at) ?? [];
  const archivedPosts = posts?.filter(p => p.status === "archived" && !p.deleted_at) ?? [];
  const binPosts = posts?.filter(p => p.deleted_at) ?? [];
  const binCategories = categories?.filter(c => c.deleted_at) ?? [];
  const activeCategories = categories?.filter(c => !c.deleted_at) ?? [];

  const tabs = [
    { id: "protection" as TabType, label: "🛡️ প্রোটেকশন", count: activePosts.length + activeCategories.length },
    { id: "archive" as TabType, label: "📦 আর্কাইভ", count: archivedPosts.length },
    { id: "bin" as TabType, label: "🗑️ রিস্টোর বিন", count: binPosts.length + binCategories.length },
  ];

  const renderDeleteConfirm = (key: string, onConfirm: () => void) => {
    if (confirmDelete !== key) {
      return (
        <button onClick={() => setConfirmDelete(key)} className="p-1.5 rounded-lg hover:bg-destructive/10 text-destructive" title="ডিলিট">
          <Trash2 className="h-3.5 w-3.5" />
        </button>
      );
    }
    return (
      <div className="flex items-center gap-1">
        <input value={confirmCode} onChange={e => setConfirmCode(e.target.value)} placeholder="DELETE" className="w-20 px-2 py-1 text-xs border border-destructive rounded bg-background" />
        <button onClick={() => { if (confirmCode === "DELETE") onConfirm(); else toast.error("DELETE লিখুন"); }} className="px-2 py-1 text-xs bg-destructive text-destructive-foreground rounded">✓</button>
        <button onClick={() => { setConfirmDelete(null); setConfirmCode(""); }} className="px-1 py-1 text-xs">✕</button>
      </div>
    );
  };

  return (
    <div>
      <div className="flex items-center gap-3 mb-6">
        <div className="p-2 rounded-lg bg-primary/10"><Shield className="h-5 w-5 text-primary" /></div>
        <div>
          <h1 className="font-heading font-bold text-xl">🔒 সিকিউরিটি ও প্রোটেকশন</h1>
          <p className="text-xs text-muted-foreground">লক, আর্কাইভ, রিস্টোর বিন — সব এক জায়গায়</p>
        </div>
      </div>

      {/* Tabs */}
      <div className="flex gap-1 mb-4 bg-muted rounded-lg p-1">
        {tabs.map(t => (
          <button key={t.id} onClick={() => setTab(t.id)} className={`flex-1 text-sm py-2 rounded-md font-medium transition-colors ${tab === t.id ? "bg-card shadow-sm text-foreground" : "text-muted-foreground hover:text-foreground"}`}>
            {t.label} <span className="text-xs opacity-70">({t.count})</span>
          </button>
        ))}
      </div>

      {/* Protection Tab */}
      {tab === "protection" && (
        <div className="space-y-4">
          <div className="bg-card rounded-xl border border-border">
            <div className="px-4 py-3 border-b border-border"><h2 className="font-heading font-semibold text-sm">📝 পোস্ট প্রোটেকশন</h2></div>
            <div className="divide-y divide-border max-h-80 overflow-y-auto">
              {activePosts.map(post => (
                <div key={post.id} className="flex items-center justify-between px-4 py-2 hover:bg-muted/50">
                  <div className="flex-1 min-w-0">
                    <p className="text-sm truncate">{post.title}</p>
                    <span className={`text-xs ${post.status === "published" ? "text-green-600" : "text-muted-foreground"}`}>
                      {post.status === "published" ? "প্রকাশিত" : post.status === "draft" ? "ড্রাফট" : "আর্কাইভ"}
                    </span>
                  </div>
                  <div className="flex items-center gap-1 shrink-0">
                    <button onClick={() => toggleLock.mutate({ table: "posts", id: post.id, locked: !post.is_locked })} className={`p-1.5 rounded-lg transition-colors ${post.is_locked ? "bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-400" : "hover:bg-muted text-muted-foreground"}`}>
                      {post.is_locked ? <Lock className="h-3.5 w-3.5" /> : <Unlock className="h-3.5 w-3.5" />}
                    </button>
                    {!post.is_locked && (
                      <>
                        <button onClick={() => archivePost.mutate({ id: post.id })} className="p-1.5 rounded-lg hover:bg-accent/10 text-muted-foreground" title="আর্কাইভ"><Archive className="h-3.5 w-3.5" /></button>
                        {renderDeleteConfirm(`post_${post.id}`, () => softDelete.mutate({ table: "posts", id: post.id }))}
                      </>
                    )}
                    {post.is_locked && <span className="text-xs text-green-600 px-2">🔒</span>}
                  </div>
                </div>
              ))}
            </div>
          </div>

          <div className="bg-card rounded-xl border border-border">
            <div className="px-4 py-3 border-b border-border"><h2 className="font-heading font-semibold text-sm">📂 ক্যাটাগরি প্রোটেকশন</h2></div>
            <div className="divide-y divide-border max-h-80 overflow-y-auto">
              {activeCategories.map(cat => (
                <div key={cat.id} className="flex items-center justify-between px-4 py-2 hover:bg-muted/50">
                  <div className="flex-1 min-w-0">
                    <p className="text-sm truncate">{cat.name}</p>
                    <span className="text-xs text-muted-foreground">{cat.type}</span>
                  </div>
                  <div className="flex items-center gap-1 shrink-0">
                    <button onClick={() => toggleLock.mutate({ table: "categories", id: cat.id, locked: !cat.is_locked })} className={`p-1.5 rounded-lg transition-colors ${cat.is_locked ? "bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-400" : "hover:bg-muted text-muted-foreground"}`}>
                      {cat.is_locked ? <Lock className="h-3.5 w-3.5" /> : <Unlock className="h-3.5 w-3.5" />}
                    </button>
                    {!cat.is_locked && renderDeleteConfirm(`cat_${cat.id}`, () => softDelete.mutate({ table: "categories", id: cat.id }))}
                    {cat.is_locked && <span className="text-xs text-green-600 px-2">🔒</span>}
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>
      )}

      {/* Archive Tab */}
      {tab === "archive" && (
        <div className="bg-card rounded-xl border border-border">
          <div className="px-4 py-3 border-b border-border"><h2 className="font-heading font-semibold text-sm flex items-center gap-2"><Archive className="h-4 w-4" /> আর্কাইভড পোস্ট</h2></div>
          {archivedPosts.length === 0 ? (
            <p className="p-4 text-sm text-muted-foreground">কোনো আর্কাইভ আইটেম নেই</p>
          ) : (
            <div className="divide-y divide-border">
              {archivedPosts.map(post => (
                <div key={post.id} className="flex items-center justify-between px-4 py-2 hover:bg-muted/50">
                  <p className="text-sm truncate flex-1">{post.title}</p>
                  <button onClick={() => {
                    supabase.from("posts").update({ status: "draft" as any }).eq("id", post.id).then(() => { invalidateAll(); toast.success("ড্রাফটে ফেরত"); });
                  }} className="text-xs px-3 py-1 rounded bg-primary/10 text-primary flex items-center gap-1">
                    <RotateCcw className="h-3 w-3" /> পুনরুদ্ধার
                  </button>
                </div>
              ))}
            </div>
          )}
        </div>
      )}

      {/* Restore Bin Tab */}
      {tab === "bin" && (
        <div className="space-y-4">
          {binPosts.length === 0 && binCategories.length === 0 ? (
            <div className="bg-card rounded-xl border border-border p-8 text-center">
              <Trash2 className="h-8 w-8 text-muted-foreground mx-auto mb-2" />
              <p className="text-sm text-muted-foreground">রিস্টোর বিন খালি</p>
            </div>
          ) : (
            <>
              {binPosts.length > 0 && (
                <div className="bg-card rounded-xl border border-border">
                  <div className="px-4 py-3 border-b border-border"><h2 className="font-heading font-semibold text-sm">🗑️ মুছে ফেলা পোস্ট</h2></div>
                  <div className="divide-y divide-border">
                    {binPosts.map(post => (
                      <div key={post.id} className="flex items-center justify-between px-4 py-2 hover:bg-muted/50">
                        <div className="flex-1 min-w-0">
                          <p className="text-sm truncate line-through opacity-60">{post.title}</p>
                          <span className="text-xs text-muted-foreground flex items-center gap-1"><Clock className="h-3 w-3" /> {new Date(post.deleted_at!).toLocaleDateString("bn-BD")}</span>
                        </div>
                        <div className="flex items-center gap-1">
                          <button onClick={() => restore.mutate({ table: "posts", id: post.id })} className="text-xs px-2 py-1 rounded bg-primary/10 text-primary flex items-center gap-1"><RotateCcw className="h-3 w-3" /> ফেরত</button>
                          {renderDeleteConfirm(`perm_post_${post.id}`, () => permanentDelete.mutate({ table: "posts", id: post.id }))}
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              )}
              {binCategories.length > 0 && (
                <div className="bg-card rounded-xl border border-border">
                  <div className="px-4 py-3 border-b border-border"><h2 className="font-heading font-semibold text-sm">🗑️ মুছে ফেলা ক্যাটাগরি</h2></div>
                  <div className="divide-y divide-border">
                    {binCategories.map(cat => (
                      <div key={cat.id} className="flex items-center justify-between px-4 py-2 hover:bg-muted/50">
                        <p className="text-sm truncate line-through opacity-60 flex-1">{cat.name}</p>
                        <div className="flex items-center gap-1">
                          <button onClick={() => restore.mutate({ table: "categories", id: cat.id })} className="text-xs px-2 py-1 rounded bg-primary/10 text-primary flex items-center gap-1"><RotateCcw className="h-3 w-3" /> ফেরত</button>
                          {renderDeleteConfirm(`perm_cat_${cat.id}`, () => permanentDelete.mutate({ table: "categories", id: cat.id }))}
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              )}
            </>
          )}
        </div>
      )}

      <div className="mt-4 p-4 rounded-xl bg-muted/50 border border-border">
        <div className="flex items-start gap-2">
          <AlertTriangle className="h-4 w-4 text-amber-500 mt-0.5 shrink-0" />
          <div>
            <p className="text-sm font-medium">সতর্কতা</p>
            <p className="text-xs text-muted-foreground mt-1">
              🔒 লক = ডিলিট অসম্ভব। 📦 আর্কাইভ = লুকানো কিন্তু সেফ। 🗑️ বিন = ফেরত আনা যাবে অথবা স্থায়ীভাবে মুছুন (DELETE টাইপ করুন)।
            </p>
          </div>
        </div>
      </div>
    </div>
  );
}
