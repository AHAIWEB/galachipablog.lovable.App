import { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import SiteHeader from "@/components/SiteHeader";
import LeftSidebar from "@/components/LeftSidebar";
import FeatureSlider from "@/components/FeatureSlider";
import PinterestGrid from "@/components/PinterestGrid";
import RightSidebar from "@/components/RightSidebar";
import BusinessCardForm from "@/components/BusinessCardForm";
import SiteFooter from "@/components/SiteFooter";
import AdSlot from "@/components/AdSlot";
import { ChevronLeft, ChevronRight } from "lucide-react";

export default function Index() {
  const [leftOpen, setLeftOpen] = useState(true);
  const [rightOpen, setRightOpen] = useState(true);

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

  // AdSlot imported from shared component

  return (
    <div className="min-h-screen flex flex-col">
      <SiteHeader />

      {/* Header ad */}
      <div className="container mx-auto px-4">
        <AdSlot placement="header" />
      </div>

      <main className="flex-1 container mx-auto px-4 py-4">
        <div className="flex gap-4">
          {/* Left sidebar toggle (mobile) + sidebar */}
          <aside className={`hidden lg:block transition-all duration-300 ${leftOpen ? "w-[28%] shrink-0" : "w-0 overflow-hidden"}`}>
            {leftOpen && <LeftSidebar />}
          </aside>

          {/* Toggle button - left */}
          <button
            onClick={() => setLeftOpen(!leftOpen)}
            className="hidden lg:flex items-center justify-center w-5 h-10 rounded-full bg-muted hover:bg-muted/80 self-start mt-2 shrink-0 transition-colors"
            title={leftOpen ? "সাইডবার বন্ধ" : "সাইডবার খুলুন"}
          >
            {leftOpen ? <ChevronLeft className="h-3 w-3" /> : <ChevronRight className="h-3 w-3" />}
          </button>

          {/* Main content */}
          <div className="flex-1 min-w-0 space-y-5">
            <FeatureSlider />

            <div className="section-divider">
              <span className="section-divider-text">{dividerText}</span>
            </div>

            <AdSlot placement="in-content" />

            <PinterestGrid />

            <BusinessCardForm />
          </div>

          {/* Toggle button - right */}
          <button
            onClick={() => setRightOpen(!rightOpen)}
            className="hidden lg:flex items-center justify-center w-5 h-10 rounded-full bg-muted hover:bg-muted/80 self-start mt-2 shrink-0 transition-colors"
            title={rightOpen ? "সাইডবার বন্ধ" : "সাইডবার খুলুন"}
          >
            {rightOpen ? <ChevronRight className="h-3 w-3" /> : <ChevronLeft className="h-3 w-3" />}
          </button>

          {/* Right sidebar */}
          <aside className={`hidden lg:block transition-all duration-300 ${rightOpen ? "w-[20%] shrink-0" : "w-0 overflow-hidden"}`}>
            {rightOpen && <RightSidebar />}
          </aside>
        </div>

        {/* Mobile sidebars as tabs */}
        <div className="lg:hidden mt-6 space-y-4">
          <MobileSidebarTabs />
        </div>
      </main>

      {/* Footer ad */}
      <div className="container mx-auto px-4">
        <AdSlot placement="footer" />
      </div>

      <SiteFooter />
    </div>
  );
}

function MobileSidebarTabs() {
  const [tab, setTab] = useState<"left" | "right">("left");
  return (
    <div className="bg-card rounded-xl border border-border overflow-hidden">
      <div className="flex border-b border-border">
        <button onClick={() => setTab("left")} className={`flex-1 py-2.5 text-sm font-heading font-semibold transition-all ${tab === "left" ? "bg-primary text-primary-foreground" : "text-muted-foreground hover:bg-muted"}`}>
          📰 পোস্ট সমূহ
        </button>
        <button onClick={() => setTab("right")} className={`flex-1 py-2.5 text-sm font-heading font-semibold transition-all ${tab === "right" ? "bg-primary text-primary-foreground" : "text-muted-foreground hover:bg-muted"}`}>
          📂 ডিরেক্টরি ও কার্ড
        </button>
      </div>
      <div className="p-3">
        {tab === "left" ? <LeftSidebar /> : <RightSidebar />}
      </div>
    </div>
  );
}
