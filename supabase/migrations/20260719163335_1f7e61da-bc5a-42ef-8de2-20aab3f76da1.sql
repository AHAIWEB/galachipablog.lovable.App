REVOKE EXECUTE ON FUNCTION public.admin_list_users() FROM PUBLIC;
REVOKE EXECUTE ON FUNCTION public.admin_list_users() FROM anon;
GRANT EXECUTE ON FUNCTION public.admin_list_users() TO authenticated;
GRANT EXECUTE ON FUNCTION public.admin_list_users() TO service_role;

REVOKE EXECUTE ON FUNCTION public.admin_set_user_role(uuid, public.app_role, boolean) FROM PUBLIC;
REVOKE EXECUTE ON FUNCTION public.admin_set_user_role(uuid, public.app_role, boolean) FROM anon;
GRANT EXECUTE ON FUNCTION public.admin_set_user_role(uuid, public.app_role, boolean) TO authenticated;
GRANT EXECUTE ON FUNCTION public.admin_set_user_role(uuid, public.app_role, boolean) TO service_role;

REVOKE EXECUTE ON FUNCTION public.admin_set_user_verified(uuid, boolean) FROM PUBLIC;
REVOKE EXECUTE ON FUNCTION public.admin_set_user_verified(uuid, boolean) FROM anon;
GRANT EXECUTE ON FUNCTION public.admin_set_user_verified(uuid, boolean) TO authenticated;
GRANT EXECUTE ON FUNCTION public.admin_set_user_verified(uuid, boolean) TO service_role;