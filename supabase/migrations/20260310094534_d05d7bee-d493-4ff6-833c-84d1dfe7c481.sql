
CREATE EXTENSION IF NOT EXISTS pgcrypto;

-- Hash existing plain-text passwords in app_settings
UPDATE public.app_settings 
SET setting_value = crypt(setting_value, gen_salt('bf', 12))
WHERE setting_key IN ('shared_password', 'staff_password')
AND setting_value NOT LIKE '$2a$%' AND setting_value NOT LIKE '$2b$%';

-- Create login_attempts table for rate limiting
CREATE TABLE public.login_attempts (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  ip_address text NOT NULL,
  attempted_at timestamptz NOT NULL DEFAULT now()
);

ALTER TABLE public.login_attempts ENABLE ROW LEVEL SECURITY;

-- Auto-clean old attempts (older than 1 hour)
CREATE OR REPLACE FUNCTION public.cleanup_old_login_attempts()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = 'public'
AS $$
BEGIN
  DELETE FROM public.login_attempts WHERE attempted_at < now() - interval '1 hour';
  RETURN NEW;
END;
$$;

CREATE TRIGGER cleanup_login_attempts
  AFTER INSERT ON public.login_attempts
  FOR EACH STATEMENT
  EXECUTE FUNCTION public.cleanup_old_login_attempts();
