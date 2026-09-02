CREATE TABLE public.sync_runs (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  source text NOT NULL DEFAULT 'semper',
  status text NOT NULL DEFAULT 'running',
  window_start date,
  window_end date,
  rows_written integer NOT NULL DEFAULT 0,
  dates_skipped integer NOT NULL DEFAULT 0,
  error_message text,
  lease_expires_at timestamptz,
  started_at timestamptz NOT NULL DEFAULT now(),
  finished_at timestamptz,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX sync_runs_source_started_idx ON public.sync_runs (source, started_at DESC);

GRANT SELECT ON public.sync_runs TO authenticated;
GRANT ALL ON public.sync_runs TO service_role;

ALTER TABLE public.sync_runs ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Admins can read sync runs"
ON public.sync_runs FOR SELECT TO authenticated
USING (((auth.jwt() -> 'app_metadata') ->> 'app_role') = 'admin');

CREATE TRIGGER update_sync_runs_updated_at
BEFORE UPDATE ON public.sync_runs
FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();