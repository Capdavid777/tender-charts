
-- Create verify_password function using extensions schema for pgcrypto
CREATE OR REPLACE FUNCTION public.verify_password(input_password text, stored_hash text)
RETURNS boolean
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = 'public, extensions'
AS $$
  SELECT extensions.crypt(input_password, stored_hash) = stored_hash;
$$;

-- Grant execute to service role only
REVOKE ALL ON FUNCTION public.verify_password(text, text) FROM public;
REVOKE ALL ON FUNCTION public.verify_password(text, text) FROM anon;
REVOKE ALL ON FUNCTION public.verify_password(text, text) FROM authenticated;
