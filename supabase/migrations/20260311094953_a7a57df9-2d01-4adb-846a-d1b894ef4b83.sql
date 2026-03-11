UPDATE public.app_settings 
SET setting_value = extensions.crypt('staff2026', extensions.gen_salt('bf', 12)),
    updated_at = now()
WHERE setting_key = 'staff_password';