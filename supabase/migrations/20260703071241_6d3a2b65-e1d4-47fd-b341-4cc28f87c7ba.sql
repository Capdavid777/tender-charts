
CREATE TABLE public.website_analytics_reports (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  month date NOT NULL UNIQUE,
  generated_on date NOT NULL,
  executive_summary text,
  summary jsonb NOT NULL DEFAULT '{}'::jsonb,
  daily_traffic jsonb NOT NULL DEFAULT '[]'::jsonb,
  top_pages jsonb NOT NULL DEFAULT '[]'::jsonb,
  traffic_sources jsonb NOT NULL DEFAULT '[]'::jsonb,
  device_mix jsonb NOT NULL DEFAULT '{}'::jsonb,
  visitor_countries jsonb NOT NULL DEFAULT '[]'::jsonb,
  revenue_by_room_type jsonb NOT NULL DEFAULT '[]'::jsonb,
  revenue_by_payment jsonb NOT NULL DEFAULT '[]'::jsonb,
  bookings_by_country jsonb NOT NULL DEFAULT '[]'::jsonb,
  daily_revenue jsonb NOT NULL DEFAULT '[]'::jsonb,
  promotions_note text,
  insights jsonb NOT NULL DEFAULT '[]'::jsonb,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

GRANT SELECT, INSERT, UPDATE, DELETE ON public.website_analytics_reports TO authenticated;
GRANT ALL ON public.website_analytics_reports TO service_role;

ALTER TABLE public.website_analytics_reports ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Authenticated can read website analytics"
  ON public.website_analytics_reports FOR SELECT
  TO authenticated USING (true);

CREATE POLICY "Admins manage website analytics"
  ON public.website_analytics_reports FOR ALL
  TO authenticated
  USING ((auth.jwt() -> 'app_metadata' ->> 'app_role') = 'admin')
  WITH CHECK ((auth.jwt() -> 'app_metadata' ->> 'app_role') = 'admin');

CREATE TRIGGER website_analytics_reports_updated_at
  BEFORE UPDATE ON public.website_analytics_reports
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

INSERT INTO public.website_analytics_reports (
  month, generated_on, executive_summary, summary, daily_traffic, top_pages,
  traffic_sources, device_mix, visitor_countries, revenue_by_room_type,
  revenue_by_payment, bookings_by_country, daily_revenue, promotions_note, insights
) VALUES (
  '2026-06-01',
  '2026-07-02',
  'June delivered 1,709 visitors across 3,215 pageviews. Traffic surged in the final week (peaking at 208 visitors on 2026-06-29), aligned with the paid social push. Bookings closed the month at 4 confirmed reservations totalling R 12,627.50 gross, with R 3,772.50 in promotional discounts applied. Revenue per visitor was R 7.39 and the visitor-to-booking conversion rate was 0.23%. Mobile drove the majority of sessions (61%), reinforcing mobile-first as the priority experience.',
  '{"visitors":1709,"pageviews":3215,"avg_session_min":15.4,"bounce_rate":67,"bookings":4,"gross_revenue":12627.50,"net_revenue":8855.00,"avg_booking_value":3156.88,"discounts":3772.50,"visitor_conversion":0.23,"avg_length_of_stay":2.2,"revenue_per_visitor":7.39}'::jsonb,
  '[{"day":1,"visitors":45,"pageviews":85,"bounce":60,"session_min":20},{"day":2,"visitors":30,"pageviews":50,"bounce":70,"session_min":20},{"day":3,"visitors":20,"pageviews":35,"bounce":90,"session_min":100},{"day":4,"visitors":50,"pageviews":100,"bounce":80,"session_min":20},{"day":5,"visitors":35,"pageviews":55,"bounce":75,"session_min":15},{"day":6,"visitors":40,"pageviews":70,"bounce":65,"session_min":10},{"day":7,"visitors":50,"pageviews":105,"bounce":70,"session_min":15},{"day":8,"visitors":35,"pageviews":55,"bounce":40,"session_min":65},{"day":9,"visitors":30,"pageviews":45,"bounce":60,"session_min":75},{"day":10,"visitors":40,"pageviews":60,"bounce":55,"session_min":10},{"day":11,"visitors":45,"pageviews":90,"bounce":70,"session_min":15},{"day":12,"visitors":40,"pageviews":50,"bounce":65,"session_min":10},{"day":13,"visitors":35,"pageviews":45,"bounce":80,"session_min":15},{"day":14,"visitors":30,"pageviews":35,"bounce":100,"session_min":5},{"day":15,"visitors":40,"pageviews":45,"bounce":85,"session_min":5},{"day":16,"visitors":60,"pageviews":220,"bounce":40,"session_min":5},{"day":17,"visitors":50,"pageviews":90,"bounce":50,"session_min":5},{"day":18,"visitors":40,"pageviews":50,"bounce":60,"session_min":20},{"day":19,"visitors":45,"pageviews":60,"bounce":75,"session_min":5},{"day":20,"visitors":50,"pageviews":75,"bounce":70,"session_min":5},{"day":21,"visitors":45,"pageviews":70,"bounce":60,"session_min":20},{"day":22,"visitors":45,"pageviews":70,"bounce":75,"session_min":35},{"day":23,"visitors":100,"pageviews":160,"bounce":60,"session_min":10},{"day":24,"visitors":120,"pageviews":220,"bounce":70,"session_min":10},{"day":25,"visitors":170,"pageviews":300,"bounce":65,"session_min":15},{"day":26,"visitors":155,"pageviews":290,"bounce":65,"session_min":15},{"day":27,"visitors":165,"pageviews":275,"bounce":50,"session_min":15},{"day":28,"visitors":80,"pageviews":140,"bounce":60,"session_min":10},{"day":29,"visitors":208,"pageviews":300,"bounce":70,"session_min":15},{"day":30,"visitors":160,"pageviews":240,"bounce":80,"session_min":10}]'::jsonb,
  '[{"path":"/","pageviews":1206},{"path":"/go/instagram","pageviews":288},{"path":"/book-now","pageviews":139},{"path":"/promos","pageviews":57},{"path":"/rooms/one-bed-apartment","pageviews":55},{"path":"/rooms/queen-room","pageviews":52},{"path":"/cafe","pageviews":36},{"path":"/rooms/deluxe-studio","pageviews":34},{"path":"/rooms/two-bed-apartment","pageviews":30},{"path":"/staff","pageviews":19}]'::jsonb,
  '[{"source":"Direct","visitors":880},{"source":"youtube.com","visitors":199},{"source":"google.com","visitors":188},{"source":"m.facebook.com","visitors":148},{"source":"instagram.com","visitors":86},{"source":"l.instagram.com","visitors":72},{"source":"facebook.com","visitors":28},{"source":"bing.com","visitors":11},{"source":"google.co.za","visitors":7},{"source":"tiktok.com","visitors":6}]'::jsonb,
  '{"desktop":38,"mobile":61,"tablet":0}'::jsonb,
  '[{"code":"ZA","visitors":1028},{"code":"CN","visitors":271},{"code":"US","visitors":195},{"code":"Unknown","visitors":57},{"code":"BW","visitors":12},{"code":"GB","visitors":8},{"code":"MZ","visitors":7},{"code":"NL","visitors":6},{"code":"NA","visitors":5},{"code":"ZM","visitors":5}]'::jsonb,
  '[{"room":"One Bedroom Apartment with View","bookings":2,"revenue":8355.00,"share":66},{"room":"Deluxe Studio","bookings":2,"revenue":4272.50,"share":34}]'::jsonb,
  '[{"method":"MasterCard","bookings":3,"revenue":9440.00},{"method":"Visa","bookings":1,"revenue":3187.50}]'::jsonb,
  '[{"code":"ZA","bookings":3},{"code":"BW","bookings":1}]'::jsonb,
  '[{"date":"2026-06-07","revenue":3156.88},{"date":"2026-06-26","revenue":9470.62}]'::jsonb,
  '4 of 4 bookings used an active promotion. 0 bookings used a coupon code.',
  '["Traffic is concentrated in the last 7 days of June. The 2026-06-29 peak of 208 visitors coincides with the highest revenue day (2026-06-26, R 9,440.00). Plan campaign spend around this weekly pattern.","Mobile represents 61% of sessions. Every booking-flow change should be verified on a phone first.","Direct traffic (880 visitors) leads all sources, followed by YouTube (199) and Google (188). Brand recall is strong; SEO and video content are working.","Only 0.23% of visitors converted to a paid booking. /book-now had 139 pageviews - focus the next optimisation cycle on the booking form drop-off.","Promotions were applied on 4 of 4 bookings, generating R 3,772.50 in discounts. Track whether discounted stays return at rack rate to measure promo ROI.","International interest continues from CN (271 visitors) and US (195) but converted only ZA and BW guests. Consider localised messaging or currency display for CN and US audiences."]'::jsonb
);
