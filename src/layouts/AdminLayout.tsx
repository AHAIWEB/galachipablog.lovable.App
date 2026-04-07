import { useState } from "react";
import { useAuth } from "@/contexts/AuthContext";
import { Navigate, Outlet } from "react-router-dom";
import AdminSidebar from "@/components/admin/AdminSidebar";
import { Menu, X } from "lucide-react";

export default function AdminLayout() {
  const { user, isAdmin, loading } = useAuth();
  const [sidebarOpen, setSidebarOpen] = useState(false);

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-background">
        <p className="text-muted-foreground font-heading">লোড হচ্ছে...</p>
      </div>
    );
  }

  if (!user) return <Navigate to="/auth" replace />;
  if (!isAdmin) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-background">
        <div className="text-center">
          <h1 className="font-heading font-bold text-2xl mb-2">অ্যাক্সেস নেই</h1>
          <p className="text-muted-foreground">আপনার এডমিন অনুমতি নেই।</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen flex bg-background">
      {/* Mobile toggle */}
      <button
        onClick={() => setSidebarOpen(!sidebarOpen)}
        className="lg:hidden fixed top-3 left-3 z-50 p-2 rounded-lg bg-card border border-border shadow-md"
      >
        {sidebarOpen ? <X className="h-5 w-5" /> : <Menu className="h-5 w-5" />}
      </button>

      {/* Sidebar */}
      <div className={`
        fixed inset-y-0 left-0 z-40 transform transition-transform duration-300
        lg:relative lg:translate-x-0
        ${sidebarOpen ? "translate-x-0" : "-translate-x-full"}
      `}>
        <AdminSidebar />
      </div>

      {/* Overlay for mobile */}
      {sidebarOpen && (
        <div className="fixed inset-0 bg-foreground/30 z-30 lg:hidden" onClick={() => setSidebarOpen(false)} />
      )}

      <main className="flex-1 p-4 lg:p-6 overflow-auto pt-14 lg:pt-6">
        <Outlet />
      </main>
    </div>
  );
}
