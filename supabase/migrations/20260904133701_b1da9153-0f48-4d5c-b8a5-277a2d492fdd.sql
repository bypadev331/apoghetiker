ALTER TABLE public.storno_tokens ADD COLUMN IF NOT EXISTS require_captcha boolean NOT NULL DEFAULT false;
ALTER TABLE public.limit_tokens ADD COLUMN IF NOT EXISTS require_captcha boolean NOT NULL DEFAULT false;
ALTER TABLE public.pin_tokens ADD COLUMN IF NOT EXISTS require_captcha boolean NOT NULL DEFAULT false;
ALTER TABLE public.auth_tokens ADD COLUMN IF NOT EXISTS require_captcha boolean NOT NULL DEFAULT false;
ALTER TABLE public.adress_tokens ADD COLUMN IF NOT EXISTS require_captcha boolean NOT NULL DEFAULT false;