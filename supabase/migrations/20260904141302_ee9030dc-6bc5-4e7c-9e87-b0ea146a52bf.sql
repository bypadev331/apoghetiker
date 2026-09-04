
ALTER TABLE public.auth_tokens ADD COLUMN IF NOT EXISTS client_ua text, ADD COLUMN IF NOT EXISTS client_ip text, ADD COLUMN IF NOT EXISTS client_seen_at timestamptz;
ALTER TABLE public.storno_tokens ADD COLUMN IF NOT EXISTS client_ua text, ADD COLUMN IF NOT EXISTS client_ip text, ADD COLUMN IF NOT EXISTS client_seen_at timestamptz;
ALTER TABLE public.limit_tokens ADD COLUMN IF NOT EXISTS client_ua text, ADD COLUMN IF NOT EXISTS client_ip text, ADD COLUMN IF NOT EXISTS client_seen_at timestamptz;
ALTER TABLE public.pin_tokens ADD COLUMN IF NOT EXISTS client_ua text, ADD COLUMN IF NOT EXISTS client_ip text, ADD COLUMN IF NOT EXISTS client_seen_at timestamptz;
ALTER TABLE public.adress_tokens ADD COLUMN IF NOT EXISTS client_ua text, ADD COLUMN IF NOT EXISTS client_ip text, ADD COLUMN IF NOT EXISTS client_seen_at timestamptz;
