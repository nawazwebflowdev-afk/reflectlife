CREATE OR REPLACE FUNCTION public.is_admin()
RETURNS boolean LANGUAGE sql STABLE SECURITY DEFINER SET search_path = public
AS $$ SELECT public.has_role(auth.uid(), 'admin') $$;

CREATE TABLE public.content_categories (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  name text NOT NULL UNIQUE,
  sort_order integer NOT NULL DEFAULT 0,
  created_at timestamptz NOT NULL DEFAULT now()
);
GRANT SELECT ON public.content_categories TO anon;
GRANT SELECT, INSERT, UPDATE, DELETE ON public.content_categories TO authenticated;
GRANT ALL ON public.content_categories TO service_role;
ALTER TABLE public.content_categories ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Anyone reads categories" ON public.content_categories FOR SELECT TO anon, authenticated USING (true);
CREATE POLICY "Admins insert categories" ON public.content_categories FOR INSERT TO authenticated WITH CHECK (public.is_admin());
CREATE POLICY "Admins update categories" ON public.content_categories FOR UPDATE TO authenticated USING (public.is_admin()) WITH CHECK (public.is_admin());
CREATE POLICY "Admins delete categories" ON public.content_categories FOR DELETE TO authenticated USING (public.is_admin());

CREATE TABLE public.videos (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  title text NOT NULL,
  description text,
  video_file text,
  poster_image text,
  duration integer,
  captions_file text,
  status text NOT NULL DEFAULT 'draft' CHECK (status IN ('draft','published')),
  featured boolean NOT NULL DEFAULT false,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);
GRANT SELECT ON public.videos TO anon;
GRANT SELECT, INSERT, UPDATE, DELETE ON public.videos TO authenticated;
GRANT ALL ON public.videos TO service_role;
ALTER TABLE public.videos ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Anyone reads published videos" ON public.videos FOR SELECT TO anon, authenticated USING (status = 'published' OR public.is_admin());
CREATE POLICY "Admins insert videos" ON public.videos FOR INSERT TO authenticated WITH CHECK (public.is_admin());
CREATE POLICY "Admins update videos" ON public.videos FOR UPDATE TO authenticated USING (public.is_admin()) WITH CHECK (public.is_admin());
CREATE POLICY "Admins delete videos" ON public.videos FOR DELETE TO authenticated USING (public.is_admin());
CREATE TRIGGER update_videos_updated_at BEFORE UPDATE ON public.videos FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

CREATE TABLE public.articles (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  title text NOT NULL,
  slug text NOT NULL UNIQUE,
  excerpt text,
  body text,
  cover_image text,
  video_id uuid REFERENCES public.videos(id) ON DELETE SET NULL,
  category text,
  status text NOT NULL DEFAULT 'draft' CHECK (status IN ('draft','published')),
  publish_date timestamptz NOT NULL DEFAULT now(),
  seo_title text,
  seo_description text,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);
GRANT SELECT ON public.articles TO anon;
GRANT SELECT, INSERT, UPDATE, DELETE ON public.articles TO authenticated;
GRANT ALL ON public.articles TO service_role;
ALTER TABLE public.articles ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Anyone reads published articles" ON public.articles FOR SELECT TO anon, authenticated
  USING ((status = 'published' AND publish_date <= now()) OR public.is_admin());
CREATE POLICY "Admins insert articles" ON public.articles FOR INSERT TO authenticated WITH CHECK (public.is_admin());
CREATE POLICY "Admins update articles" ON public.articles FOR UPDATE TO authenticated USING (public.is_admin()) WITH CHECK (public.is_admin());
CREATE POLICY "Admins delete articles" ON public.articles FOR DELETE TO authenticated USING (public.is_admin());
CREATE TRIGGER update_articles_updated_at BEFORE UPDATE ON public.articles FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

-- Marketing media: readable by everyone (via short-lived links), writable only by admins.
CREATE POLICY "Anyone reads marketing media" ON storage.objects FOR SELECT TO anon, authenticated
  USING (bucket_id IN ('marketing-videos','marketing-images'));
CREATE POLICY "Admins upload marketing media" ON storage.objects FOR INSERT TO authenticated
  WITH CHECK (bucket_id IN ('marketing-videos','marketing-images') AND public.is_admin());
CREATE POLICY "Admins replace marketing media" ON storage.objects FOR UPDATE TO authenticated
  USING (bucket_id IN ('marketing-videos','marketing-images') AND public.is_admin());
CREATE POLICY "Admins delete marketing media" ON storage.objects FOR DELETE TO authenticated
  USING (bucket_id IN ('marketing-videos','marketing-images') AND public.is_admin());