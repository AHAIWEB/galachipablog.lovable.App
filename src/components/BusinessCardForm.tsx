import { useState } from "react";
import { Sparkles, Download, Share2, MapPin, Phone, Mail, Building2, User, Briefcase } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import { toast } from "sonner";

export default function BusinessCardForm() {
  const { user } = useAuth();
  const [form, setForm] = useState({ name: "", title: "", phone: "", email: "", org: "", address: "" });
  const [submitted, setSubmitted] = useState(false);
  const [saving, setSaving] = useState(false);

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
    { key: "address", label: "ঠিকানা", placeholder: "আপনার ব্যবসার ঠিকানা", icon: MapPin },
  ];

  return (
    <section className="bg-card rounded-2xl border border-border p-6 my-6 shadow-sm">
      <div className="text-center mb-6">
        <div className="inline-flex items-center justify-center w-12 h-12 rounded-full bg-primary/10 mb-3">
          <Sparkles className="h-6 w-6 text-primary" />
        </div>
        <h2 className="font-heading font-bold text-xl">ডিজিটাল বিজনেস কার্ড তৈরি করুন</h2>
        <p className="text-sm text-muted-foreground mt-1">আপনার তথ্য দিন, অটোমেটিক প্রিমিয়াম কার্ড তৈরি হবে!</p>
      </div>

      <div className="grid md:grid-cols-2 gap-6">
        {/* Form */}
        <form onSubmit={handleSubmit} className="space-y-3">
          {fields.map(f => (
            <div key={f.key} className="relative">
              <label className="text-xs font-medium text-muted-foreground mb-0.5 block">{f.label}</label>
              <div className="relative">
                <f.icon className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground/50" />
                <input
                  type="text"
                  value={form[f.key as keyof typeof form]}
                  onChange={e => handleChange(f.key, e.target.value)}
                  placeholder={f.placeholder}
                  className="w-full pl-10 pr-4 py-2.5 rounded-xl border border-input bg-background text-sm focus:outline-none focus:ring-2 focus:ring-primary/30 focus:border-primary transition-all"
                />
              </div>
            </div>
          ))}
          <button
            type="submit"
            disabled={saving}
            className="w-full py-3 rounded-xl bg-gradient-to-r from-primary to-accent text-primary-foreground font-heading font-semibold text-sm hover:shadow-lg hover:shadow-primary/25 transition-all duration-300 active:scale-[0.98] flex items-center justify-center gap-2 group"
          >
            <Sparkles className="h-4 w-4 group-hover:animate-spin" />
            {saving ? "সাবমিট হচ্ছে..." : "✨ কার্ড তৈরি করুন"}
          </button>
        </form>

        {/* Premium Card Preview */}
        <div className="flex items-center justify-center">
          <div className="w-full max-w-sm perspective-1000">
            <div className="relative rounded-2xl overflow-hidden shadow-2xl transform hover:rotate-y-2 transition-transform duration-500">
              {/* Card background */}
              <div className="aspect-[16/9] bg-gradient-to-br from-[hsl(var(--primary))] via-[hsl(var(--primary)/0.85)] to-[hsl(var(--accent))] p-5 relative">
                {/* Decorative elements */}
                <div className="absolute top-0 right-0 w-32 h-32 bg-white/5 rounded-full -translate-y-12 translate-x-12" />
                <div className="absolute bottom-0 left-0 w-24 h-24 bg-white/5 rounded-full translate-y-8 -translate-x-8" />
                <div className="absolute top-1/2 right-1/4 w-16 h-16 bg-white/5 rounded-full" />
                
                {/* Pattern overlay */}
                <div className="absolute inset-0 opacity-[0.03]" style={{
                  backgroundImage: `repeating-linear-gradient(45deg, transparent, transparent 10px, white 10px, white 11px)`
                }} />

                {/* Content */}
                <div className="relative z-10 h-full flex flex-col justify-between text-primary-foreground">
                  <div>
                    <h3 className="font-heading font-bold text-lg tracking-tight">
                      {form.name || "আপনার নাম"}
                    </h3>
                    <p className="text-xs opacity-75 mt-0.5">{form.title || "পদবী"}</p>
                    {form.org && (
                      <div className="flex items-center gap-1 mt-1">
                        <Building2 className="h-3 w-3 opacity-60" />
                        <p className="text-xs opacity-75">{form.org}</p>
                      </div>
                    )}
                  </div>

                  {/* Divider */}
                  <div className="w-12 h-[1px] bg-primary-foreground/30 my-1" />

                  <div className="text-[11px] opacity-75 space-y-1">
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

                {/* Bottom accent bar */}
                <div className="absolute bottom-0 left-0 right-0 h-1 bg-gradient-to-r from-white/0 via-white/30 to-white/0" />
              </div>
            </div>
          </div>
        </div>
      </div>

      {submitted && !user && (
        <div className="mt-4 p-4 rounded-xl bg-muted text-center animate-slide-up border border-border">
          <p className="text-sm font-heading font-semibold text-foreground mb-2">
            ✅ আপনার কার্ড প্রিভিউ তৈরি হয়েছে!
          </p>
          <p className="text-xs text-muted-foreground mb-3">
            আপনার তথ্য সাবমিট করতে <a href="/auth" className="text-primary underline font-medium">রেজিস্ট্রেশন/লগইন</a> করুন
          </p>
          <div className="flex justify-center gap-2">
            <button className="px-4 py-2 rounded-lg bg-primary text-primary-foreground text-xs font-medium flex items-center gap-1 hover:shadow-md transition-shadow">
              <Download className="h-3 w-3" /> ডাউনলোড
            </button>
            <button className="px-4 py-2 rounded-lg bg-secondary text-secondary-foreground text-xs font-medium flex items-center gap-1 hover:shadow-md transition-shadow">
              <Share2 className="h-3 w-3" /> শেয়ার
            </button>
          </div>
        </div>
      )}
    </section>
  );
}
