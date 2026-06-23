-- 1) Pin search_path on the 4 SECURITY DEFINER queue helpers
ALTER FUNCTION public.enqueue_email(text, jsonb)   SET search_path = public, extensions, pgmq;
ALTER FUNCTION public.read_email_batch(text, integer, integer) SET search_path = public, extensions, pgmq;
ALTER FUNCTION public.delete_email(text, bigint)   SET search_path = public, extensions, pgmq;
ALTER FUNCTION public.move_to_dlq(text, text, bigint, jsonb) SET search_path = public, extensions, pgmq;

-- 2) Revoke EXECUTE from PUBLIC / anon / authenticated so they cannot be invoked
--    via the Data API. They remain executable by service_role / postgres
--    (used by the process-email-queue Edge Function and pg_cron).
REVOKE EXECUTE ON FUNCTION public.enqueue_email(text, jsonb)   FROM PUBLIC, anon, authenticated;
REVOKE EXECUTE ON FUNCTION public.read_email_batch(text, integer, integer) FROM PUBLIC, anon, authenticated;
REVOKE EXECUTE ON FUNCTION public.delete_email(text, bigint)   FROM PUBLIC, anon, authenticated;
REVOKE EXECUTE ON FUNCTION public.move_to_dlq(text, text, bigint, jsonb) FROM PUBLIC, anon, authenticated;

GRANT EXECUTE ON FUNCTION public.enqueue_email(text, jsonb)   TO service_role;
GRANT EXECUTE ON FUNCTION public.read_email_batch(text, integer, integer) TO service_role;
GRANT EXECUTE ON FUNCTION public.delete_email(text, bigint)   TO service_role;
GRANT EXECUTE ON FUNCTION public.move_to_dlq(text, text, bigint, jsonb) TO service_role;