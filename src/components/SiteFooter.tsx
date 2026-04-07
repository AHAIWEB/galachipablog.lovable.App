import { Link } from "react-router-dom";
import { Facebook, Youtube, Mail, MapPin, Phone } from "lucide-react";

export default function SiteFooter() {
  return (
    <footer className="bg-header-bg text-header-foreground mt-8">
      <div className="container mx-auto px-4 py-10">
        <div className="grid grid-cols-2 md:grid-cols-4 gap-8">
          <div>
            <h4 className="font-heading font-bold text-base mb-4 gradient-text">গলাচিপা ব্লগ</h4>
            <p className="text-xs opacity-60 leading-relaxed">
              গলাচিপার খবর, মতামত, ব্লগ ও ডিরেক্টরি — সবকিছু এক জায়গায়।
            </p>
            <div className="flex gap-2 mt-4">
              <a href="#" className="p-2 rounded-lg bg-header-foreground/10 hover:bg-header-foreground/20 transition-colors">
                <Facebook className="h-4 w-4" />
              </a>
              <a href="#" className="p-2 rounded-lg bg-header-foreground/10 hover:bg-header-foreground/20 transition-colors">
                <Youtube className="h-4 w-4" />
              </a>
              <a href="#" className="p-2 rounded-lg bg-header-foreground/10 hover:bg-header-foreground/20 transition-colors">
                <Mail className="h-4 w-4" />
              </a>
            </div>
          </div>
          <div>
            <h4 className="font-heading font-bold text-sm mb-3">দ্রুত লিংক</h4>
            <ul className="space-y-2 text-xs opacity-70">
              <li><Link to="/" className="hover:opacity-100 hover:underline transition-all">হোম পেজ</Link></li>
              <li><a href="#" className="hover:opacity-100 hover:underline transition-all">আমাদের সম্পর্কে</a></li>
              <li><a href="#" className="hover:opacity-100 hover:underline transition-all">বিজ্ঞাপন দিন</a></li>
              <li><Link to="/auth" className="hover:opacity-100 hover:underline transition-all">লগইন</Link></li>
            </ul>
          </div>
          <div>
            <h4 className="font-heading font-bold text-sm mb-3">আইনি</h4>
            <ul className="space-y-2 text-xs opacity-70">
              <li><a href="#" className="hover:opacity-100 hover:underline transition-all">গোপনীয়তা নীতি</a></li>
              <li><a href="#" className="hover:opacity-100 hover:underline transition-all">শর্তাবলী</a></li>
              <li><a href="#" className="hover:opacity-100 hover:underline transition-all">কুকি নীতি</a></li>
              <li><a href="#" className="hover:opacity-100 hover:underline transition-all">ডিসক্লেইমার</a></li>
            </ul>
          </div>
          <div>
            <h4 className="font-heading font-bold text-sm mb-3">যোগাযোগ</h4>
            <ul className="space-y-2 text-xs opacity-70">
              <li className="flex items-center gap-2"><MapPin className="h-3.5 w-3.5 shrink-0" /> গলাচিপা, পটুয়াখালী</li>
              <li className="flex items-center gap-2"><Phone className="h-3.5 w-3.5 shrink-0" /> ০১৭XX-XXXXXX</li>
              <li className="flex items-center gap-2"><Mail className="h-3.5 w-3.5 shrink-0" /> info@galachipa.blog</li>
            </ul>
          </div>
        </div>
        <div className="border-t border-header-foreground/15 mt-8 pt-5 flex flex-col sm:flex-row items-center justify-between gap-2 text-xs opacity-40">
          <p>© ২০২৬ গলাচিপা ব্লগ। সর্বস্বত্ব সংরক্ষিত।</p>
          <p>❤️ বাংলায় তৈরি</p>
        </div>
      </div>
    </footer>
  );
}
