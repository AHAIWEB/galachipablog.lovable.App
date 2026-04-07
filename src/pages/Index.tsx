import SiteHeader from "@/components/SiteHeader";
import LeftSidebar from "@/components/LeftSidebar";
import FeatureSlider from "@/components/FeatureSlider";
import PinterestGrid from "@/components/PinterestGrid";
import RightSidebar from "@/components/RightSidebar";
import BusinessCardForm from "@/components/BusinessCardForm";
import SiteFooter from "@/components/SiteFooter";

export default function Index() {
  return (
    <div className="min-h-screen flex flex-col">
      <SiteHeader />

      <main className="flex-1 container mx-auto px-4 py-6">
        {/* 3-column layout */}
        <div className="grid grid-cols-1 lg:grid-cols-[30%_1fr_20%] gap-5">
          {/* Left */}
          <aside className="order-2 lg:order-1">
            <LeftSidebar />
          </aside>

          {/* Center */}
          <div className="order-1 lg:order-2 space-y-6">
            <FeatureSlider />

            <div className="section-divider">
              <span className="section-divider-text">গলাচিপার স্পন্দন</span>
            </div>

            <PinterestGrid />

            <BusinessCardForm />
          </div>

          {/* Right */}
          <aside className="order-3">
            <RightSidebar />
          </aside>
        </div>
      </main>

      <SiteFooter />
    </div>
  );
}
