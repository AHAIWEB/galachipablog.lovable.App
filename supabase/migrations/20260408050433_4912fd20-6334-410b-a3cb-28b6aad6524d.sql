
CREATE TABLE public.ads (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  name TEXT NOT NULL,
  content TEXT NOT NULL,
  image_url TEXT,
  placement TEXT NOT NULL DEFAULT 'sidebar',
  ad_type TEXT NOT NULL DEFAULT 'image',
  link_url TEXT,
  status TEXT NOT NULL DEFAULT 'active',
  click_count INTEGER NOT NULL DEFAULT 0,
  view_count INTEGER NOT NULL DEFAULT 0,
  start_date TIMESTAMP WITH TIME ZONE,
  end_date TIMESTAMP WITH TIME ZONE,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

ALTER TABLE public.ads ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Admins can manage ads" ON public.ads FOR ALL
  USING (has_role(auth.uid(), 'admin'::app_role));

CREATE POLICY "Active ads viewable by everyone" ON public.ads FOR SELECT
  USING (status = 'active');

CREATE TRIGGER update_ads_updated_at BEFORE UPDATE ON public.ads
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();
