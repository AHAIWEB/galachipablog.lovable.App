export default function SiteFooter() {
  return (
    <footer className="bg-header-bg text-header-foreground mt-8">
      <div className="container mx-auto px-4 py-8">
        <div className="grid grid-cols-2 md:grid-cols-4 gap-6">
          <div>
            <h4 className="font-heading font-bold text-sm mb-3">প্রতিষ্ঠান</h4>
            <ul className="space-y-1.5 text-xs opacity-70">
              <li><a href="#" className="hover:opacity-100 transition-opacity">আমাদের সম্পর্কে</a></li>
              <li><a href="#" className="hover:opacity-100 transition-opacity">যোগাযোগ</a></li>
            </ul>
          </div>
          <div>
            <h4 className="font-heading font-bold text-sm mb-3">আইনি</h4>
            <ul className="space-y-1.5 text-xs opacity-70">
              <li><a href="#" className="hover:opacity-100 transition-opacity">গোপনীয়তা নীতি</a></li>
              <li><a href="#" className="hover:opacity-100 transition-opacity">শর্তাবলী</a></li>
            </ul>
          </div>
          <div>
            <h4 className="font-heading font-bold text-sm mb-3">বিজ্ঞাপন</h4>
            <ul className="space-y-1.5 text-xs opacity-70">
              <li><a href="#" className="hover:opacity-100 transition-opacity">বিজ্ঞাপন দিন</a></li>
              <li><a href="#" className="hover:opacity-100 transition-opacity">মিডিয়া কিট</a></li>
            </ul>
          </div>
          <div>
            <h4 className="font-heading font-bold text-sm mb-3">সামাজিক মাধ্যম</h4>
            <ul className="space-y-1.5 text-xs opacity-70">
              <li><a href="#" className="hover:opacity-100 transition-opacity">ফেসবুক</a></li>
              <li><a href="#" className="hover:opacity-100 transition-opacity">ইউটিউব</a></li>
            </ul>
          </div>
        </div>
        <div className="border-t border-header-foreground/20 mt-6 pt-4 text-center text-xs opacity-50">
          © ২০২৬ গলাচিপা ব্লগ। সর্বস্বত্ব সংরক্ষিত।
        </div>
      </div>
    </footer>
  );
}
