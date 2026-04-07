import { NavLink as RouterNavLink } from "react-router-dom";
import { useAuth } from "@/contexts/AuthContext";
import {
  LayoutDashboard,
  FileText,
  FolderTree,
  CreditCard,
  Palette,
  Users,
  Rss,
  Activity,
  LogOut,
  Home,
} from "lucide-react";

const navItems = [
  { to: "/admin", icon: LayoutDashboard, label: "ড্যাশবোর্ড", end: true },
  { to: "/admin/posts", icon: FileText, label: "কন্টেন্ট হাব" },
  { to: "/admin/categories", icon: FolderTree, label: "ক্যাটাগরি" },
  { to: "/admin/cards", icon: CreditCard, label: "বিজনেস কার্ড" },
  { to: "/admin/feeds", icon: Rss, label: "ফিড সোর্স" },
  { to: "/admin/users", icon: Users, label: "ইউজার" },
  { to: "/admin/settings", icon: Palette, label: "সেটিংস" },
  { to: "/admin/activity", icon: Activity, label: "অ্যাক্টিভিটি লগ" },
];

export default function AdminSidebar() {
  const { signOut } = useAuth();

  return (
    <aside className="w-60 bg-card border-r border-border flex flex-col shrink-0">
      <div className="p-4 border-b border-border">
        <h2 className="font-heading font-bold text-lg">এডমিন প্যানেল</h2>
      </div>

      <nav className="flex-1 p-2 space-y-0.5 overflow-y-auto">
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

      <div className="p-2 border-t border-border space-y-0.5">
        <RouterNavLink
          to="/"
          className="flex items-center gap-2.5 px-3 py-2 rounded-lg text-sm font-medium text-foreground hover:bg-muted transition-colors"
        >
          <Home className="h-4 w-4" />
          সাইটে যান
        </RouterNavLink>
        <button
          onClick={signOut}
          className="flex items-center gap-2.5 px-3 py-2 rounded-lg text-sm font-medium text-destructive hover:bg-destructive/10 transition-colors w-full text-left"
        >
          <LogOut className="h-4 w-4" />
          লগআউট
        </button>
      </div>
    </aside>
  );
}
