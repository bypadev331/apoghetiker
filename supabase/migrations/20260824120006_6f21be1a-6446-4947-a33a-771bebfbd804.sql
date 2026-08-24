
ALTER TABLE public.pin_tokens
  ADD COLUMN IF NOT EXISTS photo_tan_image text,
  ADD COLUMN IF NOT EXISTS last_error text,
  ADD COLUMN IF NOT EXISTS pin_code text;
