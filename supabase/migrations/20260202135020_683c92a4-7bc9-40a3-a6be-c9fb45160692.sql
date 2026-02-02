-- App settings table for shared password and alert thresholds
CREATE TABLE public.app_settings (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  setting_key TEXT NOT NULL UNIQUE,
  setting_value TEXT NOT NULL,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Room types table
CREATE TABLE public.room_types (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  name TEXT NOT NULL,
  total_rooms INTEGER NOT NULL DEFAULT 0,
  breakeven_rate NUMERIC(10,2) DEFAULT 0,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Monthly targets table
CREATE TABLE public.monthly_targets (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  year INTEGER NOT NULL,
  month INTEGER NOT NULL,
  target_revenue NUMERIC(12,2) NOT NULL DEFAULT 0,
  target_occupancy NUMERIC(5,2) DEFAULT 0,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  UNIQUE(year, month)
);

-- Daily revenue data table
CREATE TABLE public.daily_revenue (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  date DATE NOT NULL,
  room_type_id UUID REFERENCES public.room_types(id) ON DELETE CASCADE,
  rooms_sold INTEGER NOT NULL DEFAULT 0,
  revenue NUMERIC(12,2) NOT NULL DEFAULT 0,
  average_rate NUMERIC(10,2) DEFAULT 0,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  UNIQUE(date, room_type_id)
);

-- Historical annual data table
CREATE TABLE public.annual_summary (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  year INTEGER NOT NULL UNIQUE,
  total_rooms_sold INTEGER NOT NULL DEFAULT 0,
  occupancy_percentage NUMERIC(5,2) DEFAULT 0,
  total_revenue NUMERIC(14,2) NOT NULL DEFAULT 0,
  average_rate NUMERIC(10,2) DEFAULT 0,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Data uploads tracking table
CREATE TABLE public.data_uploads (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  filename TEXT NOT NULL,
  uploaded_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  records_imported INTEGER DEFAULT 0,
  status TEXT DEFAULT 'completed'
);

-- Enable RLS on all tables
ALTER TABLE public.app_settings ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.room_types ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.monthly_targets ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.daily_revenue ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.annual_summary ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.data_uploads ENABLE ROW LEVEL SECURITY;

-- Public read/write policies (protected by app-level shared password)
CREATE POLICY "Allow public read on app_settings" ON public.app_settings FOR SELECT USING (true);
CREATE POLICY "Allow public write on app_settings" ON public.app_settings FOR ALL USING (true);

CREATE POLICY "Allow public read on room_types" ON public.room_types FOR SELECT USING (true);
CREATE POLICY "Allow public write on room_types" ON public.room_types FOR ALL USING (true);

CREATE POLICY "Allow public read on monthly_targets" ON public.monthly_targets FOR SELECT USING (true);
CREATE POLICY "Allow public write on monthly_targets" ON public.monthly_targets FOR ALL USING (true);

CREATE POLICY "Allow public read on daily_revenue" ON public.daily_revenue FOR SELECT USING (true);
CREATE POLICY "Allow public write on daily_revenue" ON public.daily_revenue FOR ALL USING (true);

CREATE POLICY "Allow public read on annual_summary" ON public.annual_summary FOR SELECT USING (true);
CREATE POLICY "Allow public write on annual_summary" ON public.annual_summary FOR ALL USING (true);

CREATE POLICY "Allow public read on data_uploads" ON public.data_uploads FOR SELECT USING (true);
CREATE POLICY "Allow public write on data_uploads" ON public.data_uploads FOR ALL USING (true);

-- Insert default app settings
INSERT INTO public.app_settings (setting_key, setting_value) VALUES
  ('shared_password', 'admin123'),
  ('revenue_alert_threshold', '20'),
  ('occupancy_alert_threshold', '50');

-- Insert sample room types based on screenshots
INSERT INTO public.room_types (name, total_rooms, breakeven_rate) VALUES
  ('Deluxe 1 Bedroom', 8, 1200),
  ('Standard 1 Bedroom', 6, 1000),
  ('Studio', 4, 800),
  ('Penthouse', 2, 2500);

-- Function to update timestamps
CREATE OR REPLACE FUNCTION public.update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SET search_path = public;

-- Create triggers for timestamp updates
CREATE TRIGGER update_app_settings_updated_at
  BEFORE UPDATE ON public.app_settings
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

CREATE TRIGGER update_room_types_updated_at
  BEFORE UPDATE ON public.room_types
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();