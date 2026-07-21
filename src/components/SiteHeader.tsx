import { useState, useRef, useEffect } from "react";
import { Search, ChevronDown, Menu, X, User, Shield, Globe } from "lucide-react";
import { Link } from "react-router-dom";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import SearchOverlay from "@/components/SearchOverlay";

type MenuType = "news" | "blog" | "directory" | "weblinks" | null;

type CategoryItem = { id: string; name: string; slug: string };
type CategoryGroup = {
  letter: string;
  items: CategoryItem[];
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
        .select("id, name, letter, slug, parent_id")
        .eq("type", type)
        .is("deleted_at", null)
        .order("letter")
        .order("name");
      if (error) throw error;

      // Build parent > children hierarchy
      const parents = data?.filter(c => !c.parent_id) ?? [];
      const children = data?.filter(c => c.parent_id) ?? [];

      const grouped: Record<string, CategoryItem[]> = {};
      parents.forEach(cat => {
        const letter = cat.letter || cat.name[0];
        if (!grouped[letter]) grouped[letter] = [];
        grouped[letter].push({ id: cat.id, name: cat.name, slug: cat.slug });
        // Add children under parent
        children.filter(c => c.parent_id === cat.id).forEach(child => {
          grouped[letter].push({ id: child.id, name: `  ↳ ${child.name}`, slug: child.slug });
        });
      });

      return Object.entries(grouped).map(([letter, items]) => ({ letter, items })) as CategoryGroup[];
    },
    staleTime: 5 * 60 * 1000,
  });
}

function useLatestPosts(type: "news" | "blog" | "directory", enabled: boolean) {
  return useQuery({
    queryKey: ["mega-latest", type],
    queryFn: async () => {
      const { data: cats } = await supabase.from("categories").select("id").eq("type", type);
      if (!cats || cats.length === 0) return [];
      const { data } = await supabase
        .from("posts")
        .select("id, title, slug, featured_image")
        .eq("status", "published")
        .in("category_id", cats.map(c => c.id))
        .order("created_at", { ascending: false })
        .limit(4);
      return data ?? [];
    },
    enabled,
    staleTime: 2 * 60 * 1000,
  });
}

function WebLinksDropdown({ onClose, onMouseEnter, onMouseLeave }: { onClose: () => void; onMouseEnter?: () => void; onMouseLeave?: () => void }) {
  const { data: links = [] } = useQuery({
    queryKey: ["menu-website-links"],
    queryFn: async () => {
      const { data } = await supabase.from("website_links").select("id, title, url, favicon_url").eq("status", "active").order("sort_order").order("title").limit(42);
      return data ?? [];
    },
    staleTime: 5 * 60 * 1000,
  });

  return (
    <div className="absolute left-0 right-0 top-full z-50 bg-card border-b border-border shadow-xl animate-slide-up" onMouseEnter={onMouseEnter} onMouseLeave={onMouseLeave}>
      <div className="container mx-auto p-4 max-h-[70vh] overflow-y-auto">
        <div className="flex items-center justify-between mb-3">
          <h3 className="font-heading font-bold text-sm">🌐 বাংলাদেশের পত্রিকা ও ওয়েবসাইট</h3>
          <div className="flex items-center gap-2">
            <Link to="/website-links" onClick={onClose} className="text-xs text-primary hover:underline">সব দেখুন →</Link>
            <button onClick={onClose} className="p-1 hover:bg-muted rounded"><X className="h-4 w-4" /></button>
          </div>
        </div>
        <div className="grid grid-cols-4 sm:grid-cols-5 md:grid-cols-6 lg:grid-cols-7 xl:grid-cols-8 gap-1">
          {links.map(link => (
            <a key={link.id} href={link.url} target="_blank" rel="noopener noreferrer" className="flex flex-col items-center gap-1.5 p-3 rounded-lg hover:bg-muted/50 transition-colors group">
              <div className="w-12 h-9 flex items-center justify-center">
                {link.favicon_url ? (
                  <img src={link.favicon_url} alt={link.title} className="max-w-full max-h-full object-contain" onError={e => { (e.target as HTMLImageElement).style.display = "none"; }} />
                ) : (
                  <Globe className="h-6 w-6 text-muted-foreground" />
                )}
              </div>
              <span className="text-[10px] text-center leading-tight line-clamp-2 group-hover:text-primary transition-colors">{link.title}</span>
            </a>
          ))}
        </div>
      </div>
    </div>
  );
}

function MegaDropdown({ type, onClose, onMouseEnter, onMouseLeave }: { type: "news" | "blog" | "directory"; onClose: () => void; onMouseEnter: () => void; onMouseLeave: () => void }) {
  const [search, setSearch] = useState("");
  const [hoveredCatId, setHoveredCatId] = useState<string | null>(null);
  const searchRef = useRef<HTMLInputElement>(null);
  const { data: categories = [] } = useDynamicCategories(type);
  const { data: latestPosts = [] } = useLatestPosts(type, true);

  // Fetch posts for hovered category
  const { data: catPosts = [] } = useQuery({
    queryKey: ["mega-cat-posts", hoveredCatId],
    queryFn: async () => {
      if (!hoveredCatId) return [];
      const { data } = await supabase
        .from("posts")
        .select("id, title, slug, featured_image")
        .eq("status", "published")
        .eq("category_id", hoveredCatId)
        .order("created_at", { ascending: false })
        .limit(4);
      return data ?? [];
    },
    enabled: !!hoveredCatId,
    staleTime: 60000,
  });

  useEffect(() => {
    searchRef.current?.focus();
  }, []);

  if (!type) return null;
  const config = menuConfig[type];

  const filtered = search
    ? categories
        .map(c => ({ ...c, items: c.items.filter(i => i.name.includes(search)) }))
        .filter(c => c.items.length > 0)
    : categories;

  const scrollToLetter = (letter: string) => {
    document.getElementById(`letter-${type}-${letter}`)?.scrollIntoView({ behavior: "smooth", block: "start" });
  };

  const displayPosts = hoveredCatId ? catPosts : latestPosts;

  return (
    <div
      className="absolute left-0 right-0 top-full z-50 bg-card border-b border-border shadow-xl animate-slide-up"
      onMouseEnter={onMouseEnter}
      onMouseLeave={onMouseLeave}
    >
      <div className="container mx-auto p-4 max-h-[70vh] overflow-hidden flex gap-4">
        {/* Letter index */}
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

        {/* Categories */}
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
                    <li key={item.slug}>
                      <Link
                        to={`/category/${item.slug}`}
                        onClick={onClose}
                        onMouseEnter={() => setHoveredCatId(item.id)}
                        className={`text-sm text-foreground/80 hover:text-primary hover:underline block py-0.5 transition-colors ${hoveredCatId === item.id ? "text-primary font-medium" : ""}`}
                      >
                        {item.name}
                      </Link>
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

        {/* Posts sidebar - shows hovered category posts or latest */}
        {displayPosts.length > 0 && (
          <div className="hidden lg:block w-56 shrink-0 border-l border-border pl-4">
            <h4 className="font-heading font-bold text-xs text-muted-foreground mb-3">
              {hoveredCatId ? "এই ক্যাটাগরির পোস্ট" : "সর্বশেষ"}
            </h4>
            <div className="space-y-3">
              {displayPosts.map(p => (
                <Link key={p.id} to={`/post/${p.slug}`} onClick={onClose} className="block group">
                  {p.featured_image && (
                    <img src={p.featured_image} alt="" className="w-full h-20 object-cover rounded-lg mb-1" />
                  )}
                  <p className="text-xs font-heading font-medium leading-snug group-hover:text-primary transition-colors line-clamp-2">{p.title}</p>
                </Link>
              ))}
            </div>
          </div>
        )}
      </div>
    </div>
  );
}

export default function SiteHeader() {
  const { user, isAdmin } = useAuth();
  const [openMenu, setOpenMenu] = useState<MenuType>(null);
  const [mobileOpen, setMobileOpen] = useState(false);
  const [searchOpen, setSearchOpen] = useState(false);
  const hoverTimeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  const { data: siteSettings } = useQuery({
    queryKey: ["site-header-settings"],
    queryFn: async () => {
      const { data } = await supabase
        .from("site_settings")
        .select("key, value")
        .in("key", ["site_name", "site_tagline", "logo_url", "logo_width", "logo_height"]);
      const map: Record<string, string> = {};
      data?.forEach((item) => { map[item.key] = item.value ?? ""; });
      return map;
    },
    staleTime: 5 * 60 * 1000,
  });

  const logoUrl = siteSettings?.logo_url?.trim();
  const siteName = siteSettings?.site_name?.trim() || "গলাচিপা ব্লগ";
  // Allow admin-set sizes up to 800×200; header grows to fit.
  const logoWidth = Math.min(800, Math.max(48, Number(siteSettings?.logo_width) || 160));
  const logoHeight = Math.min(200, Math.max(28, Number(siteSettings?.logo_height) || 44));

  const cancelClose = () => {
    if (hoverTimeoutRef.current) clearTimeout(hoverTimeoutRef.current);
  };

  const handleMenuEnter = (type: "news" | "blog" | "directory") => {
    cancelClose();
    setOpenMenu(type);
  };

  const handleMenuLeave = () => {
    hoverTimeoutRef.current = setTimeout(() => setOpenMenu(null), 200);
  };

  const toggleMenu = (type: MenuType) => {
    setOpenMenu(prev => (prev === type ? null : type));
  };

  return (
    <header className="relative">
      <div className="bg-header-bg text-header-foreground">
        <div className="container mx-auto flex items-center justify-between min-h-14 py-1 px-4">
          <a href="/" className="font-heading font-bold text-xl tracking-tight shrink-0 flex items-center min-w-0">
            {logoUrl ? (
              <img
                src={logoUrl}
                alt={siteName}
                className="object-contain"
                style={{ width: logoWidth, height: logoHeight, maxWidth: "45vw" }}
                onError={(event) => { (event.currentTarget as HTMLImageElement).style.display = "none"; }}
              />
            ) : (
              siteName
            )}
          </a>
          <button
            onClick={() => setSearchOpen(true)}
            className="hidden md:flex items-center gap-2 flex-1 max-w-lg mx-6 pl-10 pr-4 py-2 rounded-full bg-header-foreground/10 border border-header-foreground/20 text-sm text-header-foreground/40 hover:bg-header-foreground/15 transition-colors relative"
          >
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4" />
            খবর বা ডিরেক্টরি খুঁজুন...
          </button>
          <div className="flex items-center gap-2 shrink-0">
            <button className="md:hidden p-2" onClick={() => setMobileOpen(!mobileOpen)}>
              {mobileOpen ? <X className="h-5 w-5" /> : <Menu className="h-5 w-5" />}
            </button>
            <button className="md:hidden p-2" onClick={() => setSearchOpen(true)}>
              <Search className="h-5 w-5" />
            </button>
            {user && isAdmin && (
              <Link
                to="/admin"
                className="p-2 rounded-full hover:bg-header-foreground/10 transition-colors"
                title="এডমিন প্যানেল"
              >
                <Shield className="h-5 w-5" />
              </Link>
            )}
            <Link
              to={user ? "/profile" : "/auth"}
              className="p-2 rounded-full hover:bg-header-foreground/10 transition-colors"
              title={user ? "প্রোফাইল" : "লগইন"}
            >
              <User className="h-5 w-5" />
            </Link>
          </div>
        </div>
      </div>

      <nav className="bg-card border-b border-border shadow-sm">
        <div className="container mx-auto px-4">
          <div className={`${mobileOpen ? "flex" : "hidden"} md:flex items-center gap-1 flex-col md:flex-row py-2 md:py-0`}>
            {(["news", "blog", "directory"] as const).map(type => (
              <div
                key={type}
                className="relative w-full md:w-auto"
                onMouseEnter={() => handleMenuEnter(type)}
                onMouseLeave={handleMenuLeave}
              >
                <button
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
              </div>
            ))}
            <div
              className="relative w-full md:w-auto"
              onMouseEnter={() => { if (hoverTimeoutRef.current) clearTimeout(hoverTimeoutRef.current); setOpenMenu("weblinks" as any); }}
              onMouseLeave={handleMenuLeave}
            >
              <Link
                to="/website-links"
                className={`px-4 py-2.5 text-sm font-heading font-semibold rounded-lg md:rounded-none transition-colors w-full md:w-auto text-left block md:inline flex items-center gap-1 ${
                  openMenu === ("weblinks" as any) ? "bg-primary text-primary-foreground" : "text-foreground hover:bg-muted"
                }`}
              >
                🌐 ওয়েবসাইট লিংক
              </Link>
            </div>
            <Link to="/about" className="px-4 py-2.5 text-sm font-heading font-semibold text-foreground hover:bg-muted rounded-lg md:rounded-none transition-colors w-full md:w-auto text-left block md:inline">আমাদের সম্পর্কে</Link>
          </div>
        </div>
      </nav>

      {openMenu && openMenu !== "weblinks" && <MegaDropdown type={openMenu} onClose={() => setOpenMenu(null)} onMouseEnter={cancelClose} onMouseLeave={handleMenuLeave} />}
      {openMenu === "weblinks" && <WebLinksDropdown onClose={() => setOpenMenu(null)} onMouseEnter={cancelClose} onMouseLeave={handleMenuLeave} />}
      {openMenu && (
        <div className="fixed inset-0 bg-foreground/20 z-40" onClick={() => setOpenMenu(null)} style={{ top: "110px" }} />
      )}

      <SearchOverlay open={searchOpen} onClose={() => setSearchOpen(false)} />
    </header>
  );
}
