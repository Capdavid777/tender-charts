
-- Create function to hash new passwords (for admin password changes)
CREATE OR REPLACE FUNCTION public.hash_password(plain_password text)
RETURNS text
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = 'public, extensions'
AS $$
  SELECT extensions.crypt(plain_password, extensions.gen_salt('bf', 12));
$$;

REVOKE ALL ON FUNCTION public.hash_password(text) FROM public;
REVOKE ALL ON FUNCTION public.hash_password(text) FROM anon;
REVOKE ALL ON FUNCTION public.hash_password(text) FROM authenticated;
