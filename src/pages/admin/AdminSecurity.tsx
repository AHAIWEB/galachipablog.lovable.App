import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import { Shield, Lock, Unlock, Trash2, AlertTriangle } from "lucide-react";

type ProtectedItem = {
  table: string;
  id: string;
  title: string;
  locked: boolean;
};

export default function AdminSecurity() {
  const queryClient = useQueryClient();
  const [confirmDelete, setConfirmDelete] = useState<string | null>(null);
  const [confirmCode, setConfirmCode] = useState("");

  // Fetch posts and categories with lock status from site_settings
  const { data: lockSettings } = useQuery({
    queryKey: ["lock-settings"],
    queryFn: async () => {
      const { data } = await supabase
        .from("site_settings")
        .select("key, value")
        .like("key", "lock_%");
      const map: Record<string, boolean> = {};
      data?.forEach(s => {
        map[s.key] = s.value === "true";
      });
      return map;
    },
  });

  const { data: posts } = useQuery({
    queryKey: ["security-posts"],
    queryFn: async () => {
      const { data } = await supabase.from("posts").select("id, title, status").order("created_at", { ascending: false }).limit(50);
      return data ?? [];
    },
  });

  const { data: categories } = useQuery({
    queryKey: ["security-categories"],
    queryFn: async () => {
      const { data } = await supabase.from("categories").select("id, name, type").order("name");
      return data ?? [];
    },
  });

  const toggleLock = useMutation({
    mutationFn: async ({ key, locked }: { key: string; locked: boolean }) => {
      const { data: existing } = await supabase
        .from("site_settings")
        .select("id")
        .eq("key", key)
        .maybeSingle();

      if (existing) {
        await supabase.from("site_settings").update({ value: locked ? "true" : "false" } as any).eq("key", key);
      } else {
        await supabase.from("site_settings").insert({ key, value: locked ? "true" : "false" } as any);
      }
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["lock-settings"] });
      toast.success("লক স্ট্যাটাস আপডেট হয়েছে");
    },
  });

  const safeDelete = useMutation({
    mutationFn: async ({ table, id }: { table: string; id: string }) => {
      if (table === "posts") {
        const { error } = await supabase.from("posts").delete().eq("id", id);
        if (error) throw error;
      } else if (table === "categories") {
        const { error } = await supabase.from("categories").delete().eq("id", id);
        if (error) throw error;
      }
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["security-posts"] });
      queryClient.invalidateQueries({ queryKey: ["security-categories"] });
      setConfirmDelete(null);
      setConfirmCode("");
      toast.success("সফলভাবে মুছে ফেলা হয়েছে");
    },
    onError: (e: any) => toast.error(e.message),
  });

  const isLocked = (table: string, id: string) => lockSettings?.[`lock_${table}_${id}`] === true;

  return (
    <div>
      <div className="flex items-center gap-3 mb-6">
        <div className="p-2 rounded-lg bg-primary/10">
          <Shield className="h-5 w-5 text-primary" />
        </div>
        <div>
          <h1 className="font-heading font-bold text-xl">🔒 সিকিউরিটি ও প্রোটেকশন</h1>
          <p className="text-xs text-muted-foreground">লক করলে ভুলে ডিলিট হবে না। ডিলিট করতে কনফার্মেশন কোড লাগবে।</p>
        </div>
      </div>

      {/* Posts Section */}
      <div className="bg-card rounded-xl border border-border mb-6">
        <div className="px-4 py-3 border-b border-border">
          <h2 className="font-heading font-semibold text-sm">📝 পোস্ট প্রোটেকশন</h2>
        </div>
        <div className="divide-y divide-border max-h-80 overflow-y-auto">
          {posts?.map(post => {
            const locked = isLocked("posts", post.id);
            const deleteKey = `posts_${post.id}`;
            return (
              <div key={post.id} className="flex items-center justify-between px-4 py-2 hover:bg-muted/50">
                <div className="flex-1 min-w-0">
                  <p className="text-sm truncate">{post.title}</p>
                  <span className={`text-xs ${post.status === "published" ? "text-green-600" : "text-muted-foreground"}`}>
                    {post.status === "published" ? "প্রকাশিত" : post.status === "draft" ? "ড্রাফট" : "আর্কাইভ"}
                  </span>
                </div>
                <div className="flex items-center gap-1 shrink-0">
                  <button
                    onClick={() => toggleLock.mutate({ key: `lock_posts_${post.id}`, locked: !locked })}
                    className={`p-1.5 rounded-lg transition-colors ${locked ? "bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-400" : "hover:bg-muted text-muted-foreground"}`}
                    title={locked ? "আনলক করুন" : "লক করুন"}
                  >
                    {locked ? <Lock className="h-3.5 w-3.5" /> : <Unlock className="h-3.5 w-3.5" />}
                  </button>
                  {locked ? (
                    <span className="text-xs text-green-600 px-2">🔒</span>
                  ) : confirmDelete === deleteKey ? (
                    <div className="flex items-center gap-1">
                      <input
                        value={confirmCode}
                        onChange={e => setConfirmCode(e.target.value)}
                        placeholder="DELETE"
                        className="w-20 px-2 py-1 text-xs border border-destructive rounded bg-background"
                      />
                      <button
                        onClick={() => {
                          if (confirmCode === "DELETE") {
                            safeDelete.mutate({ table: "posts", id: post.id });
                          } else {
                            toast.error("কোড ভুল! DELETE লিখুন");
                          }
                        }}
                        className="px-2 py-1 text-xs bg-destructive text-destructive-foreground rounded"
                      >
                        ✓
                      </button>
                      <button onClick={() => { setConfirmDelete(null); setConfirmCode(""); }} className="px-1 py-1 text-xs">✕</button>
                    </div>
                  ) : (
                    <button
                      onClick={() => setConfirmDelete(deleteKey)}
                      className="p-1.5 rounded-lg hover:bg-destructive/10 text-destructive"
                      title="ডিলিট"
                    >
                      <Trash2 className="h-3.5 w-3.5" />
                    </button>
                  )}
                </div>
              </div>
            );
          })}
        </div>
      </div>

      {/* Categories Section */}
      <div className="bg-card rounded-xl border border-border">
        <div className="px-4 py-3 border-b border-border">
          <h2 className="font-heading font-semibold text-sm">📂 ক্যাটাগরি প্রোটেকশন</h2>
        </div>
        <div className="divide-y divide-border max-h-80 overflow-y-auto">
          {categories?.map(cat => {
            const locked = isLocked("categories", cat.id);
            const deleteKey = `categories_${cat.id}`;
            return (
              <div key={cat.id} className="flex items-center justify-between px-4 py-2 hover:bg-muted/50">
                <div className="flex-1 min-w-0">
                  <p className="text-sm truncate">{cat.name}</p>
                  <span className="text-xs text-muted-foreground">{cat.type}</span>
                </div>
                <div className="flex items-center gap-1 shrink-0">
                  <button
                    onClick={() => toggleLock.mutate({ key: `lock_categories_${cat.id}`, locked: !locked })}
                    className={`p-1.5 rounded-lg transition-colors ${locked ? "bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-400" : "hover:bg-muted text-muted-foreground"}`}
                  >
                    {locked ? <Lock className="h-3.5 w-3.5" /> : <Unlock className="h-3.5 w-3.5" />}
                  </button>
                  {locked ? (
                    <span className="text-xs text-green-600 px-2">🔒</span>
                  ) : confirmDelete === deleteKey ? (
                    <div className="flex items-center gap-1">
                      <input
                        value={confirmCode}
                        onChange={e => setConfirmCode(e.target.value)}
                        placeholder="DELETE"
                        className="w-20 px-2 py-1 text-xs border border-destructive rounded bg-background"
                      />
                      <button
                        onClick={() => {
                          if (confirmCode === "DELETE") safeDelete.mutate({ table: "categories", id: cat.id });
                          else toast.error("কোড ভুল!");
                        }}
                        className="px-2 py-1 text-xs bg-destructive text-destructive-foreground rounded"
                      >
                        ✓
                      </button>
                      <button onClick={() => { setConfirmDelete(null); setConfirmCode(""); }} className="px-1 py-1 text-xs">✕</button>
                    </div>
                  ) : (
                    <button
                      onClick={() => setConfirmDelete(deleteKey)}
                      className="p-1.5 rounded-lg hover:bg-destructive/10 text-destructive"
                    >
                      <Trash2 className="h-3.5 w-3.5" />
                    </button>
                  )}
                </div>
              </div>
            );
          })}
        </div>
      </div>

      <div className="mt-4 p-4 rounded-xl bg-muted/50 border border-border">
        <div className="flex items-start gap-2">
          <AlertTriangle className="h-4 w-4 text-amber-500 mt-0.5 shrink-0" />
          <div>
            <p className="text-sm font-medium">সতর্কতা</p>
            <p className="text-xs text-muted-foreground mt-1">
              লক করা আইটেম ডিলিট করা যাবে না। ডিলিট করতে প্রথমে আনলক করুন, তারপর "DELETE" টাইপ করে কনফার্ম করুন।
            </p>
          </div>
        </div>
      </div>
    </div>
  );
}
