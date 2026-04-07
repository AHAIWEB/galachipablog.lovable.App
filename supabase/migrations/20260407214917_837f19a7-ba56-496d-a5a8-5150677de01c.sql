
-- Create app_role enum
CREATE TYPE public.app_role AS ENUM ('admin', 'moderator', 'user');

-- Create post_status enum
CREATE TYPE public.post_status AS ENUM ('draft', 'published', 'archived');

-- Create card_status enum
CREATE TYPE public.card_status AS ENUM ('pending', 'approved', 'rejected');

-- Create category_type enum
CREATE TYPE public.category_type AS ENUM ('news', 'blog', 'directory');

-- Create feed_type enum
CREATE TYPE public.feed_type AS ENUM ('rss', 'scrape');

-- Create article_status enum
CREATE TYPE public.article_status AS ENUM ('fetched', 'processed', 'published', 'rejected');

-- ========================
-- PROFILES
-- ========================
CREATE TABLE public.profiles (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL UNIQUE,
  display_name TEXT,
  avatar_url TEXT,
  bio TEXT,
  is_verified BOOLEAN NOT NULL DEFAULT false,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

ALTER TABLE public.profiles ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Profiles are viewable by everyone" ON public.profiles FOR SELECT USING (true);
CREATE POLICY "Users can update own profile" ON public.profiles FOR UPDATE USING (auth.uid() = user_id);
CREATE POLICY "Users can insert own profile" ON public.profiles FOR INSERT WITH CHECK (auth.uid() = user_id);

-- ========================
-- USER ROLES
-- ========================
CREATE TABLE public.user_roles (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL,
  role app_role NOT NULL,
  UNIQUE(user_id, role)
);

ALTER TABLE public.user_roles ENABLE ROW LEVEL SECURITY;

-- Security definer function to check roles (avoids recursive RLS)
CREATE OR REPLACE FUNCTION public.has_role(_user_id UUID, _role app_role)
RETURNS BOOLEAN
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT EXISTS (
    SELECT 1 FROM public.user_roles
    WHERE user_id = _user_id AND role = _role
  )
$$;

CREATE POLICY "Users can view own roles" ON public.user_roles FOR SELECT USING (auth.uid() = user_id);
CREATE POLICY "Admins can manage roles" ON public.user_roles FOR ALL USING (public.has_role(auth.uid(), 'admin'));

-- ========================
-- CATEGORIES
-- ========================
CREATE TABLE public.categories (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name TEXT NOT NULL,
  slug TEXT NOT NULL UNIQUE,
  type category_type NOT NULL,
  parent_id UUID REFERENCES public.categories(id) ON DELETE SET NULL,
  letter TEXT,
  sort_order INT NOT NULL DEFAULT 0,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

ALTER TABLE public.categories ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Categories are viewable by everyone" ON public.categories FOR SELECT USING (true);
CREATE POLICY "Admins can manage categories" ON public.categories FOR ALL USING (public.has_role(auth.uid(), 'admin'));

CREATE INDEX idx_categories_type ON public.categories(type);
CREATE INDEX idx_categories_letter ON public.categories(letter);

-- ========================
-- POSTS
-- ========================
CREATE TABLE public.posts (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  title TEXT NOT NULL,
  slug TEXT NOT NULL UNIQUE,
  content TEXT,
  excerpt TEXT,
  featured_image TEXT,
  category_id UUID REFERENCES public.categories(id) ON DELETE SET NULL,
  author_id UUID REFERENCES auth.users(id) ON DELETE SET NULL,
  status post_status NOT NULL DEFAULT 'draft',
  is_featured BOOLEAN NOT NULL DEFAULT false,
  view_count INT NOT NULL DEFAULT 0,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

ALTER TABLE public.posts ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Published posts are viewable by everyone" ON public.posts FOR SELECT USING (status = 'published' OR public.has_role(auth.uid(), 'admin'));
CREATE POLICY "Admins can manage posts" ON public.posts FOR INSERT WITH CHECK (public.has_role(auth.uid(), 'admin'));
CREATE POLICY "Admins can update posts" ON public.posts FOR UPDATE USING (public.has_role(auth.uid(), 'admin'));
CREATE POLICY "Admins can delete posts" ON public.posts FOR DELETE USING (public.has_role(auth.uid(), 'admin'));

CREATE INDEX idx_posts_status ON public.posts(status);
CREATE INDEX idx_posts_category ON public.posts(category_id);
CREATE INDEX idx_posts_featured ON public.posts(is_featured) WHERE is_featured = true;

-- ========================
-- BUSINESS CARDS
-- ========================
CREATE TABLE public.business_cards (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID REFERENCES auth.users(id) ON DELETE SET NULL,
  name TEXT NOT NULL,
  title TEXT,
  organization TEXT,
  phone TEXT NOT NULL,
  email TEXT,
  logo_url TEXT,
  card_image_url TEXT,
  status card_status NOT NULL DEFAULT 'pending',
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

ALTER TABLE public.business_cards ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Approved cards viewable by everyone" ON public.business_cards FOR SELECT USING (status = 'approved' OR auth.uid() = user_id OR public.has_role(auth.uid(), 'admin'));
CREATE POLICY "Users can submit cards" ON public.business_cards FOR INSERT WITH CHECK (auth.uid() = user_id);
CREATE POLICY "Admins can manage cards" ON public.business_cards FOR UPDATE USING (public.has_role(auth.uid(), 'admin'));
CREATE POLICY "Admins can delete cards" ON public.business_cards FOR DELETE USING (public.has_role(auth.uid(), 'admin'));

-- ========================
-- SITE SETTINGS
-- ========================
CREATE TABLE public.site_settings (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  key TEXT NOT NULL UNIQUE,
  value TEXT,
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

ALTER TABLE public.site_settings ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Settings are viewable by everyone" ON public.site_settings FOR SELECT USING (true);
CREATE POLICY "Admins can manage settings" ON public.site_settings FOR ALL USING (public.has_role(auth.uid(), 'admin'));

-- ========================
-- FEED SOURCES (RSS / URL Fetcher)
-- ========================
CREATE TABLE public.feed_sources (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name TEXT NOT NULL,
  url TEXT NOT NULL,
  type feed_type NOT NULL DEFAULT 'rss',
  category_id UUID REFERENCES public.categories(id) ON DELETE SET NULL,
  fetch_interval_minutes INT NOT NULL DEFAULT 5,
  is_active BOOLEAN NOT NULL DEFAULT true,
  last_fetched_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

ALTER TABLE public.feed_sources ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Admins can manage feeds" ON public.feed_sources FOR ALL USING (public.has_role(auth.uid(), 'admin'));

-- ========================
-- FETCHED ARTICLES
-- ========================
CREATE TABLE public.fetched_articles (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  source_id UUID REFERENCES public.feed_sources(id) ON DELETE CASCADE NOT NULL,
  title TEXT NOT NULL,
  content TEXT,
  excerpt TEXT,
  original_url TEXT UNIQUE,
  featured_image TEXT,
  status article_status NOT NULL DEFAULT 'fetched',
  published_to_post_id UUID REFERENCES public.posts(id) ON DELETE SET NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

ALTER TABLE public.fetched_articles ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Admins can manage articles" ON public.fetched_articles FOR ALL USING (public.has_role(auth.uid(), 'admin'));

-- ========================
-- ACTIVITY LOG
-- ========================
CREATE TABLE public.activity_log (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID REFERENCES auth.users(id) ON DELETE SET NULL,
  action TEXT NOT NULL,
  entity_type TEXT,
  entity_id UUID,
  details JSONB,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

ALTER TABLE public.activity_log ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Admins can view activity log" ON public.activity_log FOR SELECT USING (public.has_role(auth.uid(), 'admin'));
CREATE POLICY "System can insert activity log" ON public.activity_log FOR INSERT WITH CHECK (true);

-- ========================
-- TRIGGERS
-- ========================
CREATE OR REPLACE FUNCTION public.update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SET search_path = public;

CREATE TRIGGER update_profiles_updated_at BEFORE UPDATE ON public.profiles FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();
CREATE TRIGGER update_categories_updated_at BEFORE UPDATE ON public.categories FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();
CREATE TRIGGER update_posts_updated_at BEFORE UPDATE ON public.posts FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();
CREATE TRIGGER update_business_cards_updated_at BEFORE UPDATE ON public.business_cards FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();
CREATE TRIGGER update_site_settings_updated_at BEFORE UPDATE ON public.site_settings FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();
CREATE TRIGGER update_feed_sources_updated_at BEFORE UPDATE ON public.feed_sources FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();
CREATE TRIGGER update_fetched_articles_updated_at BEFORE UPDATE ON public.fetched_articles FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

-- Auto-create profile on signup
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS TRIGGER AS $$
BEGIN
  INSERT INTO public.profiles (user_id, display_name)
  VALUES (NEW.id, COALESCE(NEW.raw_user_meta_data->>'display_name', NEW.email));
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER SET search_path = public;

CREATE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW EXECUTE FUNCTION public.handle_new_user();

-- Insert default site settings
INSERT INTO public.site_settings (key, value) VALUES
  ('site_name', 'গলাচিপা ব্লগ'),
  ('divider_text', 'গলাচিপার স্পন্দন'),
  ('primary_color', '#1a56a8'),
  ('logo_url', '');
