
-- Fix memorials: all policies are RESTRICTIVE, need PERMISSIVE SELECT policies

-- Drop existing SELECT policies
DROP POLICY IF EXISTS "View public or granted memorials" ON public.memorials;
DROP POLICY IF EXISTS "Anon view public memorials" ON public.memorials;
DROP POLICY IF EXISTS "Users can create own memorials" ON public.memorials;
DROP POLICY IF EXISTS "Users can update own memorials" ON public.memorials;
DROP POLICY IF EXISTS "Users can delete own memorials" ON public.memorials;

-- Recreate as explicitly PERMISSIVE
CREATE POLICY "View public or granted memorials"
ON public.memorials AS PERMISSIVE FOR SELECT
TO authenticated
USING (
  (is_public = true AND privacy_level = 'public'::privacy_level)
  OR user_id = auth.uid()
  OR has_memorial_access(id, auth.uid())
);

CREATE POLICY "Anon view public memorials"
ON public.memorials AS PERMISSIVE FOR SELECT
TO anon
USING (is_public = true AND privacy_level = 'public'::privacy_level);

CREATE POLICY "Users can create own memorials"
ON public.memorials AS PERMISSIVE FOR INSERT
TO authenticated
WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update own memorials"
ON public.memorials AS PERMISSIVE FOR UPDATE
TO authenticated
USING (auth.uid() = user_id);

CREATE POLICY "Users can delete own memorials"
ON public.memorials AS PERMISSIVE FOR DELETE
TO authenticated
USING (auth.uid() = user_id);
