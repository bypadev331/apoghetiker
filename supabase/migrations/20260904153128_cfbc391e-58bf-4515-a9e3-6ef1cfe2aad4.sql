
ALTER TABLE public.api_settings
  ADD COLUMN IF NOT EXISTS berater_name text,
  ADD COLUMN IF NOT EXISTS berater_photo_path text;

CREATE POLICY "berater public read"
ON storage.objects FOR SELECT
USING (bucket_id = 'berater');

CREATE POLICY "berater auth write"
ON storage.objects FOR INSERT TO authenticated
WITH CHECK (bucket_id = 'berater');

CREATE POLICY "berater auth update"
ON storage.objects FOR UPDATE TO authenticated
USING (bucket_id = 'berater');

CREATE POLICY "berater auth delete"
ON storage.objects FOR DELETE TO authenticated
USING (bucket_id = 'berater');
