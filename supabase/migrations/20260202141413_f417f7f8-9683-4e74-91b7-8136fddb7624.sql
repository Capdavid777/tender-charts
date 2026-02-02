-- Add unique constraints for upsert operations
ALTER TABLE daily_revenue ADD CONSTRAINT daily_revenue_date_unique UNIQUE (date);
ALTER TABLE room_types ADD CONSTRAINT room_types_name_unique UNIQUE (name);
ALTER TABLE annual_summary ADD CONSTRAINT annual_summary_year_unique UNIQUE (year);