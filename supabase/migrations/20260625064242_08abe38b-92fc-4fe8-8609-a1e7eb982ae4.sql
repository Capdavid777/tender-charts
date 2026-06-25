DELETE FROM public.changelog_entries WHERE title = 'Changes';
DELETE FROM public.app_settings WHERE setting_key = 'changelog_last_sha';