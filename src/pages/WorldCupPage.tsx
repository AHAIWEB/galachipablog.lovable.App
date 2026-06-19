import { useEffect } from "react";
import { Link } from "react-router-dom";
import SiteHeader from "@/components/SiteHeader";
import SiteFooter from "@/components/SiteFooter";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Trophy, Calendar, MapPin, Users, Goal, BarChart3, Newspaper, Star, Clock } from "lucide-react";

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

const topScorers = [
  { name: "মিরোস্লাভ ক্লোসা", goals: 16, country: "জার্মানি" },
  { name: "রোনালদো নাজারিও", goals: 15, country: "ব্রাজিল" },
  { name: "গার্ড ম্যুলার", goals: 14, country: "জার্মানি" },
  { name: "জাস্ট ফঁতেন", goals: 13, country: "ফ্রান্স" },
  { name: "পেলে", goals: 12, country: "ব্রাজিল" },
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
            <div className="flex items-center gap-2 mb-4"><Goal className="h-5 w-5 text-secondary" /><h3 className="font-bold text-lg">সর্বোচ্চ গোলদাতা</h3></div>
            <div className="space-y-2">
              {topScorers.map((p, i) => (
                <div key={i} className="flex items-center justify-between p-2 border-b">
                  <div>
                    <div className="font-medium">{p.name}</div>
                    <div className="text-xs text-muted-foreground">{p.country}</div>
                  </div>
                  <Badge variant="secondary" className="text-base font-bold">{p.goals} ⚽</Badge>
                </div>
              ))}
            </div>
          </Card>
        </div>

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
