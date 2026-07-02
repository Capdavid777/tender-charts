REVOKE EXECUTE ON FUNCTION public.hash_password(text) FROM PUBLIC, anon, authenticated;
REVOKE EXECUTE ON FUNCTION public.verify_password(text, text) FROM PUBLIC, anon, authenticated;
GRANT EXECUTE ON FUNCTION public.hash_password(text) TO service_role;
GRANT EXECUTE ON FUNCTION public.verify_password(text, text) TO service_role;