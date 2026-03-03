-- Remove the overly permissive policies on app_settings
DROP POLICY IF EXISTS "Allow public read on app_settings" ON public.app_settings;
DROP POLICY IF EXISTS "Allow public write on app_settings" ON public.app_settings;

-- No public read/write access - only service role (edge functions) can access
-- This prevents clients from reading passwords directly