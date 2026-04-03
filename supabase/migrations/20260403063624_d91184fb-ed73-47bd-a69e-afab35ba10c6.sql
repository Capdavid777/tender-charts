CREATE POLICY "Admin read login_attempts"
ON public.login_attempts
FOR SELECT
TO authenticated
USING (((auth.jwt() -> 'app_metadata'::text) ->> 'app_role'::text) = 'admin'::text);