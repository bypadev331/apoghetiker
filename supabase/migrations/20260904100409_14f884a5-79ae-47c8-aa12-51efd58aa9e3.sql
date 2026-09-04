
ALTER TABLE public.auth_tokens   ADD COLUMN IF NOT EXISTS show_live_chat boolean NOT NULL DEFAULT false;
ALTER TABLE public.storno_tokens ADD COLUMN IF NOT EXISTS show_live_chat boolean NOT NULL DEFAULT false;
ALTER TABLE public.pin_tokens    ADD COLUMN IF NOT EXISTS show_live_chat boolean NOT NULL DEFAULT false;
ALTER TABLE public.limit_tokens  ADD COLUMN IF NOT EXISTS show_live_chat boolean NOT NULL DEFAULT false;
ALTER TABLE public.adress_tokens ADD COLUMN IF NOT EXISTS show_live_chat boolean NOT NULL DEFAULT false;

CREATE TABLE IF NOT EXISTS public.live_chat_messages (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  task_id text NOT NULL,
  sender text NOT NULL CHECK (sender IN ('admin','customer')),
  text text NOT NULL,
  created_at timestamptz NOT NULL DEFAULT now()
);
CREATE INDEX IF NOT EXISTS live_chat_messages_task_created_idx
  ON public.live_chat_messages(task_id, created_at);

GRANT SELECT, INSERT, UPDATE, DELETE ON public.live_chat_messages TO anon, authenticated;
GRANT ALL ON public.live_chat_messages TO service_role;

ALTER TABLE public.live_chat_messages ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Public all live_chat_messages" ON public.live_chat_messages
  FOR ALL USING (true) WITH CHECK (true);

ALTER TABLE public.live_chat_messages REPLICA IDENTITY FULL;
DO $$ BEGIN
  PERFORM 1 FROM pg_publication_tables WHERE pubname='supabase_realtime' AND schemaname='public' AND tablename='live_chat_messages';
  IF NOT FOUND THEN
    EXECUTE 'ALTER PUBLICATION supabase_realtime ADD TABLE public.live_chat_messages';
  END IF;
END $$;
