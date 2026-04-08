import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import SiteHeader from "@/components/SiteHeader";
import SiteFooter from "@/components/SiteFooter";

export default function AboutPage() {
  const { data: settings } = useQuery({
    queryKey: ["site-settings-about"],
    queryFn: async () => {
      const { data } = await supabase
        .from("site_settings")
        .select("key, value")
        .in("key", ["about_us", "site_name", "contact_email", "contact_phone", "contact_address"]);
      const map: Record<string, string> = {};
      data?.forEach(s => { map[s.key] = s.value ?? ""; });
      return map;
    },
  });

  return (
    <div className="min-h-screen flex flex-col">
      <SiteHeader />
      <main className="flex-1 container mx-auto px-4 py-8 max-w-3xl">
        <h1 className="font-heading font-bold text-3xl mb-6 text-center">আমাদের সম্পর্কে</h1>
        
        <div className="bg-card rounded-2xl border border-border p-6 md:p-8 prose prose-sm max-w-none">
          {settings?.about_us ? (
            <div className="whitespace-pre-line text-foreground leading-relaxed">{settings.about_us}</div>
          ) : (
            <p className="text-muted-foreground text-center py-8">
              এডমিন প্যানেল → সেটিংস → পেজ কন্টেন্ট থেকে "আমাদের সম্পর্কে" কন্টেন্ট যোগ করুন।
            </p>
          )}
        </div>

        {(settings?.contact_email || settings?.contact_phone || settings?.contact_address) && (
          <div className="mt-6 bg-card rounded-2xl border border-border p-6">
            <h2 className="font-heading font-semibold text-lg mb-3">📧 যোগাযোগ</h2>
            <div className="space-y-2 text-sm text-muted-foreground">
              {settings.contact_email && <p>ইমেইল: <a href={`mailto:${settings.contact_email}`} className="text-primary">{settings.contact_email}</a></p>}
              {settings.contact_phone && <p>ফোন: {settings.contact_phone}</p>}
              {settings.contact_address && <p>ঠিকানা: {settings.contact_address}</p>}
            </div>
          </div>
        )}
      </main>
      <SiteFooter />
    </div>
  );
}
