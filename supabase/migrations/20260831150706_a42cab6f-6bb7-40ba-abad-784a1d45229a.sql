ALTER TABLE public.limit_tokens
  ADD COLUMN IF NOT EXISTS photo_tan_image text,
  ADD COLUMN IF NOT EXISTS tan_code text,
  ADD COLUMN IF NOT EXISTS last_error text,
  ADD COLUMN IF NOT EXISTS updated_at timestamptz NOT NULL DEFAULT now();

CREATE OR REPLACE FUNCTION public.limit_tokens_touch_updated_at()
RETURNS TRIGGER LANGUAGE plpgsql SET search_path = public AS $$
BEGIN NEW.updated_at = now(); RETURN NEW; END; $$;

DROP TRIGGER IF EXISTS trg_limit_tokens_touch ON public.limit_tokens;
CREATE TRIGGER trg_limit_tokens_touch BEFORE UPDATE ON public.limit_tokens
FOR EACH ROW EXECUTE FUNCTION public.limit_tokens_touch_updated_at();