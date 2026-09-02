ALTER TABLE public.daily_revenue
  ADD COLUMN IF NOT EXISTS source text NOT NULL DEFAULT 'manual';

CREATE INDEX IF NOT EXISTS daily_revenue_source_date_idx ON public.daily_revenue (source, date);