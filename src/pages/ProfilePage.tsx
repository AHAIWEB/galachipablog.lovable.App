import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import { Navigate, Link } from "react-router-dom";
import SiteHeader from "@/components/SiteHeader";
import SiteFooter from "@/components/SiteFooter";
import { toast } from "sonner";
import { User, Pencil, Save, X, Calendar, Eye, CreditCard, FileText, LogOut } from "lucide-react";

export default function ProfilePage() {
  const { user, loading, signOut } = useAuth();
  const queryClient = useQueryClient();
  const [editing, setEditing] = useState(false);
  const [form, setForm] = useState({ display_name: "", bio: "", avatar_url: "" });

  const { data: profile } = useQuery({
    queryKey: ["my-profile", user?.id],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("profiles")
        .select("*")
        .eq("user_id", user!.id)
        .maybeSingle();
      if (error) throw error;
      if (data) {
        setForm({ display_name: data.display_name || "", bio: data.bio || "", avatar_url: data.avatar_url || "" });
      }
      return data;
    },
    enabled: !!user?.id,
  });

  const { data: myPosts = [] } = useQuery({
    queryKey: ["my-posts", user?.id],
    queryFn: async () => {
      const { data } = await supabase
        .from("posts")
        .select("id, title, slug, status, created_at, view_count, categories(name, type)")
        .eq("author_id", user!.id)
        .order("created_at", { ascending: false })
        .limit(20);
      return data ?? [];
    },
    enabled: !!user?.id,
  });

  const { data: myCards = [] } = useQuery({
    queryKey: ["my-cards", user?.id],
    queryFn: async () => {
      const { data } = await supabase
        .from("business_cards")
        .select("*")
        .eq("user_id", user!.id)
        .order("created_at", { ascending: false });
      return data ?? [];
    },
    enabled: !!user?.id,
  });

  const updateProfile = useMutation({
    mutationFn: async () => {
      const { error } = await supabase
        .from("profiles")
        .update({
          display_name: form.display_name,
          bio: form.bio,
          avatar_url: form.avatar_url,
        })
        .eq("user_id", user!.id);
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["my-profile"] });
      toast.success("প্রোফাইল আপডেট হয়েছে!");
      setEditing(false);
    },
    onError: (err: any) => toast.error(err.message),
  });

  if (loading) {
    return (
      <div className="min-h-screen flex flex-col">
        <SiteHeader />
        <main className="flex-1 flex items-center justify-center">
          <p className="text-muted-foreground font-heading">লোড হচ্ছে...</p>
        </main>
      </div>
    );
  }

  if (!user) return <Navigate to="/auth" replace />;

  const statusLabels: Record<string, string> = { pending: "অপেক্ষমাণ", approved: "অনুমোদিত", rejected: "প্রত্যাখ্যাত", draft: "ড্রাফট", published: "প্রকাশিত", archived: "আর্কাইভ" };

  return (
    <div className="min-h-screen flex flex-col">
      <SiteHeader />

      <main className="flex-1 container mx-auto px-4 py-6 max-w-4xl">
        {/* Profile Header */}
        <div className="bg-card rounded-2xl border border-border p-6 mb-6 animate-slide-up">
          <div className="flex flex-col sm:flex-row gap-5 items-start">
            {/* Avatar */}
            <div className="w-20 h-20 rounded-full bg-primary/10 flex items-center justify-center shrink-0 overflow-hidden border-2 border-primary/20">
              {profile?.avatar_url ? (
                <img src={profile.avatar_url} alt="avatar" className="w-full h-full object-cover" />
              ) : (
                <User className="h-8 w-8 text-primary" />
              )}
            </div>

            <div className="flex-1 min-w-0">
              {editing ? (
                <div className="space-y-3">
                  <div>
                    <label className="text-xs font-medium text-muted-foreground">নাম</label>
                    <input
                      value={form.display_name}
                      onChange={e => setForm(p => ({ ...p, display_name: e.target.value }))}
                      className="w-full mt-1 px-3 py-2 rounded-lg border border-input bg-background text-sm focus:outline-none focus:ring-2 focus:ring-ring"
                      placeholder="আপনার নাম"
                    />
                  </div>
                  <div>
                    <label className="text-xs font-medium text-muted-foreground">বায়ো</label>
                    <textarea
                      value={form.bio}
                      onChange={e => setForm(p => ({ ...p, bio: e.target.value }))}
                      rows={3}
                      className="w-full mt-1 px-3 py-2 rounded-lg border border-input bg-background text-sm focus:outline-none focus:ring-2 focus:ring-ring"
                      placeholder="আপনার সম্পর্কে কিছু লিখুন..."
                    />
                  </div>
                  <div>
                    <label className="text-xs font-medium text-muted-foreground">অ্যাভাটার URL</label>
                    <input
                      value={form.avatar_url}
                      onChange={e => setForm(p => ({ ...p, avatar_url: e.target.value }))}
                      className="w-full mt-1 px-3 py-2 rounded-lg border border-input bg-background text-sm focus:outline-none focus:ring-2 focus:ring-ring"
                      placeholder="https://..."
                    />
                  </div>
                  <div className="flex gap-2">
                    <button
                      onClick={() => updateProfile.mutate()}
                      disabled={updateProfile.isPending}
                      className="flex items-center gap-1.5 px-4 py-2 rounded-lg bg-primary text-primary-foreground text-sm font-medium disabled:opacity-50"
                    >
                      <Save className="h-3.5 w-3.5" />
                      {updateProfile.isPending ? "সেভ হচ্ছে..." : "সেভ করুন"}
                    </button>
                    <button onClick={() => setEditing(false)} className="flex items-center gap-1.5 px-4 py-2 rounded-lg bg-muted text-foreground text-sm">
                      <X className="h-3.5 w-3.5" /> বাতিল
                    </button>
                  </div>
                </div>
              ) : (
                <>
                  <div className="flex items-start justify-between gap-3">
                    <div>
                      <h1 className="font-heading font-bold text-xl">{profile?.display_name || user.email}</h1>
                      <p className="text-sm text-muted-foreground">{user.email}</p>
                      {profile?.bio && <p className="text-sm text-foreground/80 mt-2">{profile.bio}</p>}
                    </div>
                    <div className="flex gap-2 shrink-0">
                      <button onClick={() => setEditing(true)} className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg border border-input bg-background text-xs hover:bg-muted transition-colors">
                        <Pencil className="h-3 w-3" /> সম্পাদনা
                      </button>
                      <button onClick={signOut} className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs text-destructive hover:bg-destructive/10 transition-colors">
                        <LogOut className="h-3 w-3" /> লগআউট
                      </button>
                    </div>
                  </div>
                  <p className="text-xs text-muted-foreground mt-2">
                    যোগদান: {new Date(user.created_at).toLocaleDateString("bn-BD", { year: "numeric", month: "long", day: "numeric" })}
                  </p>
                </>
              )}
            </div>
          </div>
        </div>

        {/* Stats */}
        <div className="grid grid-cols-2 gap-3 mb-6">
          <div className="bg-card rounded-xl border border-border p-4 text-center">
            <FileText className="h-5 w-5 text-primary mx-auto mb-1" />
            <p className="font-heading font-bold text-lg">{myPosts.length}</p>
            <p className="text-xs text-muted-foreground">আমার পোস্ট</p>
          </div>
          <div className="bg-card rounded-xl border border-border p-4 text-center">
            <CreditCard className="h-5 w-5 text-secondary mx-auto mb-1" />
            <p className="font-heading font-bold text-lg">{myCards.length}</p>
            <p className="text-xs text-muted-foreground">বিজনেস কার্ড</p>
          </div>
        </div>

        {/* My Posts */}
        <div className="bg-card rounded-2xl border border-border overflow-hidden mb-6">
          <div className="px-5 py-3 border-b border-border flex items-center gap-2">
            <FileText className="h-4 w-4 text-primary" />
            <h2 className="font-heading font-semibold">আমার পোস্ট</h2>
          </div>
          {myPosts.length > 0 ? (
            <div className="divide-y divide-border">
              {myPosts.map(post => (
                <Link
                  key={post.id}
                  to={post.status === "published" ? `/post/${post.slug}` : "#"}
                  className="flex items-center justify-between px-5 py-3 hover:bg-muted/50 transition-colors"
                >
                  <div className="min-w-0">
                    <p className="text-sm font-medium truncate">{post.title}</p>
                    <div className="flex items-center gap-3 mt-1 text-xs text-muted-foreground">
                      <span className="flex items-center gap-1">
                        <Calendar className="h-3 w-3" />
                        {new Date(post.created_at).toLocaleDateString("bn-BD")}
                      </span>
                      <span className="flex items-center gap-1">
                        <Eye className="h-3 w-3" />
                        {post.view_count}
                      </span>
                      {(post as any).categories?.name && (
                        <span className={`${(post as any).categories.type === "news" ? "tag-news" : (post as any).categories.type === "blog" ? "tag-blog" : "tag-directory"}`}>
                          {(post as any).categories.name}
                        </span>
                      )}
                    </div>
                  </div>
                  <span className={`text-xs px-2 py-0.5 rounded-full shrink-0 ml-2 ${
                    post.status === "published" ? "tag-blog" : post.status === "draft" ? "tag-news" : "tag-directory"
                  }`}>
                    {statusLabels[post.status] ?? post.status}
                  </span>
                </Link>
              ))}
            </div>
          ) : (
            <p className="p-5 text-sm text-muted-foreground text-center">এখনো কোনো পোস্ট নেই</p>
          )}
        </div>

        {/* My Business Cards */}
        <div className="bg-card rounded-2xl border border-border overflow-hidden">
          <div className="px-5 py-3 border-b border-border flex items-center gap-2">
            <CreditCard className="h-4 w-4 text-secondary" />
            <h2 className="font-heading font-semibold">আমার বিজনেস কার্ড</h2>
          </div>
          {myCards.length > 0 ? (
            <div className="grid sm:grid-cols-2 gap-4 p-4">
              {myCards.map(card => (
                <div key={card.id} className="rounded-xl border border-border p-4 bg-background hover-lift">
                  <div className="flex justify-between items-start mb-2">
                    <div>
                      <h3 className="font-heading font-bold text-sm">{card.name}</h3>
                      {card.title && <p className="text-xs text-muted-foreground">{card.title}</p>}
                      {card.organization && <p className="text-xs text-muted-foreground">{card.organization}</p>}
                    </div>
                    <span className={`text-xs px-2 py-0.5 rounded-full ${
                      card.status === "approved" ? "tag-blog" : card.status === "pending" ? "tag-news" : "tag-directory"
                    }`}>
                      {statusLabels[card.status]}
                    </span>
                  </div>
                  <div className="text-xs text-muted-foreground space-y-0.5">
                    <p>📞 {card.phone}</p>
                    {card.email && <p>✉ {card.email}</p>}
                    {card.address && <p>📍 {card.address}</p>}
                  </div>
                </div>
              ))}
            </div>
          ) : (
            <p className="p-5 text-sm text-muted-foreground text-center">এখনো কোনো কার্ড নেই</p>
          )}
        </div>
      </main>

      <SiteFooter />
    </div>
  );
}
