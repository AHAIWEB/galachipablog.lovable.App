import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { BrowserRouter, Route, Routes } from "react-router-dom";
import { Toaster as Sonner } from "@/components/ui/sonner";
import { Toaster } from "@/components/ui/toaster";
import { TooltipProvider } from "@/components/ui/tooltip";
import { AuthProvider } from "@/contexts/AuthContext";
import Index from "./pages/Index";
import PostDetail from "./pages/PostDetail";
import AuthPage from "./pages/AuthPage";
import AdminLayout from "./layouts/AdminLayout";
import AdminDashboard from "./pages/admin/AdminDashboard";
import AdminPosts from "./pages/admin/AdminPosts";
import AdminCategories from "./pages/admin/AdminCategories";
import AdminCards from "./pages/admin/AdminCards";
import AdminFeeds from "./pages/admin/AdminFeeds";
import AdminSettings from "./pages/admin/AdminSettings";
import AdminUsers from "./pages/admin/AdminUsers";
import AdminActivity from "./pages/admin/AdminActivity";
import AdminPhotocard from "./pages/admin/AdminPhotocard";
import AdminWebP from "./pages/admin/AdminWebP";
import NotFound from "./pages/NotFound";

const queryClient = new QueryClient();

const App = () => (
  <QueryClientProvider client={queryClient}>
    <AuthProvider>
      <TooltipProvider>
        <Toaster />
        <Sonner />
        <BrowserRouter>
          <Routes>
            <Route path="/" element={<Index />} />
            <Route path="/post/:slug" element={<PostDetail />} />
            <Route path="/auth" element={<AuthPage />} />
            <Route path="/admin" element={<AdminLayout />}>
              <Route index element={<AdminDashboard />} />
              <Route path="posts" element={<AdminPosts />} />
              <Route path="categories" element={<AdminCategories />} />
              <Route path="cards" element={<AdminCards />} />
              <Route path="feeds" element={<AdminFeeds />} />
              <Route path="settings" element={<AdminSettings />} />
              <Route path="users" element={<AdminUsers />} />
              <Route path="activity" element={<AdminActivity />} />
              <Route path="photocard" element={<AdminPhotocard />} />
              <Route path="webp" element={<AdminWebP />} />
            </Route>
            <Route path="*" element={<NotFound />} />
          </Routes>
        </BrowserRouter>
      </TooltipProvider>
    </AuthProvider>
  </QueryClientProvider>
);

export default App;
