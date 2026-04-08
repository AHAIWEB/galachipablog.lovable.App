
-- Add share_count to posts
ALTER TABLE public.posts ADD COLUMN share_count integer NOT NULL DEFAULT 0;

-- Create bookmarks table
CREATE TABLE public.bookmarks (
  id uuid NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id uuid NOT NULL,
  post_id uuid NOT NULL REFERENCES public.posts(id) ON DELETE CASCADE,
  created_at timestamp with time zone NOT NULL DEFAULT now(),
  UNIQUE(user_id, post_id)
);

ALTER TABLE public.bookmarks ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view own bookmarks" ON public.bookmarks
  FOR SELECT USING (auth.uid() = user_id);

CREATE POLICY "Users can add bookmarks" ON public.bookmarks
  FOR INSERT WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can remove bookmarks" ON public.bookmarks
  FOR DELETE USING (auth.uid() = user_id);

-- Function to increment share count
CREATE OR REPLACE FUNCTION public.increment_share_count(p_post_id uuid)
RETURNS void
LANGUAGE sql
SECURITY DEFINER
SET search_path = public
AS $$
  UPDATE public.posts SET share_count = share_count + 1 WHERE id = p_post_id;
$$;
