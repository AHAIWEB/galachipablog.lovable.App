import { useState, useRef, useEffect } from "react";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { ExternalLink } from "lucide-react";

const BENGALI_LETTERS = "অআইঈউঊঋএঐওঔকখগঘঙচছজঝঞটঠডঢণতথদধনপফবভমযরলশষসহড়ঢ়য়".split("");
const ENGLISH_LETTERS = "ABCDEFGHIJKLMNOPQRSTUVWXYZ".split("");
const ALL_LETTERS = [...BENGALI_LETTERS, ...ENGLISH_LETTERS, "0-9"];

export default function WebsiteLinksWidget() {
  const [activeLetter, setActiveLetter] = useState<string | null>(null);
  const scrollRef = useRef<HTMLDivElement>(null);

  const { data: links = [] } = useQuery({
    queryKey: ["website-links", activeLetter],
    queryFn: async () => {
      let query = supabase
        .from("website_links")
        .select("*")
        .eq("status", "active")
        .order("title");

      if (activeLetter) {
        query = query.eq("letter", activeLetter);
      }

      const { data } = await query.limit(50);
      return data ?? [];
    },
  });

  const { data: letterCounts = [] } = useQuery({
    queryKey: ["website-links-letters"],
    queryFn: async () => {
      const { data } = await supabase
        .from("website_links")
        .select("letter")
        .eq("status", "active");
      const counts: Record<string, number> = {};
      (data ?? []).forEach(d => {
        if (d.letter) counts[d.letter] = (counts[d.letter] || 0) + 1;
      });
      return counts;
    },
  });

  return (
    <div className="bg-card rounded-xl border border-border overflow-hidden shadow-sm">
      <div className="px-3 py-2.5 bg-primary text-primary-foreground border-b border-border flex items-center justify-between">
        <h3 className="font-heading font-bold text-sm">🔗 ওয়েবসাইট আর্কাইভ</h3>
        {activeLetter && (
          <button onClick={() => setActiveLetter(null)} className="text-xs bg-primary-foreground/20 px-2 py-0.5 rounded">
            সব
          </button>
        )}
      </div>

      {/* Letter scroll bar */}
      <div className="flex items-center border-b border-border">
        <div ref={scrollRef} className="flex overflow-x-auto scrollbar-hide py-1.5 px-1 gap-0.5">
          {ALL_LETTERS.map(letter => {
            const count = (letterCounts as any)[letter] || 0;
            return (
              <button
                key={letter}
                onClick={() => setActiveLetter(activeLetter === letter ? null : letter)}
                className={`shrink-0 px-1.5 py-0.5 text-[10px] rounded font-medium transition-colors ${
                  activeLetter === letter
                    ? "bg-primary text-primary-foreground"
                    : count > 0
                    ? "bg-muted text-foreground hover:bg-muted/80"
                    : "text-muted-foreground/40 cursor-default"
                }`}
                disabled={count === 0}
              >
                {letter}
              </button>
            );
          })}
        </div>
      </div>

      {/* Scrolling links */}
      <div className="max-h-[300px] overflow-y-auto divide-y divide-border">
        {links.length === 0 ? (
          <p className="p-3 text-xs text-muted-foreground">কোনো লিংক নেই</p>
        ) : (
          links.map(link => (
            <a
              key={link.id}
              href={link.url}
              target="_blank"
              rel="noopener noreferrer"
              className="flex items-center gap-2 p-2.5 hover:bg-muted/50 transition-colors group"
            >
              {link.favicon_url ? (
                <img src={link.favicon_url} alt="" className="w-4 h-4 rounded shrink-0" />
              ) : (
                <ExternalLink className="h-3.5 w-3.5 text-muted-foreground shrink-0" />
              )}
              <div className="min-w-0 flex-1">
                <p className="text-xs font-medium truncate group-hover:text-primary transition-colors">{link.title}</p>
                <p className="text-[10px] text-muted-foreground truncate">{link.url}</p>
              </div>
              <span className="text-[10px] bg-muted px-1.5 py-0.5 rounded shrink-0">{link.letter}</span>
            </a>
          ))
        )}
      </div>
    </div>
  );
}
