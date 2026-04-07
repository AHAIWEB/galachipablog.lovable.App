import { useState } from "react";
import { useAuth } from "@/contexts/AuthContext";
import { Navigate, Outlet, Link } from "react-router-dom";
import AdminSidebar from "@/components/admin/AdminSidebar";
import { Menu, X, Home, Bell, User, LogOut } from "lucide-react";

export default function AdminLayout() {
  const { user, isAdmin, loading, signOut } = useAuth();
  const [sidebarOpen, setSidebarOpen] = useState(false);

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-background">
        <div className="flex flex-col items-center gap-3">
          <div className="h-8 w-8 border-3 border-primary border-t-transparent rounded-full animate-spin" />
          <p className="text-muted-foreground font-heading text-sm">লোড হচ্ছে...</p>
        </div>
      </div>
    );
  }

  if (!user) return <Navigate to="/auth" replace />;
  if (!isAdmin) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-background">
        <div className="text-center bg-card p-8 rounded-2xl border border-border shadow-lg max-w-sm">
          <div className="w-12 h-12 rounded-full bg-destructive/10 flex items-center justify-center mx-auto mb-4">
            <X className="h-6 w-6 text-destructive" />
          </div>
          <h1 className="font-heading font-bold text-xl mb-2">অ্যাক্সেস নেই</h1>
          <p className="text-muted-foreground text-sm mb-4">আপনার এডমিন অনুমতি নেই।</p>
          <Link to="/" className="text-primary text-sm font-medium hover:underline">হোমে ফিরুন</Link>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen flex flex-col bg-background">
      {/* Admin Top Header */}
      <header className="h-12 bg-card border-b border-border flex items-center justify-between px-4 shrink-0 z-50 sticky top-0">
        <div className="flex items-center gap-3">
          <button
            onClick={() => setSidebarOpen(!sidebarOpen)}
            className="lg:hidden p-1.5 rounded-lg hover:bg-muted"
          >
            {sidebarOpen ? <X className="h-5 w-5" /> : <Menu className="h-5 w-5" />}
          </button>
          <Link to="/admin" className="font-heading font-bold text-sm text-primary">
            ⚡ এডমিন প্যানেল
          </Link>
        </div>
        <div className="flex items-center gap-1">
          <Link to="/" className="p-2 rounded-lg hover:bg-muted text-muted-foreground hover:text-foreground transition-colors" title="সাইটে যান">
            <Home className="h-4 w-4" />
          </Link>
          <button className="p-2 rounded-lg hover:bg-muted text-muted-foreground hover:text-foreground transition-colors relative" title="নোটিফিকেশন">
            <Bell className="h-4 w-4" />
          </button>
          <Link to="/profile" className="p-2 rounded-lg hover:bg-muted text-muted-foreground hover:text-foreground transition-colors" title="প্রোফাইল">
            <User className="h-4 w-4" />
          </Link>
          <button onClick={signOut} className="p-2 rounded-lg hover:bg-destructive/10 text-muted-foreground hover:text-destructive transition-colors" title="লগআউট">
            <LogOut className="h-4 w-4" />
          </button>
        </div>
      </header>

      <div className="flex flex-1 overflow-hidden">
        {/* Sidebar */}
        <div className={`
          fixed inset-y-12 left-0 z-40 transform transition-transform duration-300
          lg:relative lg:inset-y-0 lg:translate-x-0
          ${sidebarOpen ? "translate-x-0" : "-translate-x-full"}
        `}>
          <AdminSidebar />
        </div>

        {/* Overlay for mobile */}
        {sidebarOpen && (
          <div className="fixed inset-0 bg-foreground/30 z-30 lg:hidden" style={{ top: 48 }} onClick={() => setSidebarOpen(false)} />
        )}

        <main className="flex-1 p-4 lg:p-6 overflow-auto">
          <Outlet />
        </main>
      </div>
    </div>
  );
}
