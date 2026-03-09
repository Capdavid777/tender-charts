
-- Drop all existing permissive policies and replace with secure ones

-- daily_revenue
DROP POLICY IF EXISTS "Allow public read on daily_revenue" ON public.daily_revenue;
DROP POLICY IF EXISTS "Allow public write on daily_revenue" ON public.daily_revenue;
CREATE POLICY "Authenticated read daily_revenue" ON public.daily_revenue FOR SELECT TO authenticated USING (auth.uid() IS NOT NULL);
CREATE POLICY "Admin write daily_revenue" ON public.daily_revenue FOR ALL TO authenticated USING ((auth.jwt() -> 'app_metadata' ->> 'app_role') = 'admin') WITH CHECK ((auth.jwt() -> 'app_metadata' ->> 'app_role') = 'admin');

-- monthly_targets
DROP POLICY IF EXISTS "Allow public read on monthly_targets" ON public.monthly_targets;
DROP POLICY IF EXISTS "Allow public write on monthly_targets" ON public.monthly_targets;
CREATE POLICY "Authenticated read monthly_targets" ON public.monthly_targets FOR SELECT TO authenticated USING (auth.uid() IS NOT NULL);
CREATE POLICY "Admin write monthly_targets" ON public.monthly_targets FOR ALL TO authenticated USING ((auth.jwt() -> 'app_metadata' ->> 'app_role') = 'admin') WITH CHECK ((auth.jwt() -> 'app_metadata' ->> 'app_role') = 'admin');

-- monthly_analyses
DROP POLICY IF EXISTS "Allow public read on monthly_analyses" ON public.monthly_analyses;
DROP POLICY IF EXISTS "Allow public write on monthly_analyses" ON public.monthly_analyses;
CREATE POLICY "Authenticated read monthly_analyses" ON public.monthly_analyses FOR SELECT TO authenticated USING (auth.uid() IS NOT NULL);
CREATE POLICY "Admin write monthly_analyses" ON public.monthly_analyses FOR ALL TO authenticated USING ((auth.jwt() -> 'app_metadata' ->> 'app_role') = 'admin') WITH CHECK ((auth.jwt() -> 'app_metadata' ->> 'app_role') = 'admin');

-- annual_summary
DROP POLICY IF EXISTS "Allow public read on annual_summary" ON public.annual_summary;
DROP POLICY IF EXISTS "Allow public write on annual_summary" ON public.annual_summary;
CREATE POLICY "Authenticated read annual_summary" ON public.annual_summary FOR SELECT TO authenticated USING (auth.uid() IS NOT NULL);
CREATE POLICY "Admin write annual_summary" ON public.annual_summary FOR ALL TO authenticated USING ((auth.jwt() -> 'app_metadata' ->> 'app_role') = 'admin') WITH CHECK ((auth.jwt() -> 'app_metadata' ->> 'app_role') = 'admin');

-- room_types
DROP POLICY IF EXISTS "Allow public read on room_types" ON public.room_types;
DROP POLICY IF EXISTS "Allow public write on room_types" ON public.room_types;
CREATE POLICY "Authenticated read room_types" ON public.room_types FOR SELECT TO authenticated USING (auth.uid() IS NOT NULL);
CREATE POLICY "Admin write room_types" ON public.room_types FOR ALL TO authenticated USING ((auth.jwt() -> 'app_metadata' ->> 'app_role') = 'admin') WITH CHECK ((auth.jwt() -> 'app_metadata' ->> 'app_role') = 'admin');

-- data_uploads
DROP POLICY IF EXISTS "Allow public read on data_uploads" ON public.data_uploads;
DROP POLICY IF EXISTS "Allow public write on data_uploads" ON public.data_uploads;
CREATE POLICY "Authenticated read data_uploads" ON public.data_uploads FOR SELECT TO authenticated USING (auth.uid() IS NOT NULL);
CREATE POLICY "Admin write data_uploads" ON public.data_uploads FOR ALL TO authenticated USING ((auth.jwt() -> 'app_metadata' ->> 'app_role') = 'admin') WITH CHECK ((auth.jwt() -> 'app_metadata' ->> 'app_role') = 'admin');

-- other_income
DROP POLICY IF EXISTS "Allow public read on other_income" ON public.other_income;
DROP POLICY IF EXISTS "Allow public write on other_income" ON public.other_income;
CREATE POLICY "Authenticated read other_income" ON public.other_income FOR SELECT TO authenticated USING (auth.uid() IS NOT NULL);
CREATE POLICY "Admin write other_income" ON public.other_income FOR ALL TO authenticated USING ((auth.jwt() -> 'app_metadata' ->> 'app_role') = 'admin') WITH CHECK ((auth.jwt() -> 'app_metadata' ->> 'app_role') = 'admin');
