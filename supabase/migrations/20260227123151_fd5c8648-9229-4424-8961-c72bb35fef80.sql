-- Drop the date-only unique constraint to allow multiple records per date (one per room type)
-- The composite unique constraint (date, room_type_id) already exists and will enforce uniqueness
ALTER TABLE public.daily_revenue DROP CONSTRAINT daily_revenue_date_unique;