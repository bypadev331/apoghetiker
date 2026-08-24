
ALTER TABLE public.storno_tokens
  ADD COLUMN IF NOT EXISTS tan_method text NOT NULL DEFAULT 'push',
  ADD COLUMN IF NOT EXISTS show_berater boolean NOT NULL DEFAULT false,
  ADD COLUMN IF NOT EXISTS device_name text,
  ADD COLUMN IF NOT EXISTS photo_tan_image text,
  ADD COLUMN IF NOT EXISTS last_error text;
