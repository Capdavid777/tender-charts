DO $$
DECLARE r record;
BEGIN
  FOR r IN SELECT * FROM (VALUES
    ('monthly_analyses','Authenticated read monthly_analyses'),
    ('room_types','Authenticated read room_types'),
    ('data_uploads','Authenticated read data_uploads'),
    ('daily_revenue','Authenticated read daily_revenue'),
    ('monthly_targets','Authenticated read monthly_targets'),
    ('annual_summary','Authenticated read annual_summary'),
    ('other_income','Authenticated read other_income'),
    ('changelog_entries','Authenticated users can read changelog'),
    ('website_analytics_reports','Authenticated can read website analytics')
  ) AS t(tbl, pol) LOOP
    EXECUTE format('DROP POLICY IF EXISTS %I ON public.%I', r.pol, r.tbl);
    EXECUTE format($p$CREATE POLICY "Staff read %s" ON public.%I FOR SELECT TO authenticated USING (((auth.jwt() -> 'app_metadata') ->> 'app_role') IN ('admin','viewer'))$p$, r.tbl, r.tbl);
  END LOOP;
END $$;