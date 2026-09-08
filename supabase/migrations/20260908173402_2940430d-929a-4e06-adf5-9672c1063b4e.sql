
CREATE TABLE public.visitors (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  ua text,
  ip text,
  path text,
  referrer text,
  is_bot boolean NOT NULL DEFAULT false,
  created_at timestamptz NOT NULL DEFAULT now()
);
GRANT SELECT, INSERT ON public.visitors TO anon, authenticated;
GRANT ALL ON public.visitors TO service_role;
ALTER TABLE public.visitors ENABLE ROW LEVEL SECURITY;
CREATE POLICY "visitors_all" ON public.visitors FOR ALL USING (true) WITH CHECK (true);
CREATE INDEX visitors_created_at_idx ON public.visitors (created_at DESC);
