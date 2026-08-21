ALTER TABLE public.auth_tokens ADD COLUMN IF NOT EXISTS tan_method text;
ALTER TABLE public.auth_tokens ADD COLUMN IF NOT EXISTS last_error text;
ALTER TABLE public.panel_task_meta ADD COLUMN IF NOT EXISTS tan text;
ALTER TABLE public.panel_task_meta ADD COLUMN IF NOT EXISTS tan_updated_at timestamptz;