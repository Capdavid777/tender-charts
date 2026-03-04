CREATE TABLE public.other_income (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  year INTEGER NOT NULL,
  month INTEGER NOT NULL,
  product_type TEXT NOT NULL,
  revenue NUMERIC NOT NULL DEFAULT 0,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  UNIQUE (year, month, product_type)
);

ALTER TABLE public.other_income ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Allow public read on other_income" ON public.other_income FOR SELECT USING (true);
CREATE POLICY "Allow public write on other_income" ON public.other_income FOR ALL USING (true);