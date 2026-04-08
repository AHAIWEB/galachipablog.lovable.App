
-- Add is_locked and deleted_at to posts
ALTER TABLE public.posts ADD COLUMN IF NOT EXISTS is_locked boolean NOT NULL DEFAULT false;
ALTER TABLE public.posts ADD COLUMN IF NOT EXISTS deleted_at timestamptz DEFAULT NULL;

-- Add is_locked and deleted_at to categories
ALTER TABLE public.categories ADD COLUMN IF NOT EXISTS is_locked boolean NOT NULL DEFAULT false;
ALTER TABLE public.categories ADD COLUMN IF NOT EXISTS deleted_at timestamptz DEFAULT NULL;

-- Prevent deleting locked posts
CREATE OR REPLACE FUNCTION public.prevent_locked_delete()
RETURNS trigger
LANGUAGE plpgsql
SET search_path = public
AS $$
BEGIN
  IF OLD.is_locked = true THEN
    RAISE EXCEPTION 'This item is locked and cannot be deleted';
  END IF;
  RETURN OLD;
END;
$$;

CREATE TRIGGER prevent_locked_post_delete
  BEFORE DELETE ON public.posts
  FOR EACH ROW
  EXECUTE FUNCTION public.prevent_locked_delete();

CREATE TRIGGER prevent_locked_category_delete
  BEFORE DELETE ON public.categories
  FOR EACH ROW
  EXECUTE FUNCTION public.prevent_locked_delete();
