import { useState, useRef, useEffect } from "react";
import { Search, ChevronDown, Menu, X } from "lucide-react";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";

type MenuType = "news" | "blog" | "directory" | null;

type CategoryGroup = {
  letter: string;
  items: string[];
};

const menuConfig = {
  news: { label: "📰 জনপদ ও খবর", colorClass: "mega-menu-letter-news", placeholder: "খবর খুঁজুন..." },
  blog: { label: "💡 মনন ও ব্লগ", colorClass: "mega-menu-letter-blog", placeholder: "ব্লগ খুঁজুন..." },
  directory: { label: "📂 ইনডেক্স ও ডিরেক্টরি", colorClass: "mega-menu-letter-directory", placeholder: "ডিরেক্টরি খুঁজুন..." },
};

const letterList = ["অ","আ","ই","উ","এ","ও","ক","খ","গ","ঘ","চ","জ","ট","ড","ঢ","ত","দ","ন","প","ফ","ব","ভ","ম","য","র","ল","শ","স","হ"];

function useDynamicCategories(type: "news" | "blog" | "directory") {
  return useQuery({
    queryKey: ["menu-categories", type],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("categories")
        .select("name, letter")
        .eq("type", type)
        .order("letter")
        .order("name");
      if (error) throw error;
      
      const grouped: Record<string, string[]> = {};
      data?.forEach(cat => {
        const letter = cat.letter || cat.name[0];
        if (!grouped[letter]) grouped[letter] = [];
        grouped[letter].push(cat.name);
      });
      
      return Object.entries(grouped).map(([letter, items]) => ({ letter, items })) as CategoryGroup[];
    },
    staleTime: 5 * 60 * 1000,
  });
}

function MegaDropdown({ type, onClose }: { type: MenuType; onClose: () => void }) {
  const [search, setSearch] = useState("");
  const searchRef = useRef<HTMLInputElement>(null);
  const { data: categories = [] } = useDynamicCategories(type!);

  useEffect(() => {
    searchRef.current?.focus();
  }, []);

  if (!type) return null;
  const config = menuConfig[type];
  
  const filtered = search
    ? categories
        .map(c => ({ ...c, items: c.items.filter(i => i.includes(search)) }))
        .filter(c => c.items.length > 0)
    : categories;

  const scrollToLetter = (letter: string) => {
    document.getElementById(`letter-${type}-${letter}`)?.scrollIntoView({ behavior: "smooth", block: "start" });
  };

  return (
    <div className="absolute left-0 right-0 top-full z-50 bg-card border-b border-border shadow-xl animate-slide-up">
      <div className="container mx-auto p-4 max-h-[70vh] overflow-hidden flex gap-4">
        <div className="hidden lg:flex flex-col gap-1 py-2 border-r border-border pr-3 overflow-y-auto shrink-0">
          {letterList.map(l => {
            const exists = categories.some(c => c.letter === l);
            return (
              <button
                key={l}
                onClick={() => exists && scrollToLetter(l)}
                disabled={!exists}
                className={`text-sm w-8 h-7 rounded font-heading font-bold transition-colors ${
                  exists ? "hover:bg-primary hover:text-primary-foreground cursor-pointer" : "text-muted-foreground/40 cursor-default"
                }`}
              >
                {l}
              </button>
            );
          })}
        </div>

        <div className="flex-1 overflow-y-auto">
          <div className="flex items-center gap-3 mb-4 sticky top-0 bg-card z-10 pb-2">
            <div className="relative flex-1 max-w-md">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
              <input
                ref={searchRef}
                type="text"
                value={search}
                onChange={e => setSearch(e.target.value)}
                placeholder={config.placeholder}
                className="w-full pl-10 pr-4 py-2 rounded-lg border border-input bg-background text-sm focus:outline-none focus:ring-2 focus:ring-ring"
              />
            </div>
            <button onClick={onClose} className="p-2 hover:bg-muted rounded-lg">
              <X className="h-4 w-4" />
            </button>
          </div>

          <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 xl:grid-cols-6 gap-4">
            {filtered.map(cat => (
              <div key={cat.letter} id={`letter-${type}-${cat.letter}`}>
                <span className={`mega-menu-letter ${config.colorClass}`}>{cat.letter}</span>
                <ul className="mt-1 space-y-0.5">
                  {cat.items.map(item => (
                    <li key={item}>
                      <a href="#" className="text-sm text-foreground/80 hover:text-primary hover:underline block py-0.5 transition-colors">
                        {item}
                      </a>
                    </li>
                  ))}
                </ul>
              </div>
            ))}
          </div>

          {categories.length === 0 && (
            <p className="text-sm text-muted-foreground text-center py-8">ক্যাটাগরি লোড হচ্ছে...</p>
          )}
        </div>
      </div>
    </div>
  );
}

export default function SiteHeader() {
  const [openMenu, setOpenMenu] = useState<MenuType>(null);
  const [mobileOpen, setMobileOpen] = useState(false);
  const [headerSearch, setHeaderSearch] = useState("");

  const toggleMenu = (type: MenuType) => {
    setOpenMenu(prev => (prev === type ? null : type));
  };

  return (
    <header className="relative">
      <div className="bg-header-bg text-header-foreground">
        <div className="container mx-auto flex items-center justify-between h-14 px-4">
          <a href="/" className="font-heading font-bold text-xl tracking-tight shrink-0">
            গলাচিপা ব্লগ
          </a>
          <div className="hidden md:block relative flex-1 max-w-lg mx-6">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-header-foreground/50" />
            <input
              type="text"
              value={headerSearch}
              onChange={e => setHeaderSearch(e.target.value)}
              placeholder="খবর বা ডিরেক্টরি খুঁজুন..."
              className="w-full pl-10 pr-4 py-2 rounded-full bg-header-foreground/10 border border-header-foreground/20 text-sm text-header-foreground placeholder:text-header-foreground/40 focus:outline-none focus:bg-header-foreground/15"
            />
          </div>
          <button className="md:hidden p-2" onClick={() => setMobileOpen(!mobileOpen)}>
            {mobileOpen ? <X className="h-5 w-5" /> : <Menu className="h-5 w-5" />}
          </button>
        </div>
      </div>

      <nav className="bg-card border-b border-border shadow-sm">
        <div className="container mx-auto px-4">
          <div className={`${mobileOpen ? "flex" : "hidden"} md:flex items-center gap-1 flex-col md:flex-row py-2 md:py-0`}>
            {(["news", "blog", "directory"] as const).map(type => (
              <button
                key={type}
                onClick={() => toggleMenu(type)}
                className={`flex items-center gap-1 px-4 py-2.5 text-sm font-heading font-semibold rounded-lg md:rounded-none transition-colors w-full md:w-auto text-left ${
                  openMenu === type
                    ? "bg-primary text-primary-foreground"
                    : "text-foreground hover:bg-muted"
                }`}
              >
                {menuConfig[type].label}
                <ChevronDown className={`h-3.5 w-3.5 transition-transform ${openMenu === type ? "rotate-180" : ""}`} />
              </button>
            ))}
          </div>
        </div>
      </nav>

      {openMenu && <MegaDropdown type={openMenu} onClose={() => setOpenMenu(null)} />}
      {openMenu && (
        <div className="fixed inset-0 bg-foreground/20 z-40" onClick={() => setOpenMenu(null)} style={{ top: "110px" }} />
      )}
    </header>
  );
}
