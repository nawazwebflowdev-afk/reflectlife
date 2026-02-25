-- Fix memorial_uploads storage policies to enforce user-scoped paths
-- Drop existing overly permissive policies
DROP POLICY IF EXISTS "Auth upload own memorial files" ON storage.objects;
DROP POLICY IF EXISTS "Auth update own memorial files" ON storage.objects;
DROP POLICY IF EXISTS "Auth delete own memorial files" ON storage.objects;

-- Create user-scoped policies: first folder must be the user's ID
CREATE POLICY "Users upload to own folder in memorial_uploads" ON storage.objects
  FOR INSERT WITH CHECK (
    bucket_id = 'memorial_uploads'
    AND auth.role() = 'authenticated'
    AND (storage.foldername(name))[1] = auth.uid()::text
  );

CREATE POLICY "Users update own files in memorial_uploads" ON storage.objects
  FOR UPDATE USING (
    bucket_id = 'memorial_uploads'
    AND auth.role() = 'authenticated'
    AND (storage.foldername(name))[1] = auth.uid()::text
  );

CREATE POLICY "Users delete own files in memorial_uploads" ON storage.objects
  FOR DELETE USING (
    bucket_id = 'memorial_uploads'
    AND auth.role() = 'authenticated'
    AND (storage.foldername(name))[1] = auth.uid()::text
  );