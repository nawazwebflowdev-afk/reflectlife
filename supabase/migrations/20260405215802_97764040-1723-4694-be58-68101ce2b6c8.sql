
-- Fix 1: Create a SECURITY DEFINER function to check if current user is the invitee
-- This avoids subquerying profiles.email which could leak emails
CREATE OR REPLACE FUNCTION public.is_invitee(_invitation_email text)
RETURNS boolean
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT EXISTS (
    SELECT 1 FROM public.profiles
    WHERE id = auth.uid() AND email = _invitation_email
  )
$$;

-- Replace the memorial_invitations SELECT policy
DROP POLICY IF EXISTS "Inviters can view own invitations" ON public.memorial_invitations;

CREATE POLICY "Inviters can view own invitations"
ON public.memorial_invitations FOR SELECT
USING (
  invited_by = auth.uid()
  OR is_invitee(invitee_email)
);

-- Fix 2: Restrict memorial_media SELECT to respect memorial privacy
DROP POLICY IF EXISTS "Anyone can view memorial media" ON public.memorial_media;

CREATE POLICY "View media respecting memorial privacy"
ON public.memorial_media FOR SELECT
USING (
  EXISTS (
    SELECT 1 FROM public.memorials m
    WHERE m.id = memorial_media.memorial_id
    AND (
      (m.is_public = true AND m.privacy_level = 'public')
      OR m.user_id = auth.uid()
      OR has_memorial_access(m.id, auth.uid())
    )
  )
);
