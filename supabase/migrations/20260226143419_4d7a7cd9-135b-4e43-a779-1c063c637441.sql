-- Drop the current SELECT policy that queries auth.users directly
DROP POLICY IF EXISTS "Users can view relevant invitations" ON public.memorial_invitations;

-- Create a tighter policy: inviters can see their own invitations,
-- and invitees can see invitations sent to their email (matched via profiles table)
CREATE POLICY "Inviters can view own invitations"
  ON public.memorial_invitations
  FOR SELECT
  USING (invited_by = auth.uid());

CREATE POLICY "Invitees can view their invitations"
  ON public.memorial_invitations
  FOR SELECT
  USING (
    invitee_email = (
      SELECT email FROM public.profiles WHERE id = auth.uid()
    )
  );