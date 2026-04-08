
CREATE OR REPLACE FUNCTION public.increment_ad_view(ad_id uuid)
RETURNS void
LANGUAGE sql
SECURITY DEFINER
SET search_path = public
AS $$
  UPDATE public.ads SET view_count = view_count + 1 WHERE id = ad_id;
$$;

CREATE OR REPLACE FUNCTION public.increment_ad_click(ad_id uuid)
RETURNS void
LANGUAGE sql
SECURITY DEFINER
SET search_path = public
AS $$
  UPDATE public.ads SET click_count = click_count + 1 WHERE id = ad_id;
$$;
