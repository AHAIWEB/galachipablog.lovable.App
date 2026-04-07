import { useState, useEffect } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import { Save, Palette, Type, Layout, Globe, Image, Mail, FileText } from "lucide-react";

const settingSections = [
  {
    title: "🌐 সাইট তথ্য",
    icon: Globe,
    fields: [
      { key: "site_name", label: "সাইটের নাম", type: "text", placeholder: "গলাচিপা ব্লগ" },
      { key: "site_tagline", label: "ট্যাগলাইন", type: "text", placeholder: "গলাচিপার স্পন্দন" },
      { key: "site_description", label: "সাইট বিবরণ (SEO)", type: "textarea", placeholder: "গলাচিপার খবর, ব্লগ ও ডিরেক্টরি" },
      { key: "site_keywords", label: "কীওয়ার্ড (SEO)", type: "text", placeholder: "গলাচিপা, পটুয়াখালী, বাংলা ব্লগ" },
    ],
  },
  {
    title: "🎨 কালার ও থিম",
    icon: Palette,
    fields: [
      { key: "primary_color", label: "প্রাইমারি কালার", type: "color", placeholder: "#1a5fa8" },
      { key: "secondary_color", label: "সেকেন্ডারি কালার", type: "color", placeholder: "#2e8b57" },
      { key: "accent_color", label: "অ্যাকসেন্ট কালার", type: "color", placeholder: "#7c3aed" },
      { key: "header_bg_color", label: "হেডার ব্যাকগ্রাউন্ড", type: "color", placeholder: "#1e293b" },
      { key: "footer_bg_color", label: "ফুটার ব্যাকগ্রাউন্ড", type: "color", placeholder: "#1e293b" },
    ],
  },
  {
    title: "✍️ ফন্ট ও টাইপোগ্রাফি",
    icon: Type,
    fields: [
      { key: "heading_font", label: "হেডিং ফন্ট", type: "select", options: ["Noto Sans Bengali", "Hind Siliguri", "SolaimanLipi", "Kalpurush"] },
      { key: "body_font", label: "বডি ফন্ট", type: "select", options: ["Hind Siliguri", "Noto Sans Bengali", "SolaimanLipi", "Kalpurush"] },
      { key: "base_font_size", label: "বেস ফন্ট সাইজ (px)", type: "number", placeholder: "16" },
    ],
  },
  {
    title: "📐 লেআউট",
    icon: Layout,
    fields: [
      { key: "layout_style", label: "লেআউট স্টাইল", type: "select", options: ["3-কলাম", "2-কলাম", "সিঙ্গেল কলাম"] },
      { key: "sidebar_position", label: "সাইডবার পজিশন", type: "select", options: ["বাম-ডান", "শুধু বাম", "শুধু ডান", "কোনটি না"] },
      { key: "posts_per_page", label: "প্রতি পেজে পোস্ট", type: "number", placeholder: "12" },
      { key: "divider_text", label: "সেকশন ডিভাইডার টেক্সট", type: "text", placeholder: "গলাচিপার স্পন্দন" },
    ],
  },
  {
    title: "🖼️ লোগো ও মিডিয়া",
    icon: Image,
    fields: [
      { key: "logo_url", label: "লোগো URL", type: "text", placeholder: "https://..." },
      { key: "favicon_url", label: "ফেভিকন URL", type: "text", placeholder: "https://..." },
      { key: "og_image_url", label: "সোশ্যাল শেয়ার ইমেজ", type: "text", placeholder: "https://..." },
      { key: "default_post_image", label: "ডিফল্ট পোস্ট ইমেজ", type: "text", placeholder: "https://..." },
    ],
  },
  {
    title: "📧 যোগাযোগ তথ্য",
    icon: Mail,
    fields: [
      { key: "contact_email", label: "ইমেইল", type: "text", placeholder: "info@galachipa.blog" },
      { key: "contact_phone", label: "ফোন", type: "text", placeholder: "০১৭XX-XXXXXX" },
      { key: "contact_address", label: "ঠিকানা", type: "text", placeholder: "গলাচিপা, পটুয়াখালী" },
      { key: "facebook_url", label: "ফেসবুক লিংক", type: "text", placeholder: "https://facebook.com/..." },
      { key: "youtube_url", label: "ইউটিউব লিংক", type: "text", placeholder: "https://youtube.com/..." },
      { key: "twitter_url", label: "টুইটার/X লিংক", type: "text", placeholder: "https://x.com/..." },
    ],
  },
  {
    title: "📄 পেজ কন্টেন্ট",
    icon: FileText,
    fields: [
      { key: "about_us", label: "আমাদের সম্পর্কে", type: "textarea", placeholder: "প্রতিষ্ঠান সম্পর্কে বিবরণ..." },
      { key: "privacy_policy", label: "গোপনীয়তা নীতি", type: "textarea", placeholder: "গোপনীয়তা নীতির বিবরণ..." },
      { key: "terms_conditions", label: "শর্তাবলী", type: "textarea", placeholder: "শর্তাবলীর বিবরণ..." },
      { key: "footer_text", label: "ফুটার টেক্সট", type: "text", placeholder: "© ২০২৬ গলাচিপা ব্লগ" },
    ],
  },
];

export default function AdminSettings() {
  const queryClient = useQueryClient();
  const [activeSection, setActiveSection] = useState(0);

  const { data: settings, isLoading } = useQuery({
    queryKey: ["admin-settings"],
    queryFn: async () => {
      const { data, error } = await supabase.from("site_settings").select("*");
      if (error) throw error;
      const map: Record<string, string> = {};
      data?.forEach(s => { map[s.key] = s.value ?? ""; });
      return map;
    },
  });

  const [form, setForm] = useState<Record<string, string>>({});

  const values = { ...settings, ...form };

  const saveMutation = useMutation({
    mutationFn: async () => {
      for (const [key, value] of Object.entries(form)) {
        // Try update first, then insert
        const { data: existing } = await supabase
          .from("site_settings")
          .select("id")
          .eq("key", key)
          .maybeSingle();

        if (existing) {
          const { error } = await supabase
            .from("site_settings")
            .update({ value })
            .eq("key", key);
          if (error) throw error;
        } else {
          const { error } = await supabase
            .from("site_settings")
            .insert({ key, value });
          if (error) throw error;
        }
      }
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["admin-settings"] });
      toast.success("সেটিংস সেভ হয়েছে ✨");
      setForm({});
    },
    onError: (err: any) => toast.error(err.message),
  });

  if (isLoading) return <div className="animate-pulse space-y-4"><div className="h-8 bg-muted rounded w-48" /><div className="h-40 bg-muted rounded-xl" /></div>;

  const section = settingSections[activeSection];

  return (
    <div>
      <div className="flex items-center justify-between mb-6">
        <h1 className="font-heading font-bold text-2xl">⚙️ সাইট কাস্টোমাইজেশন</h1>
        <button
          onClick={() => saveMutation.mutate()}
          disabled={Object.keys(form).length === 0 || saveMutation.isPending}
          className="flex items-center gap-1.5 px-4 py-2 rounded-lg bg-primary text-primary-foreground text-sm font-medium disabled:opacity-50 hover-scale"
        >
          <Save className="h-4 w-4" />
          {saveMutation.isPending ? "সেভ হচ্ছে..." : `সেভ করুন (${Object.keys(form).length})`}
        </button>
      </div>

      <div className="grid lg:grid-cols-[220px_1fr] gap-4">
        {/* Section nav */}
        <div className="bg-card rounded-xl border border-border p-2 space-y-0.5 lg:sticky lg:top-4 h-fit">
          {settingSections.map((s, i) => (
            <button
              key={i}
              onClick={() => setActiveSection(i)}
              className={`w-full flex items-center gap-2 px-3 py-2 rounded-lg text-sm font-medium transition-all duration-200 text-left ${
                activeSection === i
                  ? "bg-primary text-primary-foreground"
                  : "text-foreground hover:bg-muted"
              }`}
            >
              <s.icon className="h-4 w-4 shrink-0" />
              <span className="truncate">{s.title.replace(/^[^\s]+\s/, '')}</span>
            </button>
          ))}
        </div>

        {/* Fields */}
        <div className="bg-card rounded-xl border border-border p-5 animate-fade-in" key={activeSection}>
          <h2 className="font-heading font-semibold text-lg mb-4 flex items-center gap-2">
            <section.icon className="h-5 w-5 text-primary" />
            {section.title}
          </h2>

          <div className="space-y-4">
            {section.fields.map(f => (
              <div key={f.key}>
                <label className="text-xs font-medium text-muted-foreground mb-1 block">{f.label}</label>
                {f.type === "textarea" ? (
                  <textarea
                    value={values[f.key] ?? ""}
                    onChange={e => setForm(p => ({ ...p, [f.key]: e.target.value }))}
                    placeholder={f.placeholder}
                    rows={4}
                    className="w-full px-3 py-2 rounded-lg border border-input bg-background text-sm focus:outline-none focus:ring-2 focus:ring-ring transition-shadow"
                  />
                ) : f.type === "select" ? (
                  <select
                    value={values[f.key] ?? ""}
                    onChange={e => setForm(p => ({ ...p, [f.key]: e.target.value }))}
                    className="w-full px-3 py-2 rounded-lg border border-input bg-background text-sm focus:outline-none focus:ring-2 focus:ring-ring"
                  >
                    <option value="">ডিফল্ট</option>
                    {f.options?.map(o => <option key={o} value={o}>{o}</option>)}
                  </select>
                ) : f.type === "color" ? (
                  <div className="flex items-center gap-3">
                    <input
                      type="color"
                      value={values[f.key] || f.placeholder || "#000000"}
                      onChange={e => setForm(p => ({ ...p, [f.key]: e.target.value }))}
                      className="w-10 h-10 rounded-lg cursor-pointer border border-input"
                    />
                    <input
                      type="text"
                      value={values[f.key] ?? ""}
                      onChange={e => setForm(p => ({ ...p, [f.key]: e.target.value }))}
                      placeholder={f.placeholder}
                      className="flex-1 px-3 py-2 rounded-lg border border-input bg-background text-sm focus:outline-none focus:ring-2 focus:ring-ring"
                    />
                  </div>
                ) : (
                  <input
                    type={f.type}
                    value={values[f.key] ?? ""}
                    onChange={e => setForm(p => ({ ...p, [f.key]: e.target.value }))}
                    placeholder={f.placeholder}
                    className="w-full px-3 py-2 rounded-lg border border-input bg-background text-sm focus:outline-none focus:ring-2 focus:ring-ring transition-shadow"
                  />
                )}
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}
