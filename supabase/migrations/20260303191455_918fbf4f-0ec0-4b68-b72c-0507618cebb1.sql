
-- Create a security definer function to check memorial ownership without triggering RLS
CREATE OR REPLACE FUNCTION public.is_memorial_owner(_memorial_id uuid, _user_id uuid)
RETURNS boolean
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT EXISTS (
    SELECT 1 FROM public.memorials
    WHERE id = _memorial_id AND user_id = _user_id
  )
$$;

-- Create a security definer function to check memorial access
CREATE OR REPLACE FUNCTION public.has_memorial_access(_memorial_id uuid, _user_id uuid)
RETURNS boolean
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT EXISTS (
    SELECT 1 FROM public.memorial_access
    WHERE memorial_id = _memorial_id
      AND user_id = _user_id
      AND status = 'accepted'
  )
$$;

-- Drop the recursive SELECT policy on memorials
DROP POLICY IF EXISTS "View public or granted memorials" ON public.memorials;

-- Recreate without recursive memorial_access subquery
CREATE POLICY "View public or granted memorials"
ON public.memorials FOR SELECT
TO authenticated
USING (
  ((is_public = true) AND (privacy_level = 'public'::privacy_level))
  OR (user_id = auth.uid())
  OR has_memorial_access(id, auth.uid())
);

-- Also allow anon users to see public memorials
CREATE POLICY "Anon view public memorials"
ON public.memorials FOR SELECT
TO anon
USING ((is_public = true) AND (privacy_level = 'public'::privacy_level));

-- Fix memorial_access ALL policy to use security definer function
DROP POLICY IF EXISTS "Memorial owners can manage access" ON public.memorial_access;

CREATE POLICY "Memorial owners can manage access"
ON public.memorial_access FOR ALL
TO authenticated
USING (is_memorial_owner(memorial_id, auth.uid()))
WITH CHECK (is_memorial_owner(memorial_id, auth.uid()));
