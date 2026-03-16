CREATE POLICY "Admin write app_settings"
ON public.app_settings
FOR ALL
TO authenticated
USING (((auth.jwt() -> 'app_metadata'::text) ->> 'app_role'::text) = 'admin'::text)
WITH CHECK (((auth.jwt() -> 'app_metadata'::text) ->> 'app_role'::text) = 'admin'::text);