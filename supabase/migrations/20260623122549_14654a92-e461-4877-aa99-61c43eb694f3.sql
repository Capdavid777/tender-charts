CREATE TABLE public.changelog_entries (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  title TEXT NOT NULL,
  body TEXT NOT NULL,
  published_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

GRANT SELECT ON public.changelog_entries TO authenticated;
GRANT INSERT, UPDATE, DELETE ON public.changelog_entries TO authenticated;
GRANT ALL ON public.changelog_entries TO service_role;

ALTER TABLE public.changelog_entries ENABLE ROW LEVEL SECURITY;

-- Any authenticated user (admin or viewer) can read changelog
CREATE POLICY "Authenticated users can read changelog"
ON public.changelog_entries FOR SELECT
TO authenticated
USING (true);

-- Only admins can write (app_role claim is set by the login edge function)
CREATE POLICY "Admins can insert changelog"
ON public.changelog_entries FOR INSERT
TO authenticated
WITH CHECK ((auth.jwt() -> 'app_metadata' ->> 'app_role') = 'admin');

CREATE POLICY "Admins can update changelog"
ON public.changelog_entries FOR UPDATE
TO authenticated
USING ((auth.jwt() -> 'app_metadata' ->> 'app_role') = 'admin')
WITH CHECK ((auth.jwt() -> 'app_metadata' ->> 'app_role') = 'admin');

CREATE POLICY "Admins can delete changelog"
ON public.changelog_entries FOR DELETE
TO authenticated
USING ((auth.jwt() -> 'app_metadata' ->> 'app_role') = 'admin');

CREATE TRIGGER update_changelog_entries_updated_at
BEFORE UPDATE ON public.changelog_entries
FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

CREATE INDEX idx_changelog_published_at ON public.changelog_entries (published_at DESC);