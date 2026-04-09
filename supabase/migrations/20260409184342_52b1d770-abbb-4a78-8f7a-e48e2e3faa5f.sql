
-- Post images table
CREATE TABLE public.post_images (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  post_id uuid REFERENCES public.posts(id) ON DELETE CASCADE NOT NULL,
  image_url text NOT NULL,
  caption text,
  sort_order integer NOT NULL DEFAULT 0,
  created_at timestamptz NOT NULL DEFAULT now()
);

ALTER TABLE public.post_images ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Post images viewable by everyone" ON public.post_images FOR SELECT USING (true);
CREATE POLICY "Admins can manage post images" ON public.post_images FOR ALL USING (has_role(auth.uid(), 'admin'::app_role));

CREATE INDEX idx_post_images_post_id ON public.post_images(post_id);

-- Website links archive table
CREATE TABLE public.website_links (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  url text NOT NULL,
  title text NOT NULL,
  description text,
  favicon_url text,
  letter text NOT NULL DEFAULT '',
  category_id uuid REFERENCES public.categories(id) ON DELETE SET NULL,
  status text NOT NULL DEFAULT 'active',
  sort_order integer NOT NULL DEFAULT 0,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

ALTER TABLE public.website_links ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Website links viewable by everyone" ON public.website_links FOR SELECT USING (true);
CREATE POLICY "Admins can manage website links" ON public.website_links FOR ALL USING (has_role(auth.uid(), 'admin'::app_role));

CREATE INDEX idx_website_links_letter ON public.website_links(letter);

CREATE TRIGGER update_website_links_updated_at BEFORE UPDATE ON public.website_links
FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

-- Sidebar widgets table
CREATE TABLE public.sidebar_widgets (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  widget_type text NOT NULL,
  title text NOT NULL,
  config jsonb NOT NULL DEFAULT '{}'::jsonb,
  sidebar text NOT NULL DEFAULT 'left',
  sort_order integer NOT NULL DEFAULT 0,
  is_active boolean NOT NULL DEFAULT true,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

ALTER TABLE public.sidebar_widgets ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Sidebar widgets viewable by everyone" ON public.sidebar_widgets FOR SELECT USING (true);
CREATE POLICY "Admins can manage sidebar widgets" ON public.sidebar_widgets FOR ALL USING (has_role(auth.uid(), 'admin'::app_role));

CREATE TRIGGER update_sidebar_widgets_updated_at BEFORE UPDATE ON public.sidebar_widgets
FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

-- Storage bucket for post images
INSERT INTO storage.buckets (id, name, public) VALUES ('post-images', 'post-images', true);

CREATE POLICY "Post images are publicly accessible" ON storage.objects FOR SELECT USING (bucket_id = 'post-images');
CREATE POLICY "Admins can upload post images" ON storage.objects FOR INSERT WITH CHECK (bucket_id = 'post-images' AND auth.uid() IS NOT NULL);
CREATE POLICY "Admins can update post images" ON storage.objects FOR UPDATE USING (bucket_id = 'post-images' AND auth.uid() IS NOT NULL);
CREATE POLICY "Admins can delete post images" ON storage.objects FOR DELETE USING (bucket_id = 'post-images' AND auth.uid() IS NOT NULL);
