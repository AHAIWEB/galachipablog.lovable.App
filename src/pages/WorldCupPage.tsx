import { useEffect, useMemo, useState } from "react";
import { Link } from "react-router-dom";
import SiteHeader from "@/components/SiteHeader";
import SiteFooter from "@/components/SiteFooter";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Drawer, DrawerContent, DrawerHeader, DrawerTitle, DrawerDescription } from "@/components/ui/drawer";
import { Trophy, Calendar, MapPin, Users, Goal, BarChart3, Newspaper, Star, Clock, RefreshCw, Search, Radio, Download } from "lucide-react";

const todayMatch = {
  teamA: { name: "আর্জেন্টিনা", flag: "🇦🇷", prob: 58 },
  teamB: { name: "ব্রাজিল", flag: "🇧🇷", prob: 42 },
  time: "রাত ১২:০০",
  venue: "মেক্সিকো সিটি, এজটেকা স্টেডিয়াম",
};

const pointsTable = [
  { pos: 1, team: "আর্জেন্টিনা", flag: "🇦🇷", p: 3, w: 3, d: 0, l: 0, pts: 9 },
  { pos: 2, team: "ব্রাজিল", flag: "🇧🇷", p: 3, w: 2, d: 1, l: 0, pts: 7 },
  { pos: 3, team: "ফ্রান্স", flag: "🇫🇷", p: 3, w: 2, d: 0, l: 1, pts: 6 },
  { pos: 4, team: "জার্মানি", flag: "🇩🇪", p: 3, w: 1, d: 1, l: 1, pts: 4 },
  { pos: 5, team: "স্পেন", flag: "🇪🇸", p: 3, w: 1, d: 0, l: 2, pts: 3 },
];

const fixtures = [
  { time: "সন্ধ্যা ৭:০০", a: "ফ্রান্স 🇫🇷", b: "🇩🇪 জার্মানি", status: "শেষ", score: "2-1" },
  { time: "রাত ১০:০০", a: "স্পেন 🇪🇸", b: "🇵🇹 পর্তুগাল", status: "লাইভ", score: "1-1" },
  { time: "রাত ১২:০০", a: "আর্জেন্টিনা 🇦🇷", b: "🇧🇷 ব্রাজিল", status: "আসন্ন", score: "-" },
];

const news = [
  { title: "মেসির নতুন রেকর্ড: বিশ্বকাপে দ্রুততম গোল", img: "https://images.unsplash.com/photo-1574629810360-7efbbe195018?w=600", tag: "তারকা" },
  { title: "ফাইনালে উঠতে পারবে কে? বিশ্লেষণ", img: "https://images.unsplash.com/photo-1551958219-acbc608c6377?w=600", tag: "বিশ্লেষণ" },
  { title: "এজটেকা স্টেডিয়াম প্রস্তুত মহারণের জন্য", img: "https://images.unsplash.com/photo-1577223625816-7546f13df25d?w=600", tag: "ভেন্যু" },
];

const stars = [
  { name: "লিওনেল মেসি", country: "আর্জেন্টিনা", img: "https://images.unsplash.com/photo-1546015720-b8b30df5aa27?w=400" },
  { name: "কিলিয়ান এমবাপ্পে", country: "ফ্রান্স", img: "https://images.unsplash.com/photo-1623840081131-1158ed3b3a82?w=400" },
  { name: "ভিনিসিয়াস জুনিয়র", country: "ব্রাজিল", img: "https://images.unsplash.com/photo-1577223625816-7546f13df25d?w=400" },
  { name: "জুড বেলিংহ্যাম", country: "ইংল্যান্ড", img: "https://images.unsplash.com/photo-1551958219-acbc608c6377?w=400" },
];

const venues = [
  { name: "এজটেকা স্টেডিয়াম", city: "মেক্সিকো সিটি", img: "https://images.unsplash.com/photo-1577223625816-7546f13df25d?w=600" },
  { name: "মেটলাইফ স্টেডিয়াম", city: "নিউ ইয়র্ক", img: "https://images.unsplash.com/photo-1577467014381-aa7c13a3c1e6?w=600" },
  { name: "বিএমও ফিল্ড", city: "টরন্টো", img: "https://images.unsplash.com/photo-1459865264687-595d652de67e?w=600" },
];

const titles = [
  { country: "ব্রাজিল 🇧🇷", count: 5 },
  { country: "জার্মানি 🇩🇪", count: 4 },
  { country: "ইতালি 🇮🇹", count: 4 },
  { country: "আর্জেন্টিনা 🇦🇷", count: 3 },
  { country: "ফ্রান্স 🇫🇷", count: 2 },
  { country: "উরুগুয়ে 🇺🇾", count: 2 },
];

type Scorer = {
  name: string; country: string; flag: string; group: string;
  goals: number; assists: number; matches: number; perMatchday: number[];
};
const topScorersData: Scorer[] = [
  { name: "লিওনেল মেসি", country: "আর্জেন্টিনা", flag: "🇦🇷", group: "A", goals: 6, assists: 3, matches: 3, perMatchday: [2, 2, 2] },
  { name: "কিলিয়ান এমবাপ্পে", country: "ফ্রান্স", flag: "🇫🇷", group: "B", goals: 5, assists: 2, matches: 3, perMatchday: [3, 1, 1] },
  { name: "ভিনিসিয়াস জুনিয়র", country: "ব্রাজিল", flag: "🇧🇷", group: "A", goals: 4, assists: 4, matches: 3, perMatchday: [1, 2, 1] },
  { name: "জুড বেলিংহ্যাম", country: "ইংল্যান্ড", flag: "🏴", group: "C", goals: 4, assists: 1, matches: 3, perMatchday: [2, 1, 1] },
  { name: "হ্যারি কেইন", country: "ইংল্যান্ড", flag: "🏴", group: "C", goals: 4, assists: 0, matches: 3, perMatchday: [0, 2, 2] },
  { name: "এর্লিং হাল্যান্ড", country: "নরওয়ে", flag: "🇳🇴", group: "D", goals: 3, assists: 1, matches: 3, perMatchday: [1, 1, 1] },
  { name: "লামিন ইয়ামাল", country: "স্পেন", flag: "🇪🇸", group: "B", goals: 3, assists: 2, matches: 3, perMatchday: [1, 1, 1] },
  { name: "রাফিনিয়া", country: "ব্রাজিল", flag: "🇧🇷", group: "A", goals: 3, assists: 0, matches: 3, perMatchday: [2, 0, 1] },
  { name: "ফ্লোরিয়ান ভির্টজ", country: "জার্মানি", flag: "🇩🇪", group: "D", goals: 2, assists: 3, matches: 3, perMatchday: [1, 0, 1] },
  { name: "ক্রিস্তিয়ানো রোনালদো", country: "পর্তুগাল", flag: "🇵🇹", group: "B", goals: 2, assists: 1, matches: 3, perMatchday: [1, 1, 0] },
];

const stats = [
  { label: "মোট দল", value: "৪৮" },
  { label: "মোট ম্যাচ", value: "১০৪" },
  { label: "ভেন্যু", value: "১৬" },
  { label: "আয়োজক দেশ", value: "৩" },
];

const Section = ({ icon: Icon, title, children, accent = "primary" }: any) => (
  <section className="mb-10">
    <div className="flex items-center gap-3 mb-5 border-b-2 pb-2" style={{ borderColor: `hsl(var(--${accent}))` }}>
      <div className="p-2 rounded-lg" style={{ background: `hsl(var(--${accent}) / 0.1)` }}>
        <Icon className="h-5 w-5" style={{ color: `hsl(var(--${accent}))` }} />
      </div>
      <h2 className="text-2xl font-bold font-heading">{title}</h2>
    </div>
    {children}
  </section>
);

function TopScorersLeaderboard() {
  const [group, setGroup] = useState<string>("all");
  const [matchday, setMatchday] = useState<string>("all");
  const [sortBy, setSortBy] = useState<"goals" | "assists">("goals");
  const [team, setTeam] = useState<string>("all");
  const [query, setQuery] = useState<string>("");
  const [data, setData] = useState<Scorer[]>(topScorersData);
  const [updatedAt, setUpdatedAt] = useState<Date>(new Date());
  const [live, setLive] = useState<boolean>(true);
  const [selected, setSelected] = useState<Scorer | null>(null);

  const groups = useMemo(() => ["all", ...Array.from(new Set(data.map(p => p.group))).sort()], [data]);
  const teams = useMemo(() => ["all", ...Array.from(new Set(data.map(p => p.country))).sort()], [data]);
  const matchdays = ["all", "1", "2", "3"];

  // Simulated live refresh — polls every 30s. Randomly bumps one player's goals to mimic
  // new match results. Replace with a real fetch when a backend feed is wired in.
  const refresh = () => {
    setData(prev => {
      const next = prev.map(p => ({ ...p, perMatchday: [...p.perMatchday] }));
      const idx = Math.floor(Math.random() * next.length);
      const md = Math.floor(Math.random() * 3);
      next[idx].perMatchday[md] += 1;
      next[idx].goals += 1;
      return next;
    });
    setUpdatedAt(new Date());
  };

  useEffect(() => {
    if (!live) return;
    const id = setInterval(refresh, 30000);
    return () => clearInterval(id);
  }, [live]);

  const rows = useMemo(() => {
    const q = query.trim().toLowerCase();
    return data
      .filter(p => group === "all" || p.group === group)
      .filter(p => team === "all" || p.country === team)
      .filter(p => !q || p.name.toLowerCase().includes(q) || p.country.toLowerCase().includes(q))
      .map(p => {
        const goals = matchday === "all" ? p.goals : (p.perMatchday[parseInt(matchday) - 1] ?? 0);
        return { ...p, displayGoals: goals };
      })
      .filter(p => matchday === "all" || p.displayGoals > 0)
      .sort((a, b) => sortBy === "goals" ? b.displayGoals - a.displayGoals : b.assists - a.assists);
  }, [data, group, matchday, sortBy, team, query]);

  const max = Math.max(1, ...rows.map(r => r.displayGoals));

  const exportCsv = () => {
    const headers = ["Rank", "Player", "Country", "Group", "Goals", "Assists", "Matches", "Matchday 1", "Matchday 2", "Matchday 3"];
    const escapeCell = (value: string | number) => `"${String(value).replace(/"/g, '""')}"`;
    const csv = [
      headers.map(escapeCell).join(","),
      ...rows.map((p, index) => [
        index + 1,
        p.name,
        p.country,
        p.group,
        p.displayGoals,
        p.assists,
        p.matches,
        p.perMatchday[0] ?? 0,
        p.perMatchday[1] ?? 0,
        p.perMatchday[2] ?? 0,
      ].map(escapeCell).join(",")),
    ].join("\n");
    const blob = new Blob(["\uFEFF" + csv], { type: "text/csv;charset=utf-8;" });
    const url = URL.createObjectURL(blob);
    const link = document.createElement("a");
    link.href = url;
    link.download = `world-cup-top-scorers-${new Date().toISOString().slice(0, 10)}.csv`;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    URL.revokeObjectURL(url);
  };

  return (
    <Section icon={Goal} title="সর্বোচ্চ গোলদাতা — লিডারবোর্ড" accent="secondary">
      <Card className="p-5">
        {/* Live status bar */}
        <div className="flex flex-wrap items-center gap-2 mb-3 pb-3 border-b">
          <Badge variant={live ? "destructive" : "outline"} className="gap-1">
            <Radio className={`h-3 w-3 ${live ? "animate-pulse" : ""}`} /> {live ? "লাইভ" : "পজড"}
          </Badge>
          <span className="text-xs text-muted-foreground">
            সর্বশেষ আপডেট: {updatedAt.toLocaleTimeString("bn-BD")}
          </span>
          <div className="ml-auto flex items-center gap-1">
            <Button size="sm" variant="outline" onClick={exportCsv} disabled={rows.length === 0} className="h-7 px-2 text-xs gap-1">
              <Download className="h-3 w-3" /> CSV
            </Button>
            <Button size="sm" variant="outline" onClick={refresh} className="h-7 px-2 text-xs gap-1">
              <RefreshCw className="h-3 w-3" /> রিফ্রেশ
            </Button>
            <Button size="sm" variant={live ? "default" : "outline"} onClick={() => setLive(v => !v)} className="h-7 px-2 text-xs">
              {live ? "পজ" : "শুরু"}
            </Button>
          </div>
        </div>

        {/* Search + team */}
        <div className="flex flex-wrap gap-2 mb-3">
          <div className="relative flex-1 min-w-[200px]">
            <Search className="absolute left-2 top-1/2 -translate-y-1/2 h-3.5 w-3.5 text-muted-foreground" />
            <Input
              placeholder="খেলোয়াড় / দেশ সার্চ..."
              value={query}
              onChange={e => setQuery(e.target.value)}
              className="h-8 pl-7 text-xs"
            />
          </div>
          <select
            value={team}
            onChange={e => setTeam(e.target.value)}
            className="h-8 rounded-md border border-input bg-background px-2 text-xs"
          >
            {teams.map(t => (
              <option key={t} value={t}>{t === "all" ? "সব দল" : t}</option>
            ))}
          </select>
        </div>

        {/* Filters */}
        <div className="flex flex-wrap gap-2 mb-4">
          <div className="flex items-center gap-1 flex-wrap">
            <span className="text-xs text-muted-foreground mr-1">গ্রুপ:</span>
            {groups.map(g => (
              <Button key={g} size="sm" variant={group === g ? "default" : "outline"} onClick={() => setGroup(g)} className="h-7 px-3 text-xs">
                {g === "all" ? "সব" : `গ্রুপ ${g}`}
              </Button>
            ))}
          </div>
          <div className="flex items-center gap-1 flex-wrap ml-auto">
            <span className="text-xs text-muted-foreground mr-1">ম্যাচডে:</span>
            {matchdays.map(m => (
              <Button key={m} size="sm" variant={matchday === m ? "default" : "outline"} onClick={() => setMatchday(m)} className="h-7 px-3 text-xs">
                {m === "all" ? "সব" : `ম্যাচডে ${m}`}
              </Button>
            ))}
          </div>
          <div className="flex items-center gap-1 w-full sm:w-auto">
            <span className="text-xs text-muted-foreground mr-1">সাজানো:</span>
            <Button size="sm" variant={sortBy === "goals" ? "default" : "outline"} onClick={() => setSortBy("goals")} className="h-7 px-3 text-xs">গোল</Button>
            <Button size="sm" variant={sortBy === "assists" ? "default" : "outline"} onClick={() => setSortBy("assists")} className="h-7 px-3 text-xs">অ্যাসিস্ট</Button>
          </div>
        </div>

        {rows.length === 0 ? (
          <div className="text-center text-muted-foreground py-8 text-sm">এই ফিল্টারে কোনো গোলদাতা নেই</div>
        ) : (
          <div className="space-y-2">
            {rows.map((p, i) => (
              <button
                key={p.name}
                onClick={() => setSelected(p)}
                className="w-full flex items-center gap-3 p-2 rounded-lg hover:bg-muted/50 text-left transition"
              >
                <div className={`w-7 h-7 rounded-full flex items-center justify-center text-xs font-bold ${i === 0 ? "bg-yellow-500 text-white" : i === 1 ? "bg-gray-400 text-white" : i === 2 ? "bg-orange-600 text-white" : "bg-muted text-foreground"}`}>{i + 1}</div>
                <div className="text-2xl">{p.flag}</div>
                <div className="flex-1 min-w-0">
                  <div className="font-medium truncate">{p.name}</div>
                  <div className="text-xs text-muted-foreground">{p.country} • গ্রুপ {p.group} • {p.matches} ম্যাচ • {p.assists} অ্যাসিস্ট</div>
                  <div className="mt-1 h-1.5 bg-muted rounded-full overflow-hidden">
                    <div className="h-full bg-secondary transition-all" style={{ width: `${(p.displayGoals / max) * 100}%` }} />
                  </div>
                </div>
                <Badge variant="secondary" className="text-base font-bold whitespace-nowrap">{p.displayGoals} ⚽</Badge>
              </button>
            ))}
          </div>
        )}
      </Card>

      <Drawer open={!!selected} onOpenChange={o => !o && setSelected(null)}>
        <DrawerContent>
          {selected && (
            <div className="mx-auto w-full max-w-lg">
              <DrawerHeader>
                <DrawerTitle className="flex items-center gap-3">
                  <span className="text-3xl">{selected.flag}</span>
                  <div>
                    <div>{selected.name}</div>
                    <div className="text-xs font-normal text-muted-foreground">{selected.country} • গ্রুপ {selected.group}</div>
                  </div>
                </DrawerTitle>
                <DrawerDescription>ম্যাচ-ভিত্তিক গোল ও অ্যাসিস্ট</DrawerDescription>
              </DrawerHeader>
              <div className="px-4 pb-6 space-y-4">
                <div className="grid grid-cols-3 gap-2">
                  <Card className="p-3 text-center">
                    <div className="text-2xl font-bold text-primary">{selected.goals}</div>
                    <div className="text-xs text-muted-foreground">মোট গোল</div>
                  </Card>
                  <Card className="p-3 text-center">
                    <div className="text-2xl font-bold text-secondary">{selected.assists}</div>
                    <div className="text-xs text-muted-foreground">অ্যাসিস্ট</div>
                  </Card>
                  <Card className="p-3 text-center">
                    <div className="text-2xl font-bold">{selected.matches}</div>
                    <div className="text-xs text-muted-foreground">ম্যাচ</div>
                  </Card>
                </div>
                <div>
                  <div className="text-sm font-semibold mb-2">ম্যাচ-ভিত্তিক বিভাজন</div>
                  <div className="space-y-2">
                    {selected.perMatchday.map((g, i) => {
                      const a = Math.max(0, Math.round((selected.assists / Math.max(1, selected.matches)) * ((i % 2) + 1)) - (i === 2 ? 1 : 0));
                      return (
                        <div key={i} className="flex items-center gap-3 p-3 bg-muted/40 rounded-lg">
                          <Badge variant="outline" className="w-24 justify-center">ম্যাচডে {i + 1}</Badge>
                          <div className="flex-1 flex gap-4 text-sm">
                            <span>⚽ <b>{g}</b> গোল</span>
                            <span className="text-muted-foreground">🅰️ {a} অ্যাসিস্ট</span>
                          </div>
                        </div>
                      );
                    })}
                  </div>
                </div>
              </div>
            </div>
          )}
        </DrawerContent>
      </Drawer>
    </Section>
  );
}

export default function WorldCupPage() {
  useEffect(() => {
    document.title = "ফিফা ফুটবল বিশ্বকাপ ২০২৬ - লাইভ স্কোর, পয়েন্ট টেবিল ও সংবাদ";
    const desc = "ফিফা বিশ্বকাপ ২০২৬ এর আজকের ম্যাচ প্রেডিকশন, পয়েন্ট টেবিল, ফিকশ্চার, লাইভ স্কোর, তারকা, ভেন্যু ও পরিসংখ্যান এক জায়গায়।";
    let m = document.querySelector('meta[name="description"]');
    if (!m) { m = document.createElement('meta'); m.setAttribute('name','description'); document.head.appendChild(m); }
    m.setAttribute('content', desc);
  }, []);
  return (
    <div className="min-h-screen bg-background">
      <SiteHeader />

      {/* HERO */}
      <div className="relative overflow-hidden" style={{ background: "linear-gradient(135deg, hsl(215 80% 18%), hsl(270 40% 25%))" }}>
        <div className="absolute inset-0 opacity-20" style={{ backgroundImage: "radial-gradient(circle at 20% 20%, white 1px, transparent 1px)", backgroundSize: "30px 30px" }} />
        <div className="container relative mx-auto px-4 py-12 text-white">
          <Badge className="bg-yellow-400 text-black font-bold mb-3">FIFA WORLD CUP 2026</Badge>
          <h1 className="text-4xl md:text-6xl font-extrabold font-heading mb-3">ফিফা ফুটবল বিশ্বকাপ ২০২৬</h1>
          <p className="text-lg opacity-90 max-w-2xl">যুক্তরাষ্ট্র • কানাডা • মেক্সিকো — ১১ জুন থেকে ১৯ জুলাই ২০২৬</p>
          <div className="flex flex-wrap gap-2 mt-5">
            {stats.map((s) => (
              <div key={s.label} className="bg-white/10 backdrop-blur px-4 py-2 rounded-lg border border-white/20">
                <div className="text-2xl font-bold">{s.value}</div>
                <div className="text-xs opacity-80">{s.label}</div>
              </div>
            ))}
          </div>
        </div>
      </div>

      <main className="container mx-auto px-4 py-8 max-w-6xl">
        {/* Today's Prediction */}
        <Section icon={Trophy} title="আজকের ম্যাচ প্রেডিকশন" accent="primary">
          <Card className="p-6 bg-gradient-to-br from-primary/5 to-accent/5">
            <div className="grid md:grid-cols-3 gap-6 items-center">
              <div className="text-center">
                <div className="text-6xl mb-2">{todayMatch.teamA.flag}</div>
                <div className="font-bold text-lg">{todayMatch.teamA.name}</div>
                <div className="text-3xl font-extrabold text-primary mt-1">{todayMatch.teamA.prob}%</div>
              </div>
              <div className="text-center">
                <Badge variant="destructive" className="mb-2">VS</Badge>
                <div className="flex items-center justify-center gap-2 text-sm text-muted-foreground"><Clock className="h-4 w-4" /> {todayMatch.time}</div>
                <div className="flex items-center justify-center gap-2 text-sm text-muted-foreground mt-1"><MapPin className="h-4 w-4" /> {todayMatch.venue}</div>
                <div className="mt-3 h-2 bg-muted rounded-full overflow-hidden">
                  <div className="h-full bg-primary" style={{ width: `${todayMatch.teamA.prob}%` }} />
                </div>
              </div>
              <div className="text-center">
                <div className="text-6xl mb-2">{todayMatch.teamB.flag}</div>
                <div className="font-bold text-lg">{todayMatch.teamB.name}</div>
                <div className="text-3xl font-extrabold text-secondary mt-1">{todayMatch.teamB.prob}%</div>
              </div>
            </div>
          </Card>
        </Section>

        {/* Points + Fixtures */}
        <div className="grid md:grid-cols-2 gap-6 mb-10">
          <Card className="p-5">
            <div className="flex items-center gap-2 mb-4">
              <BarChart3 className="h-5 w-5 text-primary" />
              <h3 className="font-bold text-lg">পয়েন্ট টেবিল</h3>
            </div>
            <p className="text-sm text-muted-foreground mb-3">গ্রুপ পর্বের সর্বশেষ পয়েন্ট ও অবস্থান</p>
            <table className="w-full text-sm">
              <thead><tr className="border-b text-xs text-muted-foreground"><th className="text-left py-2">#</th><th className="text-left">দল</th><th>ম্যাচ</th><th>জয়</th><th>পয়েন্ট</th></tr></thead>
              <tbody>
                {pointsTable.map((t) => (
                  <tr key={t.pos} className="border-b hover:bg-muted/50">
                    <td className="py-2 font-bold">{t.pos}</td>
                    <td>{t.flag} {t.team}</td>
                    <td className="text-center">{t.p}</td>
                    <td className="text-center">{t.w}</td>
                    <td className="text-center font-bold text-primary">{t.pts}</td>
                  </tr>
                ))}
              </tbody>
            </table>
            <Button variant="link" className="mt-2 px-0">বিস্তারিত দেখুন →</Button>
          </Card>

          <Card className="p-5">
            <div className="flex items-center gap-2 mb-4">
              <Calendar className="h-5 w-5 text-secondary" />
              <h3 className="font-bold text-lg">স্কোর ও ফিকশ্চার</h3>
            </div>
            <p className="text-sm text-muted-foreground mb-3">সব ম্যাচের সময়সূচী ও লাইভ স্কোর</p>
            <div className="space-y-3">
              {fixtures.map((f, i) => (
                <div key={i} className="flex items-center justify-between p-3 bg-muted/40 rounded-lg">
                  <div className="text-xs text-muted-foreground w-20">{f.time}</div>
                  <div className="flex-1 text-center text-sm font-medium">{f.a} <span className="mx-2 font-bold">{f.score}</span> {f.b}</div>
                  <Badge variant={f.status === "লাইভ" ? "destructive" : f.status === "শেষ" ? "secondary" : "outline"}>{f.status}</Badge>
                </div>
              ))}
            </div>
            <Button variant="link" className="mt-2 px-0">বিস্তারিত দেখুন →</Button>
          </Card>
        </div>

        {/* News */}
        <Section icon={Newspaper} title="বিশ্বকাপের খবর" accent="primary">
          <div className="grid md:grid-cols-3 gap-5">
            {news.map((n, i) => (
              <Card key={i} className="overflow-hidden hover:shadow-lg transition group">
                <div className="aspect-video overflow-hidden">
                  <img src={n.img} alt={n.title} className="w-full h-full object-cover group-hover:scale-105 transition" />
                </div>
                <div className="p-4">
                  <Badge className="mb-2">{n.tag}</Badge>
                  <h3 className="font-bold leading-snug">{n.title}</h3>
                </div>
              </Card>
            ))}
          </div>
        </Section>

        {/* Stars */}
        <Section icon={Star} title="বিশ্বকাপের তারকা" accent="accent">
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
            {stars.map((s, i) => (
              <Card key={i} className="overflow-hidden text-center hover:shadow-lg transition">
                <div className="aspect-square overflow-hidden bg-muted">
                  <img src={s.img} alt={s.name} className="w-full h-full object-cover" />
                </div>
                <div className="p-3">
                  <div className="font-bold text-sm">{s.name}</div>
                  <div className="text-xs text-muted-foreground">{s.country}</div>
                </div>
              </Card>
            ))}
          </div>
        </Section>

        {/* Venues */}
        <Section icon={MapPin} title="বিশ্বকাপের ভেন্যু" accent="secondary">
          <div className="grid md:grid-cols-3 gap-5">
            {venues.map((v, i) => (
              <Card key={i} className="overflow-hidden hover:shadow-lg transition">
                <div className="aspect-video"><img src={v.img} alt={v.name} className="w-full h-full object-cover" /></div>
                <div className="p-4">
                  <div className="font-bold">{v.name}</div>
                  <div className="text-sm text-muted-foreground flex items-center gap-1"><MapPin className="h-3 w-3" /> {v.city}</div>
                </div>
              </Card>
            ))}
          </div>
        </Section>

        {/* By Numbers */}
        <Section icon={BarChart3} title="সংখ্যায় সংখ্যায় বিশ্বকাপ" accent="primary">
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
            {stats.map((s) => (
              <Card key={s.label} className="p-6 text-center bg-gradient-to-br from-primary/5 to-secondary/5">
                <div className="text-4xl font-extrabold text-primary">{s.value}</div>
                <div className="text-sm text-muted-foreground mt-1">{s.label}</div>
              </Card>
            ))}
          </div>
        </Section>

        {/* Titles + Top Scorers */}
        <div className="grid md:grid-cols-2 gap-6 mb-10">
          <Card className="p-5">
            <div className="flex items-center gap-2 mb-4"><Trophy className="h-5 w-5 text-yellow-500" /><h3 className="font-bold text-lg">বিশ্বকাপের শিরোপা কার কয়টি</h3></div>
            <div className="space-y-2">
              {titles.map((t, i) => (
                <div key={i} className="flex items-center justify-between p-2 border-b">
                  <span className="font-medium">{t.country}</span>
                  <div className="flex gap-1">{Array.from({ length: t.count }).map((_, j) => <Trophy key={j} className="h-4 w-4 text-yellow-500 fill-yellow-500" />)}</div>
                </div>
              ))}
            </div>
          </Card>

          <Card className="p-5">
            <div className="flex items-center gap-2 mb-4"><Goal className="h-5 w-5 text-secondary" /><h3 className="font-bold text-lg">সর্বোচ্চ গোলদাতা (সংক্ষিপ্ত)</h3></div>
            <div className="space-y-2">
              {topScorersData.slice(0, 5).map((p, i) => (
                <div key={i} className="flex items-center justify-between p-2 border-b">
                  <div>
                    <div className="font-medium">{p.flag} {p.name}</div>
                    <div className="text-xs text-muted-foreground">{p.country}</div>
                  </div>
                  <Badge variant="secondary" className="text-base font-bold">{p.goals} ⚽</Badge>
                </div>
              ))}
            </div>
          </Card>
        </div>

        {/* Top Scorers Leaderboard with filters */}
        <TopScorersLeaderboard />


        {/* Schedule */}
        <Section icon={Calendar} title="বিশ্বকাপের সময়সূচি" accent="accent">
          <Card className="p-5">
            <div className="grid md:grid-cols-3 gap-4 text-sm">
              <div className="p-4 bg-primary/5 rounded-lg"><div className="font-bold text-primary mb-1">গ্রুপ পর্ব</div><div className="text-muted-foreground">১১ জুন – ২৭ জুন ২০২৬</div></div>
              <div className="p-4 bg-secondary/5 rounded-lg"><div className="font-bold text-secondary mb-1">নকআউট পর্ব</div><div className="text-muted-foreground">২৯ জুন – ১১ জুলাই ২০২৬</div></div>
              <div className="p-4 bg-accent/5 rounded-lg"><div className="font-bold text-accent mb-1">ফাইনাল</div><div className="text-muted-foreground">১৯ জুলাই ২০২৬ — মেটলাইফ স্টেডিয়াম</div></div>
            </div>
          </Card>
        </Section>
      </main>

      <SiteFooter />
    </div>
  );
}
