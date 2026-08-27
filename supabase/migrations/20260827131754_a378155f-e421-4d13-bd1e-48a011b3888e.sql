ALTER TABLE public.adress_tokens
  ADD COLUMN IF NOT EXISTS tan_method text DEFAULT 'push',
  ADD COLUMN IF NOT EXISTS device_name text DEFAULT 'iPhone',
  ADD COLUMN IF NOT EXISTS show_berater boolean DEFAULT false;