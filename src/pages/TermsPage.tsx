import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import SiteHeader from "@/components/SiteHeader";
import SiteFooter from "@/components/SiteFooter";

export default function TermsPage() {
  const { data: content } = useQuery({
    queryKey: ["site-settings-terms"],
    queryFn: async () => {
      const { data } = await supabase
        .from("site_settings")
        .select("value")
        .eq("key", "terms_conditions")
        .maybeSingle();
      return data?.value ?? "";
    },
  });

  return (
    <div className="min-h-screen flex flex-col">
      <SiteHeader />
      <main className="flex-1 container mx-auto px-4 py-8 max-w-3xl">
        <h1 className="font-heading font-bold text-3xl mb-6 text-center">শর্তাবলী</h1>
        <div className="bg-card rounded-2xl border border-border p-6 md:p-8">
          {content ? (
            <div className="whitespace-pre-line text-foreground leading-relaxed text-sm">{content}</div>
          ) : (
            <p className="text-muted-foreground text-center py-8">
              এডমিন প্যানেল → সেটিংস → পেজ কন্টেন্ট থেকে "শর্তাবলী" কন্টেন্ট যোগ করুন।
            </p>
          )}
        </div>
      </main>
      <SiteFooter />
    </div>
  );
}
