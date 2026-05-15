
-- 1. Fix business_cards: prevent self-approval on insert
DROP POLICY IF EXISTS "Users can submit cards" ON public.business_cards;
CREATE POLICY "Users can submit cards"
ON public.business_cards
FOR INSERT
TO authenticated
WITH CHECK (auth.uid() = user_id AND status = 'pending'::card_status);

-- 2. Fix activity_log: users can only insert their own activity
DROP POLICY IF EXISTS "Authenticated users can insert activity log" ON public.activity_log;
CREATE POLICY "Users can insert their own activity"
ON public.activity_log
FOR INSERT
TO authenticated
WITH CHECK (auth.uid() = user_id);

-- 3. Fix post-images storage: require admin role for write/update/delete
DO $$
DECLARE pol record;
BEGIN
  FOR pol IN
    SELECT policyname FROM pg_policies
    WHERE schemaname='storage' AND tablename='objects'
      AND (policyname ILIKE '%post-images%' OR policyname ILIKE '%post images%' OR policyname ILIKE '%post_images%')
  LOOP
    EXECUTE format('DROP POLICY IF EXISTS %I ON storage.objects', pol.policyname);
  END LOOP;
END $$;

CREATE POLICY "Public can read post-images"
ON storage.objects FOR SELECT
USING (bucket_id = 'post-images');

CREATE POLICY "Admins can upload post-images"
ON storage.objects FOR INSERT
TO authenticated
WITH CHECK (bucket_id = 'post-images' AND public.has_role(auth.uid(), 'admin'::app_role));

CREATE POLICY "Admins can update post-images"
ON storage.objects FOR UPDATE
TO authenticated
USING (bucket_id = 'post-images' AND public.has_role(auth.uid(), 'admin'::app_role));

CREATE POLICY "Admins can delete post-images"
ON storage.objects FOR DELETE
TO authenticated
USING (bucket_id = 'post-images' AND public.has_role(auth.uid(), 'admin'::app_role));
