DROP POLICY IF EXISTS "Anyone reads marketing media" ON storage.objects;
DROP POLICY IF EXISTS "Admins upload marketing media" ON storage.objects;
DROP POLICY IF EXISTS "Admins replace marketing media" ON storage.objects;
DROP POLICY IF EXISTS "Admins delete marketing media" ON storage.objects;
DROP TABLE IF EXISTS public.articles;
DROP TABLE IF EXISTS public.videos;
DROP TABLE IF EXISTS public.content_categories;