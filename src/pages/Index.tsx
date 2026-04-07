import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import SiteHeader from "@/components/SiteHeader";
import LeftSidebar from "@/components/LeftSidebar";
import FeatureSlider from "@/components/FeatureSlider";
import PinterestGrid from "@/components/PinterestGrid";
import RightSidebar from "@/components/RightSidebar";
import BusinessCardForm from "@/components/BusinessCardForm";
import SiteFooter from "@/components/SiteFooter";

export default function Index() {
  const { data: dividerText } = useQuery({
    queryKey: ["setting-divider"],
    queryFn: async () => {
      const { data } = await supabase
        .from("site_settings")
        .select("value")
        .eq("key", "divider_text")
        .maybeSingle();
      return data?.value ?? "গলাচিপার স্পন্দন";
    },
  });

  return (
    <div className="min-h-screen flex flex-col">
      <SiteHeader />

      <main className="flex-1 container mx-auto px-4 py-6">
        <div className="grid grid-cols-1 lg:grid-cols-[30%_1fr_20%] gap-5">
          <aside className="order-2 lg:order-1">
            <LeftSidebar />
          </aside>

          <div className="order-1 lg:order-2 space-y-6">
            <FeatureSlider />

            <div className="section-divider">
              <span className="section-divider-text">{dividerText}</span>
            </div>

            <PinterestGrid />

            <BusinessCardForm />
          </div>

          <aside className="order-3">
            <RightSidebar />
          </aside>
        </div>
      </main>

      <SiteFooter />
    </div>
  );
}
