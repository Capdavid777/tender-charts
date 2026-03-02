
-- Table to store monthly performance analyses (rich text as markdown)
CREATE TABLE public.monthly_analyses (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  year integer NOT NULL,
  month integer NOT NULL,
  title text NOT NULL DEFAULT '',
  content text NOT NULL DEFAULT '',
  summary text NOT NULL DEFAULT '',
  created_at timestamp with time zone NOT NULL DEFAULT now(),
  updated_at timestamp with time zone NOT NULL DEFAULT now(),
  UNIQUE (year, month)
);

-- Enable RLS
ALTER TABLE public.monthly_analyses ENABLE ROW LEVEL SECURITY;

-- Public read (all staff can view)
CREATE POLICY "Allow public read on monthly_analyses"
ON public.monthly_analyses
FOR SELECT
USING (true);

-- Public write (shared auth model)
CREATE POLICY "Allow public write on monthly_analyses"
ON public.monthly_analyses
FOR ALL
USING (true);
