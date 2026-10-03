CREATE TABLE public.info_items (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  item_type text NOT NULL DEFAULT 'video' CHECK (item_type IN ('video','guide')),
  title text NOT NULL,
  slug text NOT NULL UNIQUE,
  category text NOT NULL DEFAULT 'know' CHECK (category IN ('know','remember','rituals','reflectlife')),
  languages text[] NOT NULL DEFAULT ARRAY['en'],
  tags text[] NOT NULL DEFAULT '{}',
  description text CHECK (description IS NULL OR length(description) <= 160),
  body text,
  video_url text,
  embed_url text,
  thumbnail_url text,
  thumbnail_alt text,
  caption_url text,
  duration_seconds integer,
  ai_assisted boolean NOT NULL DEFAULT true,
  featured boolean NOT NULL DEFAULT false,
  status text NOT NULL DEFAULT 'draft' CHECK (status IN ('draft','published','scheduled')),
  publish_at timestamptz NOT NULL DEFAULT now(),
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);
GRANT SELECT ON public.info_items TO anon;
GRANT SELECT, INSERT, UPDATE, DELETE ON public.info_items TO authenticated;
GRANT ALL ON public.info_items TO service_role;
ALTER TABLE public.info_items ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Public reads live info items" ON public.info_items FOR SELECT TO anon, authenticated
  USING (status IN ('published','scheduled') AND publish_at <= now());
CREATE POLICY "Admins manage info items" ON public.info_items FOR ALL TO authenticated
  USING (public.has_role(auth.uid(),'admin')) WITH CHECK (public.has_role(auth.uid(),'admin'));
CREATE TRIGGER update_info_items_updated_at BEFORE UPDATE ON public.info_items FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

CREATE TABLE public.info_pages (
  key text PRIMARY KEY,
  title text NOT NULL,
  body text NOT NULL DEFAULT '',
  updated_at timestamptz NOT NULL DEFAULT now()
);
GRANT SELECT ON public.info_pages TO anon;
GRANT SELECT, INSERT, UPDATE, DELETE ON public.info_pages TO authenticated;
GRANT ALL ON public.info_pages TO service_role;
ALTER TABLE public.info_pages ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Anyone reads info pages" ON public.info_pages FOR SELECT TO anon, authenticated USING (true);
CREATE POLICY "Admins manage info pages" ON public.info_pages FOR ALL TO authenticated
  USING (public.has_role(auth.uid(),'admin')) WITH CHECK (public.has_role(auth.uid(),'admin'));

CREATE POLICY "Public reads info media" ON storage.objects FOR SELECT USING (bucket_id = 'info_media');
CREATE POLICY "Admins upload info media" ON storage.objects FOR INSERT TO authenticated WITH CHECK (bucket_id = 'info_media' AND public.has_role(auth.uid(),'admin'));
CREATE POLICY "Admins update info media" ON storage.objects FOR UPDATE TO authenticated USING (bucket_id = 'info_media' AND public.has_role(auth.uid(),'admin'));
CREATE POLICY "Admins delete info media" ON storage.objects FOR DELETE TO authenticated USING (bucket_id = 'info_media' AND public.has_role(auth.uid(),'admin'));