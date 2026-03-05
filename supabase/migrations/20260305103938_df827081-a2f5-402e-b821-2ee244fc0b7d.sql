
-- Drop both restrictive SELECT policies
DROP POLICY IF EXISTS "Anon view public memorials" ON public.memorials;
DROP POLICY IF EXISTS "View public or granted memorials" ON public.memorials;

-- Create a single PERMISSIVE SELECT policy that covers all cases
CREATE POLICY "View public or own or granted memorials"
ON public.memorials
FOR SELECT
USING (
  (is_public = true AND privacy_level = 'public'::privacy_level)
  OR (auth.uid() = user_id)
  OR has_memorial_access(id, auth.uid())
);
