import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { BrowserRouter, Route, Routes } from "react-router-dom";
import { Toaster as Sonner } from "@/components/ui/sonner";
import { Toaster } from "@/components/ui/toaster";
import { TooltipProvider } from "@/components/ui/tooltip";
import { AuthProvider } from "@/contexts/AuthContext";
import Index from "./pages/Index";
import PostDetail from "./pages/PostDetail";
import CategoryPage from "./pages/CategoryPage";
import ProfilePage from "./pages/ProfilePage";
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
import AdminQuoteCard from "./pages/admin/AdminQuoteCard";
import AdminSecurity from "./pages/admin/AdminSecurity";
import AdminAds from "./pages/admin/AdminAds";
import AdminArchiveHub from "./pages/admin/AdminArchiveHub";
import AdminSidebarWidgets from "./pages/admin/AdminSidebarWidgets";
import AdminWebsiteLinks from "./pages/admin/AdminWebsiteLinks";
import AdminThisDay from "./pages/admin/AdminThisDay";
import AdminAiCard from "./pages/admin/AdminAiCard";
import AboutPage from "./pages/AboutPage";
import PrivacyPage from "./pages/PrivacyPage";
import TermsPage from "./pages/TermsPage";
import WebsiteLinksPage from "./pages/WebsiteLinksPage";
import GalleryPage from "./pages/GalleryPage";
import WorldCupPage from "./pages/WorldCupPage";
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
            <Route path="/category/:slug" element={<CategoryPage />} />
            <Route path="/profile" element={<ProfilePage />} />
            <Route path="/auth" element={<AuthPage />} />
            <Route path="/about" element={<AboutPage />} />
            <Route path="/privacy" element={<PrivacyPage />} />
            <Route path="/terms" element={<TermsPage />} />
            <Route path="/website-links" element={<WebsiteLinksPage />} />
            <Route path="/gallery" element={<GalleryPage />} />
            <Route path="/worldcup" element={<WorldCupPage />} />
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
              <Route path="quotecard" element={<AdminQuoteCard />} />
              <Route path="security" element={<AdminSecurity />} />
              <Route path="ads" element={<AdminAds />} />
              <Route path="archive" element={<AdminArchiveHub />} />
              <Route path="sidebar-widgets" element={<AdminSidebarWidgets />} />
              <Route path="website-links" element={<AdminWebsiteLinks />} />
              <Route path="this-day" element={<AdminThisDay />} />
              <Route path="ai-card" element={<AdminAiCard />} />
            </Route>
            <Route path="*" element={<NotFound />} />
          </Routes>
        </BrowserRouter>
      </TooltipProvider>
    </AuthProvider>
  </QueryClientProvider>
);

export default App;
