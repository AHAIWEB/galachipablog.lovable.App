import { useState, useMemo } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import { Plus, Pencil, Trash2, Globe, Share2, Search, CheckSquare, Square, Upload, X, GripVertical, Image, Star, Copy, Rss, RefreshCw, Loader2 } from "lucide-react";
import type { Tables } from "@/integrations/supabase/types";

type Post = Tables<"posts">;

export default function AdminPosts() {
  const queryClient = useQueryClient();
  const [showForm, setShowForm] = useState(false);
  const [editing, setEditing] = useState<Post | null>(null);
  const [form, setForm] = useState({ title: "", slug: "", content: "", excerpt: "", featured_image: "", category_id: "", status: "draft" as "draft" | "published" | "archived", is_featured: false });
  const [search, setSearch] = useState("");
  const [statusFilter, setStatusFilter] = useState("all");
  const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set());
  const [inspecting, setInspecting] = useState(false);
  const [inspectResults, setInspectResults] = useState<Record<string, { verdict?: string; coverageState?: string; lastCrawlTime?: string; canonicalMatch?: boolean; error?: string }>>({});

  // Multi-image state
  const [postImages, setPostImages] = useState<{ id?: string; image_url: string; caption: string; file?: File }[]>([]);
  const [uploading, setUploading] = useState(false);

  const { data: posts, isLoading } = useQuery({
    queryKey: ["admin-posts"],
    queryFn: async () => {
      const { data, error } = await supabase.from("posts").select("*, categories(name)").is("deleted_at", null).order("created_at", { ascending: false });
      if (error) throw error;
      return data;
    },
  });

  const { data: categories } = useQuery({
    queryKey: ["categories-full-tree"],
    queryFn: async () => {
      const { data } = await supabase.from("categories").select("id, name, type, parent_id").is("deleted_at", null).order("sort_order").order("name");
      return data ?? [];
    },
  });

  const categoryTree = useMemo(() => {
    if (!categories) return [];
    const parents = categories.filter(c => !c.parent_id);
    return parents.map(p => ({ ...p, children: categories.filter(c => c.parent_id === p.id) }));
  }, [categories]);

  // Load post images when editing
  const loadPostImages = async (postId: string) => {
    const { data } = await supabase.from("post_images").select("*").eq("post_id", postId).order("sort_order");
    setPostImages((data ?? []).map(d => ({ id: d.id, image_url: d.image_url, caption: d.caption || "" })));
  };

  const handleImageUpload = async (files: FileList) => {
    const newImages: typeof postImages = [];
    for (const file of Array.from(files)) {
      const preview = URL.createObjectURL(file);
      newImages.push({ image_url: preview, caption: "", file });
    }
    setPostImages(prev => [...prev, ...newImages]);
  };

  const uploadImagesToStorage = async (postId: string) => {
    const uploaded: { image_url: string; caption: string; sort_order: number }[] = [];
    for (let i = 0; i < postImages.length; i++) {
      const img = postImages[i];
      let url = img.image_url;
      if (img.file) {
        const ext = img.file.name.split(".").pop() || "jpg";
        const path = `${postId}/${Date.now()}-${i}.${ext}`;
        const { data, error } = await supabase.storage.from("post-images").upload(path, img.file);
        if (error) { console.error(error); continue; }
        const { data: pubUrl } = supabase.storage.from("post-images").getPublicUrl(data.path);
        url = pubUrl.publicUrl;
      }
      uploaded.push({ image_url: url, caption: img.caption, sort_order: i });
    }
    return uploaded;
  };

  const removeImage = (idx: number) => {
    setPostImages(prev => prev.filter((_, i) => i !== idx));
  };

  const moveImage = (idx: number, dir: "up" | "down") => {
    setPostImages(prev => {
      const arr = [...prev];
      const swapIdx = dir === "up" ? idx - 1 : idx + 1;
      if (swapIdx < 0 || swapIdx >= arr.length) return arr;
      [arr[idx], arr[swapIdx]] = [arr[swapIdx], arr[idx]];
      return arr;
    });
  };

  const saveMutation = useMutation({
    mutationFn: async () => {
      setUploading(true);
      const slug = form.slug || form.title.toLowerCase().replace(/\s+/g, "-").replace(/[^\u0980-\u09FF\w-]/g, "");
      const payload = { ...form, slug, category_id: form.category_id || null };

      let postId: string;
      if (editing) {
        const { error } = await supabase.from("posts").update(payload).eq("id", editing.id);
        if (error) throw error;
        postId = editing.id;
      } else {
        const { data, error } = await supabase.from("posts").insert(payload).select("id").single();
        if (error) throw error;
        postId = data.id;
      }

      // Handle images
      if (postImages.length > 0 || editing) {
        // Delete old images for this post
        await supabase.from("post_images").delete().eq("post_id", postId);
        // Upload and save new
        const images = await uploadImagesToStorage(postId);
        if (images.length > 0) {
          await supabase.from("post_images").insert(images.map(img => ({ ...img, post_id: postId })));
          // Set first image as featured if no featured_image
          if (!form.featured_image && images[0]) {
            await supabase.from("posts").update({ featured_image: images[0].image_url }).eq("id", postId);
          }
        }
      }
      setUploading(false);
      return { postId, slug: payload.slug, status: payload.status };
    },
    onSuccess: async (res) => {
      queryClient.invalidateQueries({ queryKey: ["admin-posts"] });
      toast.success(editing ? "আপডেট হয়েছে" : "পোস্ট তৈরি হয়েছে");
      // Auto reindex published posts (sitemap ping + GSC submit)
      if (res?.status === "published" && res.slug) {
        const url = `${window.location.origin}/post/${res.slug}`;
        supabase.functions.invoke("seo-reindex", { body: { urls: [url] } })
          .then(({ error }) => {
            if (!error) toast.success("Google-এ reindex রিকোয়েস্ট পাঠানো হয়েছে");
          })
          .catch(() => {});
      }
      resetForm();
    },
    onError: (err: any) => { setUploading(false); toast.error(err.message); },
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

  const bulkReindex = async () => {
    const selected = (posts ?? []).filter(p => selectedIds.has(p.id) && p.status === "published");
    if (selected.length === 0) return toast.error("প্রকাশিত পোস্ট সিলেক্ট করুন");
    setInspecting(true);
    const urls = selected.map(p => `${window.location.origin}/post/${p.slug}`);
    try {
      const { data, error } = await supabase.functions.invoke("seo-reindex", { body: { urls } });
      if (error) throw error;
      const map: typeof inspectResults = { ...inspectResults };
      (data?.inspections || []).forEach((ins: any) => {
        const slug = ins.url?.split("/post/")[1];
        const post = selected.find(p => p.slug === slug);
        if (post) map[post.id] = {
          verdict: ins.verdict,
          coverageState: ins.coverageState,
          lastCrawlTime: ins.lastCrawlTime,
          canonicalMatch: ins.canonicalMatch,
          error: ins.error,
        };
      });
      setInspectResults(map);
      toast.success(`${selected.length}টি URL reindex রিকোয়েস্ট পাঠানো হয়েছে`);
    } catch (e: any) {
      toast.error(e.message || "Reindex ব্যর্থ");
    }
    setInspecting(false);
  };

  const inspectSingle = async (post: Post) => {
    if (post.status !== "published") return toast.error("শুধু প্রকাশিত পোস্ট ইনস্পেক্ট করা যায়");
    const url = `${window.location.origin}/post/${post.slug}`;
    setInspectResults(prev => ({ ...prev, [post.id]: { verdict: "checking..." } }));
    try {
      const { data, error } = await supabase.functions.invoke("seo-reindex", { body: { urls: [url] } });
      if (error) throw error;
      const ins = data?.inspections?.[0];
      setInspectResults(prev => ({
        ...prev,
        [post.id]: {
          verdict: ins?.verdict,
          coverageState: ins?.coverageState,
          lastCrawlTime: ins?.lastCrawlTime,
          canonicalMatch: ins?.canonicalMatch,
          error: ins?.error,
        },
      }));
      toast.success("ইনস্পেকশন সম্পন্ন");
    } catch (e: any) {
      toast.error(e.message || "ইনস্পেকশন ব্যর্থ");
      setInspectResults(prev => ({ ...prev, [post.id]: { error: e.message } }));
    }
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

  // HTML escape helper
  const escapeHtml = (s: string) => (s || '').replace(/[&<>"']/g, (c) => (
    { '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]!
  ));

  // Build Blogger-ready HTML for a single post (gallery images, alt, source link, valid HTML)
  const buildBloggerHtml = async (post: Post): Promise<string> => {
    const url = `${window.location.origin}/post/${post.slug}`;
    const { data: imgs } = await supabase.from("post_images").select("image_url, caption").eq("post_id", post.id).order("sort_order");
    const galleryImages = imgs ?? [];

    const parts: string[] = [];
    if (post.featured_image) {
      parts.push(`<p><img src="${escapeHtml(post.featured_image)}" alt="${escapeHtml(post.title)}" style="max-width:100%;height:auto;display:block;margin:0 auto;" /></p>`);
    }
    if (post.content && post.content.trim()) {
      parts.push(`<div>${post.content}</div>`);
    } else if (post.excerpt) {
      parts.push(`<p>${escapeHtml(post.excerpt)}</p>`);
    }
    const extra = galleryImages.filter(i => i.image_url !== post.featured_image);
    if (extra.length > 0) {
      parts.push('<div style="margin-top:16px;">');
      for (const img of extra) {
        const alt = img.caption || post.title;
        parts.push(`<p><img src="${escapeHtml(img.image_url)}" alt="${escapeHtml(alt)}" style="max-width:100%;height:auto;display:block;margin:8px auto;" />${img.caption ? `<br/><em style="font-size:0.9em;color:#666;">${escapeHtml(img.caption)}</em>` : ''}</p>`);
      }
      parts.push('</div>');
    }
    if (post.source_url) {
      parts.push(`<p style="margin-top:20px;font-size:0.9em;color:#666;">মূল সূত্র: <a href="${escapeHtml(post.source_url)}" target="_blank" rel="noopener">${escapeHtml(post.source_url)}</a></p>`);
    }
    parts.push(`<p style="font-size:0.85em;color:#888;">সাইটে দেখুন: <a href="${escapeHtml(url)}" target="_blank" rel="noopener">${escapeHtml(url)}</a></p>`);
    return parts.join('\n');
  };

  const copyAsBloggerHtml = async (post: Post) => {
    try {
      const html = await buildBloggerHtml(post);
      await navigator.clipboard.writeText(html);
      toast.success("HTML কপি হয়েছে! Blogger editor (HTML view)-এ paste করুন");
    } catch (err: any) {
      toast.error("কপি ব্যর্থ: " + (err?.message || ""));
    }
  };

  // Bulk copy multiple posts as one HTML doc — mobile single-tap friendly
  const bulkCopyHtml = async () => {
    const selected = (posts ?? []).filter(p => selectedIds.has(p.id));
    if (selected.length === 0) return toast.error("পোস্ট সিলেক্ট করুন");
    try {
      const blocks: string[] = [];
      for (const post of selected) {
        const body = await buildBloggerHtml(post);
        blocks.push(`<!-- ===== POST: ${escapeHtml(post.title)} ===== -->\n<h2>${escapeHtml(post.title)}</h2>\n${body}\n<hr style="margin:30px 0;" />`);
      }
      await navigator.clipboard.writeText(blocks.join('\n\n'));
      toast.success(`${selected.length}টি পোস্টের HTML কপি হয়েছে!`);
      setSelectedIds(new Set());
    } catch (err: any) {
      toast.error("কপি ব্যর্থ: " + (err?.message || ""));
    }
  };

  // RSS preview state
  const [rssOpen, setRssOpen] = useState(false);
  const [rssLimit, setRssLimit] = useState(10);
  const [rssLoading, setRssLoading] = useState(false);
  const [rssText, setRssText] = useState("");

  const loadRssPreview = async (limit: number) => {
    setRssLoading(true);
    setRssLimit(limit);
    try {
      const res = await fetch(`https://fhtyknfxfafzncjdnana.supabase.co/functions/v1/rss-feed?limit=${limit}`);
      setRssText(await res.text());
    } catch (err: any) {
      setRssText("Error: " + (err?.message || ""));
    } finally {
      setRssLoading(false);
    }
  };

  const openRssPreview = () => {
    setRssOpen(true);
    if (!rssText) loadRssPreview(10);
  };

  const resetForm = () => {
    setForm({ title: "", slug: "", content: "", excerpt: "", featured_image: "", category_id: "", status: "draft", is_featured: false });
    setEditing(null);
    setShowForm(false);
    setPostImages([]);
  };

  const startEdit = async (post: Post) => {
    setForm({
      title: post.title, slug: post.slug, content: post.content || "",
      excerpt: post.excerpt || "", featured_image: post.featured_image || "",
      category_id: post.category_id || "", status: post.status, is_featured: post.is_featured,
    });
    setEditing(post);
    setShowForm(true);
    await loadPostImages(post.id);
  };

  const filtered = (posts ?? []).filter(p => {
    if (search && !p.title.toLowerCase().includes(search.toLowerCase())) return false;
    if (statusFilter !== "all" && p.status !== statusFilter) return false;
    return true;
  });

  const toggleSelect = (id: string) => {
    setSelectedIds(prev => { const next = new Set(prev); if (next.has(id)) next.delete(id); else next.add(id); return next; });
  };
  const toggleSelectAll = () => {
    if (selectedIds.size === filtered.length) setSelectedIds(new Set());
    else setSelectedIds(new Set(filtered.map(p => p.id)));
  };

  // Fetched articles from feeds
  const { data: feedArticles } = useQuery({
    queryKey: ["admin-feed-articles-summary"],
    queryFn: async () => {
      const { data } = await supabase.from("fetched_articles").select("id, title, status, feed_sources(name)").eq("status", "fetched").order("created_at", { ascending: false }).limit(5);
      return data ?? [];
    },
  });

  return (
    <div>
      <div className="flex items-center justify-between mb-4 flex-wrap gap-2">
        <h1 className="font-heading font-bold text-2xl">📝 কন্টেন্ট হাব</h1>
        <div className="flex gap-2 flex-wrap">
          {selectedIds.size > 0 && (
            <>
              <button onClick={bulkCopyHtml}
                className="flex items-center gap-1.5 px-3 py-2 rounded-lg bg-blue-600 text-white text-sm font-medium">
                <Copy className="h-4 w-4" /> HTML কপি ({selectedIds.size})
              </button>
              <button onClick={bulkReindex} disabled={inspecting}
                className="flex items-center gap-1.5 px-3 py-2 rounded-lg bg-green-600 text-white text-sm font-medium disabled:opacity-50" title="Google-এ reindex রিকোয়েস্ট + URL Inspection">
                {inspecting ? <Loader2 className="h-4 w-4 animate-spin" /> : <RefreshCw className="h-4 w-4" />}
                {inspecting ? "চেক হচ্ছে..." : `Reindex (${selectedIds.size})`}
              </button>
              <button onClick={bulkPublishBlogger} disabled={isBulkPublishing}
                className="flex items-center gap-1.5 px-3 py-2 rounded-lg bg-orange-600 text-white text-sm font-medium disabled:opacity-50">
                <Globe className="h-4 w-4" />
                {isBulkPublishing ? "পাবলিশ..." : `Blogger (${selectedIds.size})`}
              </button>
            </>
          )}
          <button onClick={openRssPreview} className="flex items-center gap-1.5 px-3 py-2 rounded-lg bg-orange-100 text-orange-700 dark:bg-orange-900/30 dark:text-orange-300 text-xs font-medium hover:bg-orange-200" title="RSS Feed প্রিভিউ ও টেস্ট">
            <Rss className="h-3.5 w-3.5" /> RSS প্রিভিউ
          </button>
          <button onClick={() => { resetForm(); setShowForm(!showForm); }} className="flex items-center gap-1.5 px-4 py-2 rounded-lg bg-primary text-primary-foreground text-sm font-medium">
            <Plus className="h-4 w-4" /> নতুন পোস্ট
          </button>
        </div>
      </div>

      {/* RSS Preview Modal */}
      {rssOpen && (
        <div className="fixed inset-0 z-50 bg-black/60 flex items-center justify-center p-3" onClick={() => setRssOpen(false)}>
          <div className="bg-card rounded-xl border border-border w-full max-w-3xl max-h-[90vh] flex flex-col" onClick={e => e.stopPropagation()}>
            <div className="flex items-center justify-between p-4 border-b border-border">
              <div>
                <h2 className="font-heading font-bold text-lg flex items-center gap-2"><Rss className="h-5 w-5 text-orange-600" /> RSS Feed প্রিভিউ</h2>
                <p className="text-xs text-muted-foreground mt-0.5">URL: <code className="bg-muted px-1 rounded">/rss.xml?limit={rssLimit}</code></p>
              </div>
              <button onClick={() => setRssOpen(false)} className="p-1.5 hover:bg-muted rounded"><X className="h-4 w-4" /></button>
            </div>
            <div className="p-3 border-b border-border flex gap-2 flex-wrap items-center">
              <span className="text-xs text-muted-foreground">আইটেম সংখ্যা:</span>
              {[10, 25, 50, 100].map(n => (
                <button key={n} onClick={() => loadRssPreview(n)}
                  className={`px-3 py-1 rounded-md text-xs font-medium ${rssLimit === n ? 'bg-primary text-primary-foreground' : 'bg-muted hover:bg-muted/70'}`}>
                  {n}
                </button>
              ))}
              <button onClick={() => loadRssPreview(rssLimit)} disabled={rssLoading} className="ml-auto px-3 py-1 rounded-md text-xs bg-muted hover:bg-muted/70 disabled:opacity-50">
                {rssLoading ? "লোড..." : "🔄 রিফ্রেশ"}
              </button>
              <a href={`https://fhtyknfxfafzncjdnana.supabase.co/functions/v1/rss-feed?limit=${rssLimit}`} target="_blank" rel="noopener" className="px-3 py-1 rounded-md text-xs bg-orange-100 text-orange-700 dark:bg-orange-900/30 dark:text-orange-300 hover:bg-orange-200">
                নতুন ট্যাবে ↗
              </a>
              <button onClick={async () => {
                await navigator.clipboard.writeText(`https://galachipablog.lovable.app/rss.xml?limit=${rssLimit}`);
                toast.success("RSS URL কপি হয়েছে!");
              }} className="px-3 py-1 rounded-md text-xs bg-blue-100 text-blue-700 dark:bg-blue-900/30 dark:text-blue-300 hover:bg-blue-200">
                URL কপি
              </button>
            </div>
            <div className="flex-1 overflow-auto p-3">
              {rssLoading ? (
                <p className="text-sm text-muted-foreground">লোড হচ্ছে...</p>
              ) : (
                <pre className="text-[11px] bg-muted/30 p-3 rounded-md whitespace-pre-wrap break-all font-mono leading-relaxed">{rssText}</pre>
              )}
            </div>
            <div className="p-3 border-t border-border bg-muted/20 text-xs text-muted-foreground">
              💡 এই URL টি IFTTT/Zapier-এর "RSS Feed → Blogger" automation-এ ব্যবহার করুন।
            </div>
          </div>
        </div>
      )}

      {/* Feed articles summary */}
      {feedArticles && feedArticles.length > 0 && (
        <div className="bg-blue-50 dark:bg-blue-950/20 border border-blue-200 dark:border-blue-800 rounded-xl p-3 mb-4">
          <p className="text-xs font-heading font-semibold text-blue-700 dark:text-blue-300 mb-2">⚡ ফিড থেকে {feedArticles.length}টি নতুন আর্টিকেল অপেক্ষায়</p>
          <div className="space-y-1">
            {feedArticles.slice(0, 3).map(a => (
              <p key={a.id} className="text-xs text-muted-foreground truncate">• {a.title} <span className="text-blue-500">({(a as any).feed_sources?.name})</span></p>
            ))}
          </div>
          <a href="/admin/feeds" className="text-xs text-blue-600 hover:underline mt-1 inline-block">ফিড ম্যানেজার →</a>
        </div>
      )}

      {/* Search & filter */}
      <div className="flex gap-2 mb-4 flex-wrap">
        <div className="relative flex-1 min-w-[200px]">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
          <input value={search} onChange={e => setSearch(e.target.value)} placeholder="খুঁজুন..." className="w-full pl-9 pr-3 py-2 rounded-lg border border-input bg-background text-sm" />
        </div>
        <select value={statusFilter} onChange={e => setStatusFilter(e.target.value)} className="px-3 py-2 rounded-lg border border-input bg-background text-sm">
          <option value="all">সব</option>
          <option value="draft">ড্রাফট</option>
          <option value="published">প্রকাশিত</option>
          <option value="archived">আর্কাইভ</option>
        </select>
      </div>

      {showForm && (
        <div className="bg-card rounded-xl border border-border p-5 mb-5 animate-slide-up">
          <h2 className="font-heading font-semibold mb-4">{editing ? "পোস্ট সম্পাদনা" : "নতুন পোস্ট"}</h2>
          <div className="grid md:grid-cols-2 gap-4">
            <div>
              <label className="text-xs font-medium text-muted-foreground">শিরোনাম *</label>
              <input value={form.title} onChange={e => setForm(p => ({ ...p, title: e.target.value }))} className="w-full mt-1 px-3 py-2 rounded-lg border border-input bg-background text-sm" />
            </div>
            <div>
              <label className="text-xs font-medium text-muted-foreground">ক্যাটাগরি</label>
              <select value={form.category_id} onChange={e => setForm(p => ({ ...p, category_id: e.target.value }))} className="w-full mt-1 px-3 py-2 rounded-lg border border-input bg-background text-sm">
                <option value="">নির্বাচন করুন</option>
                {categoryTree.map(parent => (
                  <optgroup key={parent.id} label={`${parent.name} (${parent.type})`}>
                    <option value={parent.id}>{parent.name}</option>
                    {parent.children.map(child => (
                      <option key={child.id} value={child.id}>↳ {child.name}</option>
                    ))}
                  </optgroup>
                ))}
              </select>
            </div>
            <div className="md:col-span-2">
              <label className="text-xs font-medium text-muted-foreground">সারসংক্ষেপ</label>
              <input value={form.excerpt} onChange={e => setForm(p => ({ ...p, excerpt: e.target.value }))} className="w-full mt-1 px-3 py-2 rounded-lg border border-input bg-background text-sm" />
            </div>
            <div className="md:col-span-2">
              <label className="text-xs font-medium text-muted-foreground">কন্টেন্ট</label>
              <textarea value={form.content} onChange={e => setForm(p => ({ ...p, content: e.target.value }))} rows={8} className="w-full mt-1 px-3 py-2 rounded-lg border border-input bg-background text-sm" />
            </div>

            {/* Multi Image Upload + URL */}
            <div className="md:col-span-2">
              <label className="text-xs font-medium text-muted-foreground mb-2 block">ছবি গ্যালারি</label>
              <div className="border-2 border-dashed border-input rounded-lg p-4">
                <div className="flex gap-2 items-center flex-wrap mb-2">
                  <label className="flex items-center gap-2 cursor-pointer text-sm text-muted-foreground hover:text-foreground transition-colors py-2 px-3 bg-muted rounded-lg">
                    <Upload className="h-4 w-4" />
                    ফাইল আপলোড
                    <input type="file" multiple accept="image/*" className="hidden" onChange={e => e.target.files && handleImageUpload(e.target.files)} />
                  </label>
                  <div className="flex gap-1 flex-1 min-w-[200px]">
                    <input
                      placeholder="ছবি URL দিন (https://...)"
                      className="flex-1 px-3 py-2 rounded-lg border border-input bg-background text-xs"
                      onKeyDown={e => {
                        if (e.key === "Enter") {
                          const val = (e.target as HTMLInputElement).value.trim();
                          if (val) {
                            setPostImages(prev => [...prev, { image_url: val, caption: "" }]);
                            (e.target as HTMLInputElement).value = "";
                          }
                        }
                      }}
                    />
                    <button type="button" onClick={() => {
                      const input = document.querySelector<HTMLInputElement>('input[placeholder="ছবি URL দিন (https://...)"]');
                      if (input?.value.trim()) {
                        setPostImages(prev => [...prev, { image_url: input.value.trim(), caption: "" }]);
                        input.value = "";
                      }
                    }} className="px-3 py-2 rounded-lg bg-muted text-xs font-medium hover:bg-muted/80">+ URL</button>
                  </div>
                </div>
                {postImages.length > 0 && (
                  <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 gap-3 mt-2">
                    {postImages.map((img, idx) => (
                      <div key={idx} className="relative group bg-muted rounded-lg overflow-hidden">
                        <img src={img.image_url} alt="" className="w-full h-24 object-cover" />
                        <div className="absolute top-1 right-1 flex gap-0.5 opacity-0 group-hover:opacity-100 transition-opacity">
                          {idx > 0 && (
                            <button onClick={() => moveImage(idx, "up")} className="p-1 bg-background/80 rounded text-xs">↑</button>
                          )}
                          {idx < postImages.length - 1 && (
                            <button onClick={() => moveImage(idx, "down")} className="p-1 bg-background/80 rounded text-xs">↓</button>
                          )}
                          <button onClick={() => removeImage(idx)} className="p-1 bg-destructive/80 rounded text-white">
                            <X className="h-3 w-3" />
                          </button>
                        </div>
                        <input value={img.caption} onChange={e => {
                          const arr = [...postImages]; arr[idx] = { ...arr[idx], caption: e.target.value }; setPostImages(arr);
                        }} placeholder="ক্যাপশন" className="w-full px-2 py-1 text-[10px] bg-background border-t border-input" />
                        {idx === 0 && <span className="absolute top-1 left-1 text-[9px] bg-primary text-primary-foreground px-1 rounded">কভার</span>}
                      </div>
                    ))}
                  </div>
                )}
              </div>
            </div>

            <div>
              <label className="text-xs font-medium text-muted-foreground">ফিচার্ড ছবি URL (ঐচ্ছিক)</label>
              <input value={form.featured_image} onChange={e => setForm(p => ({ ...p, featured_image: e.target.value }))} className="w-full mt-1 px-3 py-2 rounded-lg border border-input bg-background text-sm" placeholder="আপলোড থেকে অটো সেট হবে" />
            </div>
            <div className="flex items-center gap-4">
              <select value={form.status} onChange={e => setForm(p => ({ ...p, status: e.target.value as any }))} className="px-3 py-2 rounded-lg border border-input bg-background text-sm">
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
            <button onClick={() => saveMutation.mutate()} disabled={saveMutation.isPending || uploading || !form.title} className="px-4 py-2 rounded-lg bg-primary text-primary-foreground text-sm font-medium disabled:opacity-50">
              {uploading ? "আপলোড হচ্ছে..." : saveMutation.isPending ? "সেভ হচ্ছে..." : "সেভ"}
            </button>
            <button onClick={resetForm} className="px-4 py-2 rounded-lg bg-muted text-sm">বাতিল</button>
          </div>
        </div>
      )}

      <div className="bg-card rounded-xl border border-border overflow-hidden">
        <div className="flex items-center gap-2 px-3 py-2 border-b border-border bg-muted/30">
          <button onClick={toggleSelectAll} className="flex items-center gap-1.5 text-xs text-muted-foreground hover:text-foreground">
            {selectedIds.size === filtered.length && filtered.length > 0
              ? <CheckSquare className="h-4 w-4 text-primary" />
              : <Square className="h-4 w-4" />}
            {selectedIds.size > 0 ? `${selectedIds.size}টি সিলেক্টেড` : "সব সিলেক্ট"}
          </button>
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
                {post.featured_image && (
                  <img src={post.featured_image} alt="" className="w-10 h-10 rounded object-cover shrink-0" />
                )}
                <div className="flex-1 min-w-0">
                  <h3 className="font-medium text-sm truncate">{post.title}</h3>
                  <div className="flex items-center gap-2 mt-1">
                    <span className={`text-[10px] px-1.5 py-0.5 rounded-full ${
                      post.status === "published" ? "tag-blog" : post.status === "draft" ? "tag-news" : "tag-directory"
                    }`}>
                      {post.status === "published" ? "প্রকাশিত" : post.status === "draft" ? "ড্রাফট" : "আর্কাইভ"}
                    </span>
                     {post.is_featured && <span className="text-[10px] px-1.5 py-0.5 rounded-full bg-amber-100 text-amber-700 dark:bg-amber-900/30 dark:text-amber-300">⭐ ফিচার্ড</span>}
                     {(post as any).categories?.name && (
                       <span className="text-[10px] text-muted-foreground">{(post as any).categories.name}</span>
                     )}
                     {inspectResults[post.id] && (() => {
                       const r = inspectResults[post.id];
                       const ok = r.verdict === "PASS" || r.coverageState?.startsWith("Submitted and indexed");
                       const fail = r.error || r.verdict === "FAIL" || (r.coverageState && !ok);
                       const cls = ok ? "bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-300"
                         : fail ? "bg-red-100 text-red-700 dark:bg-red-900/30 dark:text-red-300"
                         : "bg-yellow-100 text-yellow-700 dark:bg-yellow-900/30 dark:text-yellow-300";
                       const label = r.error ? `⚠ ${r.error.slice(0, 24)}`
                         : r.verdict === "checking..." ? "⏳ চেক..."
                         : `${ok ? "✅" : fail ? "❌" : "⚠"} ${r.coverageState || r.verdict || "unknown"}`;
                       const title = [
                         r.coverageState && `Coverage: ${r.coverageState}`,
                         r.lastCrawlTime && `Last crawl: ${new Date(r.lastCrawlTime).toLocaleString("bn-BD")}`,
                         r.canonicalMatch !== undefined && `Canonical match: ${r.canonicalMatch ? "yes" : "no"}`,
                       ].filter(Boolean).join(" • ");
                       return <span title={title} className={`text-[10px] px-1.5 py-0.5 rounded-full ${cls}`}>{label}</span>;
                     })()}
                   </div>
                 </div>
                 <div className="flex gap-0.5 shrink-0">
                   <button onClick={async () => {
                     await supabase.from("posts").update({ is_featured: !post.is_featured }).eq("id", post.id);
                     queryClient.invalidateQueries({ queryKey: ["admin-posts"] });
                     toast.success(post.is_featured ? "ফিচার্ড সরানো হয়েছে" : "ফিচার্ড করা হয়েছে");
                   }} className={`p-1.5 hover:bg-muted rounded ${post.is_featured ? "text-amber-500" : ""}`} title="ফিচার্ড">
                     <Star className={`h-3.5 w-3.5 ${post.is_featured ? "fill-current" : ""}`} />
                   </button>
                   {post.status === "published" && (
                     <button onClick={() => inspectSingle(post)} className="p-1.5 hover:bg-muted rounded text-green-600" title="Google URL Inspection + Reindex"><RefreshCw className="h-3.5 w-3.5" /></button>
                   )}
                   <button onClick={() => sharePost(post)} className="p-1.5 hover:bg-muted rounded" title="শেয়ার"><Share2 className="h-3.5 w-3.5" /></button>
                   <button onClick={() => copyAsBloggerHtml(post)} className="p-1.5 hover:bg-muted rounded text-blue-600" title="Blogger HTML কপি (manual paste)"><Copy className="h-3.5 w-3.5" /></button>
                   <button onClick={() => publishBlogger(post)} className="p-1.5 hover:bg-muted rounded" title="Blogger API"><Globe className="h-3.5 w-3.5" /></button>
                   <button onClick={() => startEdit(post)} className="p-1.5 hover:bg-muted rounded" title="সম্পাদনা"><Pencil className="h-3.5 w-3.5" /></button>
                   <button onClick={() => { if (confirm("বিনে সরাবেন?")) deleteMutation.mutate(post.id); }} className="p-1.5 hover:bg-destructive/10 rounded text-destructive" title="মুছুন"><Trash2 className="h-3.5 w-3.5" /></button>
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
