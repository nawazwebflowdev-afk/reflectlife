
-- =============================================
-- FIX 1: Tighten storage policies for all buckets
-- =============================================

-- Drop overly permissive storage policies
DROP POLICY IF EXISTS "Auth upload avatars" ON storage.objects;
DROP POLICY IF EXISTS "Auth update avatars" ON storage.objects;
DROP POLICY IF EXISTS "Auth delete avatars" ON storage.objects;
DROP POLICY IF EXISTS "Auth upload memorial files" ON storage.objects;
DROP POLICY IF EXISTS "Auth update memorial files" ON storage.objects;
DROP POLICY IF EXISTS "Auth delete memorial files" ON storage.objects;
DROP POLICY IF EXISTS "Auth upload timeline bg" ON storage.objects;
DROP POLICY IF EXISTS "Auth update timeline bg" ON storage.objects;
DROP POLICY IF EXISTS "Auth delete timeline bg" ON storage.objects;
DROP POLICY IF EXISTS "Users upload own avatars" ON storage.objects;
DROP POLICY IF EXISTS "Users update own avatars" ON storage.objects;
DROP POLICY IF EXISTS "Users delete own avatars" ON storage.objects;
DROP POLICY IF EXISTS "Authenticated users can upload avatars" ON storage.objects;
DROP POLICY IF EXISTS "Authenticated users can update avatars" ON storage.objects;
DROP POLICY IF EXISTS "Authenticated users can delete avatars" ON storage.objects;

-- Avatars: restrict to user's own file (path = user-avatars/{uid}.webp)
CREATE POLICY "Users upload own avatars" ON storage.objects
  FOR INSERT WITH CHECK (
    bucket_id = 'avatars'
    AND auth.role() = 'authenticated'
    AND name LIKE 'user-avatars/' || auth.uid()::text || '%'
  );

CREATE POLICY "Users update own avatars" ON storage.objects
  FOR UPDATE USING (
    bucket_id = 'avatars'
    AND auth.role() = 'authenticated'
    AND name LIKE 'user-avatars/' || auth.uid()::text || '%'
  );

CREATE POLICY "Users delete own avatars" ON storage.objects
  FOR DELETE USING (
    bucket_id = 'avatars'
    AND auth.role() = 'authenticated'
    AND name LIKE 'user-avatars/' || auth.uid()::text || '%'
  );

-- Memorial uploads: keep auth-only (no user-scoped folder structure in codebase)
CREATE POLICY "Auth upload own memorial files" ON storage.objects
  FOR INSERT WITH CHECK (
    bucket_id = 'memorial_uploads'
    AND auth.role() = 'authenticated'
  );

CREATE POLICY "Auth update own memorial files" ON storage.objects
  FOR UPDATE USING (
    bucket_id = 'memorial_uploads'
    AND auth.role() = 'authenticated'
  );

CREATE POLICY "Auth delete own memorial files" ON storage.objects
  FOR DELETE USING (
    bucket_id = 'memorial_uploads'
    AND auth.role() = 'authenticated'
  );

-- Timeline backgrounds: keep auth-only
CREATE POLICY "Auth upload own timeline bg" ON storage.objects
  FOR INSERT WITH CHECK (
    bucket_id = 'timeline_backgrounds'
    AND auth.role() = 'authenticated'
  );

CREATE POLICY "Auth update own timeline bg" ON storage.objects
  FOR UPDATE USING (
    bucket_id = 'timeline_backgrounds'
    AND auth.role() = 'authenticated'
  );

CREATE POLICY "Auth delete own timeline bg" ON storage.objects
  FOR DELETE USING (
    bucket_id = 'timeline_backgrounds'
    AND auth.role() = 'authenticated'
  );

-- =============================================
-- FIX 2: Protect is_premium and earnings_balance on profiles
-- =============================================
DROP POLICY IF EXISTS "Users can update own profile" ON public.profiles;

CREATE POLICY "Users can update own profile" ON public.profiles
  FOR UPDATE TO authenticated
  USING (auth.uid() = id)
  WITH CHECK (
    auth.uid() = id
    AND is_premium IS NOT DISTINCT FROM (SELECT p.is_premium FROM profiles p WHERE p.id = auth.uid())
    AND earnings_balance IS NOT DISTINCT FROM (SELECT p.earnings_balance FROM profiles p WHERE p.id = auth.uid())
  );
