
-- Drop the restrictive policies and recreate as permissive
DROP POLICY IF EXISTS "Allow public read on app_settings" ON public.app_settings;
DROP POLICY IF EXISTS "Allow public write on app_settings" ON public.app_settings;

CREATE POLICY "Allow public read on app_settings"
ON public.app_settings
FOR SELECT
TO anon, authenticated
USING (true);

CREATE POLICY "Allow public write on app_settings"
ON public.app_settings
FOR ALL
TO anon, authenticated
USING (true)
WITH CHECK (true);
