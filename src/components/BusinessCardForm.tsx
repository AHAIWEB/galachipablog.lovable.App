import { useState } from "react";
import { Sparkles, Download, Share2, MapPin, Phone, Mail, Building2, User, Briefcase, ChevronLeft, ChevronRight } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import { toast } from "sonner";

type CardTemplate = {
  id: string;
  name: string;
  gradient: string;
  accent: string;
  style: "modern" | "classic" | "minimal" | "bold" | "elegant" | "corporate" | "creative" | "neon";
};

const templates: CardTemplate[] = [
  { id: "modern", name: "মডার্ন", gradient: "from-[hsl(215,80%,35%)] to-[hsl(270,40%,50%)]", accent: "white/20", style: "modern" },
  { id: "classic", name: "ক্লাসিক", gradient: "from-[#1a1a2e] to-[#16213e]", accent: "gold/20", style: "classic" },
  { id: "minimal", name: "মিনিমাল", gradient: "from-[#f8f9fa] to-[#e9ecef]", accent: "gray/10", style: "minimal" },
  { id: "bold", name: "বোল্ড", gradient: "from-[#ff6b35] to-[#f7c59f]", accent: "white/15", style: "bold" },
  { id: "elegant", name: "এলিগ্যান্ট", gradient: "from-[#2d3436] to-[#636e72]", accent: "amber/20", style: "elegant" },
  { id: "corporate", name: "কর্পোরেট", gradient: "from-[#0c3547] to-[#1b6ca8]", accent: "cyan/15", style: "corporate" },
  { id: "creative", name: "ক্রিয়েটিভ", gradient: "from-[#6c5ce7] to-[#a29bfe]", accent: "pink/15", style: "creative" },
  { id: "neon", name: "নিয়ন", gradient: "from-[#0f0f0f] to-[#1a1a2e]", accent: "green/20", style: "neon" },
];

export default function BusinessCardForm() {
  const { user } = useAuth();
  const [form, setForm] = useState({ name: "", title: "", phone: "", email: "", org: "", address: "" });
  const [submitted, setSubmitted] = useState(false);
  const [saving, setSaving] = useState(false);
  const [templateIdx, setTemplateIdx] = useState(0);

  const template = templates[templateIdx];

  const handleChange = (field: string, value: string) => {
    setForm(prev => ({ ...prev, [field]: value }));
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!form.name || !form.phone) return;
    setSubmitted(true);

    if (user) {
      setSaving(true);
      const { error } = await supabase.from("business_cards").insert({
        name: form.name,
        title: form.title || null,
        phone: form.phone,
        email: form.email || null,
        organization: form.org || null,
        address: form.address || null,
        user_id: user.id,
      } as any);
      setSaving(false);
      if (error) {
        toast.error("সাবমিট ব্যর্থ হয়েছে");
      } else {
        toast.success("কার্ড সাবমিট হয়েছে! অনুমোদনের অপেক্ষায়।");
      }
    }
  };

  const fields = [
    { key: "name", label: "নাম *", placeholder: "আপনার পূর্ণ নাম", icon: User },
    { key: "title", label: "পদবী", placeholder: "যেমন: ম্যানেজার", icon: Briefcase },
    { key: "org", label: "প্রতিষ্ঠান", placeholder: "প্রতিষ্ঠানের নাম", icon: Building2 },
    { key: "phone", label: "ফোন *", placeholder: "০১XXXXXXXXX", icon: Phone },
    { key: "email", label: "ইমেইল", placeholder: "email@example.com", icon: Mail },
    { key: "address", label: "ঠিকানা", placeholder: "ব্যবসার ঠিকানা", icon: MapPin },
  ];

  const isMinimal = template.style === "minimal";
  const textColor = isMinimal ? "text-gray-800" : "text-white";
  const subColor = isMinimal ? "text-gray-500" : "text-white/70";
  const neonGlow = template.style === "neon" ? "shadow-[0_0_30px_rgba(0,255,136,0.15)]" : "";

  return (
    <section className="bg-card rounded-2xl border border-border p-4 sm:p-6 my-6 shadow-sm">
      <div className="text-center mb-5">
        <div className="inline-flex items-center justify-center w-10 h-10 rounded-full bg-primary/10 mb-2">
          <Sparkles className="h-5 w-5 text-primary" />
        </div>
        <h2 className="font-heading font-bold text-lg sm:text-xl">ডিজিটাল বিজনেস কার্ড</h2>
        <p className="text-xs text-muted-foreground mt-1">৮টি প্রিমিয়াম টেমপ্লেট থেকে বাছুন</p>
      </div>

      {/* Template selector */}
      <div className="flex items-center gap-2 mb-5 overflow-x-auto pb-2 scrollbar-hide">
        {templates.map((t, i) => (
          <button
            key={t.id}
            onClick={() => setTemplateIdx(i)}
            className={`shrink-0 px-3 py-1.5 rounded-lg text-xs font-medium transition-all ${
              templateIdx === i ? "bg-primary text-primary-foreground shadow-md" : "bg-muted text-muted-foreground hover:bg-muted/80"
            }`}
          >
            {t.name}
          </button>
        ))}
      </div>

      <div className="grid md:grid-cols-2 gap-5">
        {/* Form */}
        <form onSubmit={handleSubmit} className="space-y-2.5">
          {fields.map(f => (
            <div key={f.key}>
              <label className="text-xs font-medium text-muted-foreground mb-0.5 block">{f.label}</label>
              <div className="relative">
                <f.icon className="absolute left-3 top-1/2 -translate-y-1/2 h-3.5 w-3.5 text-muted-foreground/50" />
                <input
                  type="text"
                  value={form[f.key as keyof typeof form]}
                  onChange={e => handleChange(f.key, e.target.value)}
                  placeholder={f.placeholder}
                  className="w-full pl-9 pr-3 py-2 rounded-xl border border-input bg-background text-sm focus:outline-none focus:ring-2 focus:ring-primary/30 focus:border-primary transition-all"
                />
              </div>
            </div>
          ))}
          <button
            type="submit"
            disabled={saving}
            className="w-full py-2.5 rounded-xl bg-gradient-to-r from-primary to-accent text-primary-foreground font-heading font-semibold text-sm hover:shadow-lg hover:shadow-primary/25 transition-all duration-300 active:scale-[0.98] flex items-center justify-center gap-2"
          >
            <Sparkles className="h-4 w-4" />
            {saving ? "সাবমিট হচ্ছে..." : "✨ কার্ড তৈরি করুন"}
          </button>
        </form>

        {/* Card Preview */}
        <div className="flex flex-col items-center justify-center gap-3">
          <div className={`w-full max-w-sm rounded-2xl overflow-hidden shadow-2xl ${neonGlow}`}>
            <div className={`aspect-[16/9] bg-gradient-to-br ${template.gradient} p-5 relative overflow-hidden`}>
              {/* Decorative */}
              {template.style === "neon" ? (
                <>
                  <div className="absolute top-0 left-0 w-full h-[1px] bg-gradient-to-r from-transparent via-green-400/50 to-transparent" />
                  <div className="absolute bottom-0 left-0 w-full h-[1px] bg-gradient-to-r from-transparent via-green-400/30 to-transparent" />
                </>
              ) : template.style === "classic" ? (
                <>
                  <div className="absolute top-2 left-2 right-2 bottom-2 border border-amber-400/20 rounded-lg" />
                  <div className="absolute top-0 right-0 w-28 h-28 bg-amber-400/5 rounded-full -translate-y-10 translate-x-10" />
                </>
              ) : template.style === "creative" ? (
                <>
                  <div className="absolute -bottom-6 -right-6 w-32 h-32 bg-pink-400/10 rounded-full" />
                  <div className="absolute -top-4 -left-4 w-20 h-20 bg-yellow-400/10 rounded-full" />
                  <div className="absolute top-1/2 right-1/3 w-12 h-12 bg-white/5 rounded-lg rotate-45" />
                </>
              ) : (
                <>
                  <div className="absolute top-0 right-0 w-32 h-32 bg-white/5 rounded-full -translate-y-12 translate-x-12" />
                  <div className="absolute bottom-0 left-0 w-24 h-24 bg-white/5 rounded-full translate-y-8 -translate-x-8" />
                </>
              )}

              <div className={`relative z-10 h-full flex flex-col justify-between ${textColor}`}>
                <div>
                  <h3 className={`font-heading font-bold ${template.style === "bold" ? "text-xl" : "text-lg"} tracking-tight`}>
                    {form.name || "আপনার নাম"}
                  </h3>
                  <p className={`text-xs ${subColor} mt-0.5`}>{form.title || "পদবী"}</p>
                  {form.org && (
                    <div className="flex items-center gap-1 mt-1">
                      <Building2 className="h-3 w-3 opacity-60" />
                      <p className={`text-xs ${subColor}`}>{form.org}</p>
                    </div>
                  )}
                </div>
                <div className={`w-10 h-[1px] ${isMinimal ? "bg-gray-300" : "bg-white/30"} my-1`} />
                <div className={`text-[11px] ${subColor} space-y-0.5`}>
                  <div className="flex items-center gap-1.5">
                    <Phone className="h-3 w-3" />
                    <span>{form.phone || "০১XXXXXXXXX"}</span>
                  </div>
                  {form.email && (
                    <div className="flex items-center gap-1.5">
                      <Mail className="h-3 w-3" />
                      <span>{form.email}</span>
                    </div>
                  )}
                  {form.address && (
                    <div className="flex items-center gap-1.5">
                      <MapPin className="h-3 w-3" />
                      <span>{form.address}</span>
                    </div>
                  )}
                </div>
              </div>

              <div className={`absolute bottom-0 left-0 right-0 h-1 ${
                template.style === "neon"
                  ? "bg-gradient-to-r from-green-400/0 via-green-400/60 to-green-400/0"
                  : template.style === "classic"
                  ? "bg-gradient-to-r from-amber-400/0 via-amber-400/40 to-amber-400/0"
                  : "bg-gradient-to-r from-white/0 via-white/30 to-white/0"
              }`} />
            </div>
          </div>

          {/* Template navigation */}
          <div className="flex items-center gap-3">
            <button onClick={() => setTemplateIdx(p => (p - 1 + templates.length) % templates.length)} className="p-1.5 rounded-full bg-muted hover:bg-muted/80">
              <ChevronLeft className="h-4 w-4" />
            </button>
            <span className="text-xs text-muted-foreground font-medium">{template.name} ({templateIdx + 1}/{templates.length})</span>
            <button onClick={() => setTemplateIdx(p => (p + 1) % templates.length)} className="p-1.5 rounded-full bg-muted hover:bg-muted/80">
              <ChevronRight className="h-4 w-4" />
            </button>
          </div>
        </div>
      </div>

      {submitted && !user && (
        <div className="mt-4 p-4 rounded-xl bg-muted text-center animate-slide-up border border-border">
          <p className="text-sm font-heading font-semibold text-foreground mb-2">✅ কার্ড প্রিভিউ তৈরি!</p>
          <p className="text-xs text-muted-foreground mb-3">
            সাবমিট করতে <a href="/auth" className="text-primary underline font-medium">লগইন</a> করুন
          </p>
          <div className="flex justify-center gap-2">
            <button className="px-4 py-2 rounded-lg bg-primary text-primary-foreground text-xs font-medium flex items-center gap-1">
              <Download className="h-3 w-3" /> ডাউনলোড
            </button>
            <button className="px-4 py-2 rounded-lg bg-secondary text-secondary-foreground text-xs font-medium flex items-center gap-1">
              <Share2 className="h-3 w-3" /> শেয়ার
            </button>
          </div>
        </div>
      )}
    </section>
  );
}
