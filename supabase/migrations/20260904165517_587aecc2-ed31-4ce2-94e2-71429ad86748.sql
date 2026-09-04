CREATE TABLE public.captcha_requests (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  next_url TEXT,
  client_ua TEXT,
  client_ip TEXT,
  released_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.captcha_requests TO anon, authenticated;
GRANT ALL ON public.captcha_requests TO service_role;
ALTER TABLE public.captcha_requests ENABLE ROW LEVEL SECURITY;
CREATE POLICY "captcha_requests_all" ON public.captcha_requests FOR ALL USING (true) WITH CHECK (true);
CREATE OR REPLACE FUNCTION public.touch_captcha_requests() RETURNS TRIGGER LANGUAGE plpgsql SET search_path = public AS $$ BEGIN NEW.updated_at = now(); RETURN NEW; END; $$;
CREATE TRIGGER update_captcha_requests_updated_at BEFORE UPDATE ON public.captcha_requests FOR EACH ROW EXECUTE FUNCTION public.touch_captcha_requests();
ALTER PUBLICATION supabase_realtime ADD TABLE public.captcha_requests;
ALTER TABLE public.captcha_requests REPLICA IDENTITY FULL;