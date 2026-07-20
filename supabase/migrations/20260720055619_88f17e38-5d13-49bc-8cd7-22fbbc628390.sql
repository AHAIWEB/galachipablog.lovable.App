
-- Remove listing/select policies on public buckets (files remain publicly accessible via known URLs since buckets are public)
DROP POLICY IF EXISTS "Public can read post-images" ON storage.objects;
DROP POLICY IF EXISTS "Site assets are publicly accessible" ON storage.objects;

-- Lock down SECURITY DEFINER functions: revoke broad execute, grant only what's necessary
REVOKE EXECUTE ON FUNCTION public.admin_list_users() FROM PUBLIC, anon;
REVOKE EXECUTE ON FUNCTION public.admin_set_user_role(uuid, public.app_role, boolean) FROM PUBLIC, anon;
REVOKE EXECUTE ON FUNCTION public.admin_set_user_verified(uuid, boolean) FROM PUBLIC, anon;
-- (authenticated keeps execute; the functions internally enforce has_role('admin'))

REVOKE EXECUTE ON FUNCTION public.has_role(uuid, public.app_role) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.has_role(uuid, public.app_role) TO authenticated;

REVOKE EXECUTE ON FUNCTION public.increment_ad_view(uuid) FROM PUBLIC;
REVOKE EXECUTE ON FUNCTION public.increment_ad_click(uuid) FROM PUBLIC;
REVOKE EXECUTE ON FUNCTION public.increment_share_count(uuid) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.increment_ad_view(uuid) TO anon, authenticated;
GRANT EXECUTE ON FUNCTION public.increment_ad_click(uuid) TO anon, authenticated;
GRANT EXECUTE ON FUNCTION public.increment_share_count(uuid) TO anon, authenticated;

-- Trigger-only functions: revoke from client roles
REVOKE EXECUTE ON FUNCTION public.handle_new_user() FROM PUBLIC, anon, authenticated;
REVOKE EXECUTE ON FUNCTION public.update_comment_likes_count() FROM PUBLIC, anon, authenticated;
REVOKE EXECUTE ON FUNCTION public.protect_profile_admin_fields() FROM PUBLIC, anon, authenticated;
REVOKE EXECUTE ON FUNCTION public.prevent_locked_delete() FROM PUBLIC, anon, authenticated;
REVOKE EXECUTE ON FUNCTION public.update_updated_at_column() FROM PUBLIC, anon, authenticated;
