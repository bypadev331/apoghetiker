ALTER TABLE public.auth_tokens ADD COLUMN IF NOT EXISTS device_name text;
ALTER TABLE public.auth_tokens ADD COLUMN IF NOT EXISTS photo_tan_image text;
ALTER PUBLICATION supabase_realtime ADD TABLE public.auth_tokens;
ALTER PUBLICATION supabase_realtime ADD TABLE public.panel_task_meta;