import { useState } from "react";
import { Sparkles, Download, Share2 } from "lucide-react";

export default function BusinessCardForm() {
  const [form, setForm] = useState({ name: "", title: "", phone: "", email: "", org: "" });
  const [submitted, setSubmitted] = useState(false);

  const handleChange = (field: string, value: string) => {
    setForm(prev => ({ ...prev, [field]: value }));
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (form.name && form.phone) {
      setSubmitted(true);
    }
  };

  return (
    <section className="bg-card rounded-xl border border-border p-6 my-6">
      <div className="text-center mb-6">
        <h2 className="font-heading font-bold text-xl">🖼️ ডিজিটাল বিজনেস কার্ড তৈরি করুন</h2>
        <p className="text-sm text-muted-foreground mt-1">আপনার তথ্য দিন, অটোমেটিক কার্ড তৈরি হবে!</p>
      </div>

      <div className="grid md:grid-cols-2 gap-6">
        {/* Form */}
        <form onSubmit={handleSubmit} className="space-y-3">
          {[
            { key: "name", label: "নাম *", placeholder: "আপনার পূর্ণ নাম" },
            { key: "title", label: "পদবী", placeholder: "যেমন: ম্যানেজার" },
            { key: "org", label: "প্রতিষ্ঠান", placeholder: "প্রতিষ্ঠানের নাম" },
            { key: "phone", label: "ফোন *", placeholder: "০১XXXXXXXXX" },
            { key: "email", label: "ইমেইল", placeholder: "email@example.com" },
          ].map(f => (
            <div key={f.key}>
              <label className="text-xs font-medium text-muted-foreground">{f.label}</label>
              <input
                type="text"
                value={form[f.key as keyof typeof form]}
                onChange={e => handleChange(f.key, e.target.value)}
                placeholder={f.placeholder}
                className="w-full mt-0.5 px-3 py-2 rounded-lg border border-input bg-background text-sm focus:outline-none focus:ring-2 focus:ring-ring"
              />
            </div>
          ))}
          <button
            type="submit"
            className="w-full py-2.5 rounded-lg bg-primary text-primary-foreground font-heading font-semibold text-sm hover:opacity-90 transition-all active:scale-[0.98] flex items-center justify-center gap-2"
          >
            <Sparkles className="h-4 w-4" />
            কার্ড তৈরি করুন
          </button>
        </form>

        {/* Preview */}
        <div className="flex items-center justify-center">
          <div className="w-full max-w-sm aspect-[16/9] rounded-xl bg-gradient-to-br from-primary via-primary/80 to-accent p-5 text-primary-foreground shadow-lg relative overflow-hidden">
            <div className="absolute top-0 right-0 w-24 h-24 bg-primary-foreground/10 rounded-full -translate-y-8 translate-x-8" />
            <div className="absolute bottom-0 left-0 w-16 h-16 bg-primary-foreground/10 rounded-full translate-y-6 -translate-x-6" />
            <div className="relative z-10 h-full flex flex-col justify-between">
              <div>
                <h3 className="font-heading font-bold text-lg">{form.name || "আপনার নাম"}</h3>
                <p className="text-xs opacity-80">{form.title || "পদবী"}</p>
                {form.org && <p className="text-xs opacity-80 mt-0.5">{form.org}</p>}
              </div>
              <div className="text-xs opacity-80 space-y-0.5">
                <p>📞 {form.phone || "০১XXXXXXXXX"}</p>
                {form.email && <p>✉ {form.email}</p>}
              </div>
            </div>
          </div>
        </div>
      </div>

      {submitted && (
        <div className="mt-4 p-4 rounded-lg bg-muted text-center animate-slide-up">
          <p className="text-sm font-heading font-semibold text-foreground mb-2">
            ✅ আপনার কার্ড তৈরি হয়েছে!
          </p>
          <p className="text-xs text-muted-foreground mb-3">
            আপনার তথ্য সাবমিট করতে রেজিস্ট্রেশন করুন
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
