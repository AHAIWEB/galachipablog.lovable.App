import { useState, useEffect, useRef } from "react";
import { useNavigate } from "react-router-dom";
import { Search, X, FileText, FolderTree } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";

type SearchResult = {
  type: "post" | "category";
  id: string;
  title: string;
  slug: string;
  extra?: string;
};

export default function SearchOverlay({ open, onClose }: { open: boolean; onClose: () => void }) {
  const [query, setQuery] = useState("");
  const [results, setResults] = useState<SearchResult[]>([]);
  const [loading, setLoading] = useState(false);
  const inputRef = useRef<HTMLInputElement>(null);
  const navigate = useNavigate();

  useEffect(() => {
    if (open) {
      setQuery("");
      setResults([]);
      setTimeout(() => inputRef.current?.focus(), 100);
    }
  }, [open]);

  useEffect(() => {
    if (!query.trim()) { setResults([]); return; }
    const timer = setTimeout(async () => {
      setLoading(true);
      try {
        const [postsRes, catsRes] = await Promise.all([
          supabase
            .from("posts")
            .select("id, title, slug, excerpt")
            .eq("status", "published")
            .ilike("title", `%${query}%`)
            .limit(8),
          supabase
            .from("categories")
            .select("id, name, slug, type")
            .ilike("name", `%${query}%`)
            .limit(6),
        ]);

        const items: SearchResult[] = [
          ...(catsRes.data?.map(c => ({
            type: "category" as const,
            id: c.id,
            title: c.name,
            slug: c.slug,
            extra: c.type === "news" ? "📰 খবর" : c.type === "blog" ? "💡 ব্লগ" : "📂 ডিরেক্টরি",
          })) ?? []),
          ...(postsRes.data?.map(p => ({
            type: "post" as const,
            id: p.id,
            title: p.title,
            slug: p.slug,
            extra: p.excerpt?.slice(0, 60),
          })) ?? []),
        ];
        setResults(items);
      } catch {
        setResults([]);
      }
      setLoading(false);
    }, 300);
    return () => clearTimeout(timer);
  }, [query]);

  useEffect(() => {
    const handleKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") onClose();
    };
    if (open) window.addEventListener("keydown", handleKey);
    return () => window.removeEventListener("keydown", handleKey);
  }, [open, onClose]);

  if (!open) return null;

  const goTo = (r: SearchResult) => {
    onClose();
    if (r.type === "post") navigate(`/post/${r.slug}`);
    else navigate(`/category/${r.slug}`);
  };

  return (
    <div className="fixed inset-0 z-[100] bg-foreground/40 backdrop-blur-sm animate-fade-in" onClick={onClose}>
      <div
        className="max-w-xl mx-auto mt-[10vh] bg-card rounded-2xl border border-border shadow-2xl overflow-hidden animate-slide-up"
        onClick={e => e.stopPropagation()}
      >
        <div className="flex items-center gap-3 px-4 py-3 border-b border-border">
          <Search className="h-5 w-5 text-muted-foreground shrink-0" />
          <input
            ref={inputRef}
            type="text"
            value={query}
            onChange={e => setQuery(e.target.value)}
            placeholder="পোস্ট বা ক্যাটাগরি খুঁজুন..."
            className="flex-1 bg-transparent text-base outline-none placeholder:text-muted-foreground"
          />
          <button onClick={onClose} className="p-1 hover:bg-muted rounded-lg">
            <X className="h-4 w-4" />
          </button>
        </div>

        <div className="max-h-[60vh] overflow-y-auto">
          {loading && (
            <div className="p-4 text-center text-sm text-muted-foreground">খুঁজছে...</div>
          )}

          {!loading && query && results.length === 0 && (
            <div className="p-8 text-center">
              <p className="text-3xl mb-2">🔍</p>
              <p className="text-sm text-muted-foreground">কোনো ফলাফল পাওয়া যায়নি</p>
            </div>
          )}

          {results.length > 0 && (
            <div className="p-2">
              {results.map(r => (
                <button
                  key={`${r.type}-${r.id}`}
                  onClick={() => goTo(r)}
                  className="w-full flex items-start gap-3 px-3 py-2.5 rounded-lg hover:bg-muted text-left transition-colors"
                >
                  <div className="mt-0.5 shrink-0">
                    {r.type === "post" ? (
                      <FileText className="h-4 w-4 text-primary" />
                    ) : (
                      <FolderTree className="h-4 w-4 text-accent" />
                    )}
                  </div>
                  <div className="min-w-0">
                    <p className="text-sm font-medium truncate">{r.title}</p>
                    {r.extra && (
                      <p className="text-xs text-muted-foreground truncate mt-0.5">{r.extra}</p>
                    )}
                  </div>
                </button>
              ))}
            </div>
          )}

          {!query && (
            <div className="p-6 text-center text-sm text-muted-foreground">
              টাইপ করুন সার্চ করতে...
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
