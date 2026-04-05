
-- Fix 1: Add ownership check to timeline_backgrounds storage UPDATE/DELETE policies
DROP POLICY IF EXISTS "Users can update own backgrounds" ON storage.objects;
DROP POLICY IF EXISTS "Users can delete own backgrounds" ON storage.objects;
DROP POLICY IF EXISTS "Authenticated users can update backgrounds" ON storage.objects;
DROP POLICY IF EXISTS "Authenticated users can delete backgrounds" ON storage.objects;

CREATE POLICY "Users can update own timeline backgrounds"
ON storage.objects FOR UPDATE
USING (
  bucket_id = 'timeline_backgrounds'
  AND (storage.foldername(name))[1] = (auth.uid())::text
);

CREATE POLICY "Users can delete own timeline backgrounds"
ON storage.objects FOR DELETE
USING (
  bucket_id = 'timeline_backgrounds'
  AND (storage.foldername(name))[1] = (auth.uid())::text
);

-- Fix 2: Restrict diary_entries SELECT to require authentication for non-owner reads
DROP POLICY IF EXISTS "Users can view own diary" ON public.diary_entries;

CREATE POLICY "Users can view own diary"
ON public.diary_entries FOR SELECT
USING (
  auth.uid() = user_id
  OR (is_private = false AND auth.uid() IS NOT NULL)
);
