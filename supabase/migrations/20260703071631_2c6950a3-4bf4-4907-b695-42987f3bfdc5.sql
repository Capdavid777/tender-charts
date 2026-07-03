
-- Explicit admin-only SELECT on app_settings (was covered by ALL policy; make it explicit)
CREATE POLICY "Admin read app_settings"
ON public.app_settings
FOR SELECT
TO authenticated
USING ((((auth.jwt() -> 'app_metadata'::text) ->> 'app_role'::text) = 'admin'::text));

-- Explicit deny for client-side writes to login_attempts (defense in depth; only service_role should write)
CREATE POLICY "Deny client insert login_attempts"
ON public.login_attempts
FOR INSERT
TO anon, authenticated
WITH CHECK (false);

CREATE POLICY "Deny client update login_attempts"
ON public.login_attempts
FOR UPDATE
TO anon, authenticated
USING (false)
WITH CHECK (false);

CREATE POLICY "Deny client delete login_attempts"
ON public.login_attempts
FOR DELETE
TO anon, authenticated
USING (false);
