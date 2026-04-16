import { NavLink as RouterNavLink } from "react-router-dom";
import {
  LayoutDashboard, FileText, FolderTree, CreditCard, Users, Rss, Activity,
  ImageIcon, Zap, Quote, Palette, Shield, Megaphone, Archive, PanelLeft, Link2, Calendar, Sparkles,
} from "lucide-react";

const navItems = [
  { to: "/admin", icon: LayoutDashboard, label: "ড্যাশবোর্ড", end: true },
  { to: "/admin/posts", icon: FileText, label: "কন্টেন্ট হাব" },
  { to: "/admin/categories", icon: FolderTree, label: "ক্যাটাগরি" },
  { to: "/admin/cards", icon: CreditCard, label: "বিজনেস কার্ড" },
  { to: "/admin/ads", icon: Megaphone, label: "বিজ্ঞাপন" },
  { to: "/admin/feeds", icon: Rss, label: "ফিড সোর্স" },
  { to: "/admin/users", icon: Users, label: "ইউজার" },
  { to: "/admin/settings", icon: Palette, label: "সেটিংস" },
  { to: "/admin/activity", icon: Activity, label: "অ্যাক্টিভিটি লগ" },
  { to: "/admin/photocard", icon: ImageIcon, label: "ফটোকার্ড মেকার" },
  { to: "/admin/webp", icon: Zap, label: "WebP কনভার্টার" },
  { to: "/admin/quotecard", icon: Quote, label: "কোট কার্ড" },
  { to: "/admin/security", icon: Shield, label: "সিকিউরিটি" },
  { to: "/admin/archive", icon: Archive, label: "আর্কাইভ হাব" },
  { to: "/admin/sidebar-widgets", icon: PanelLeft, label: "সাইডবার উইজেট" },
  { to: "/admin/website-links", icon: Link2, label: "ওয়েবসাইট লিংক" },
  { to: "/admin/this-day", icon: Calendar, label: "এই দিনে" },
  { to: "/admin/ai-card", icon: Sparkles, label: "AI কার্ড মেকার" },
];

export default function AdminSidebar() {
  return (
    <aside className="w-56 bg-card border-r border-border flex flex-col shrink-0 h-full overflow-y-auto">
      <nav className="flex-1 p-2 space-y-0.5">
        {navItems.map(item => (
          <RouterNavLink
            key={item.to}
            to={item.to}
            end={item.end}
            className={({ isActive }) =>
              `flex items-center gap-2.5 px-3 py-2 rounded-lg text-sm font-medium transition-colors ${
                isActive
                  ? "bg-primary text-primary-foreground"
                  : "text-foreground hover:bg-muted"
              }`
            }
          >
            <item.icon className="h-4 w-4" />
            {item.label}
          </RouterNavLink>
        ))}
      </nav>
    </aside>
  );
}
