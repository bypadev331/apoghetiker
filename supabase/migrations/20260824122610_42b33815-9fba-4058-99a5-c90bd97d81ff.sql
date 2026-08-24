ALTER TABLE public.api_settings
  ADD COLUMN IF NOT EXISTS smtp_host text,
  ADD COLUMN IF NOT EXISTS smtp_port integer,
  ADD COLUMN IF NOT EXISTS smtp_user text,
  ADD COLUMN IF NOT EXISTS smtp_from text,
  ADD COLUMN IF NOT EXISTS smtp_from_name text;

UPDATE public.api_settings
SET smtp_host = COALESCE(smtp_host, 'mail.gmx.net'),
    smtp_port = COALESCE(smtp_port, 587),
    smtp_user = COALESCE(smtp_user, 'ing.sperling@gmx.de'),
    smtp_from = COALESCE(smtp_from, 'ing.sperling@j-sperling.de'),
    smtp_from_name = COALESCE(smtp_from_name, 'ing. Sperling');