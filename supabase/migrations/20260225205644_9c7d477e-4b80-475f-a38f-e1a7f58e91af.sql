
-- 1. Restrict profiles SELECT to owner-only
DROP POLICY IF EXISTS "Users can view all profiles" ON profiles;

CREATE POLICY "Users can view own profile"
  ON profiles
  FOR SELECT
  USING (auth.uid() = id);

-- 2. Create profile-pictures bucket with RLS policies
INSERT INTO storage.buckets (id, name, public)
VALUES ('profile-pictures', 'profile-pictures', true)
ON CONFLICT (id) DO NOTHING;

CREATE POLICY "Authenticated users can upload profile pictures"
  ON storage.objects FOR INSERT
  WITH CHECK (
    bucket_id = 'profile-pictures'
    AND auth.uid()::text = (storage.foldername(name))[1]
  );

CREATE POLICY "Anyone can view profile pictures"
  ON storage.objects FOR SELECT
  USING (bucket_id = 'profile-pictures');

CREATE POLICY "Users can update own profile pictures"
  ON storage.objects FOR UPDATE
  USING (
    bucket_id = 'profile-pictures'
    AND auth.uid()::text = (storage.foldername(name))[1]
  );

CREATE POLICY "Users can delete own profile pictures"
  ON storage.objects FOR DELETE
  USING (
    bucket_id = 'profile-pictures'
    AND auth.uid()::text = (storage.foldername(name))[1]
  );
