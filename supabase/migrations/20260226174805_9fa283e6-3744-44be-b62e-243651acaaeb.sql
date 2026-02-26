
-- =============================================
-- FIX 1: Profiles public exposure
-- Drop any overly permissive public SELECT policy on profiles
-- =============================================
DROP POLICY IF EXISTS "Public profiles are viewable by everyone" ON public.profiles;

-- Add admin SELECT policy so admins can view all profiles (needed for admin panel)
CREATE POLICY "Admins can view all profiles"
  ON public.profiles
  FOR SELECT
  TO authenticated
  USING (auth.uid() = id OR public.has_role(auth.uid(), 'admin'::app_role));

-- =============================================
-- FIX 2: Template creators self-approval bypass
-- Prevent users from modifying their own approved status
-- =============================================

-- Drop the existing permissive update policy that allows self-approval
DROP POLICY IF EXISTS "Users can update own creator profile" ON public.template_creators;

-- Only admins can update template_creators (approve/reject)
DROP POLICY IF EXISTS "Admins can update creators" ON public.template_creators;
CREATE POLICY "Admins can update creators"
  ON public.template_creators
  FOR UPDATE
  TO authenticated
  USING (public.has_role(auth.uid(), 'admin'::app_role));

-- Only admins can delete applications
DROP POLICY IF EXISTS "Admins can delete applications" ON public.template_creators;
CREATE POLICY "Admins can delete applications"
  ON public.template_creators
  FOR DELETE
  TO authenticated
  USING (public.has_role(auth.uid(), 'admin'::app_role));

-- =============================================
-- FIX 3: Foreign key constraints on invited_by
-- Prevent forged invitations
-- =============================================
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.table_constraints 
    WHERE constraint_name = 'fk_memorial_access_invited_by'
  ) THEN
    ALTER TABLE public.memorial_access 
    ADD CONSTRAINT fk_memorial_access_invited_by 
    FOREIGN KEY (invited_by) REFERENCES auth.users(id) ON DELETE CASCADE;
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM information_schema.table_constraints 
    WHERE constraint_name = 'fk_tree_access_invited_by'
  ) THEN
    ALTER TABLE public.tree_access 
    ADD CONSTRAINT fk_tree_access_invited_by 
    FOREIGN KEY (invited_by) REFERENCES auth.users(id) ON DELETE CASCADE;
  END IF;
END $$;
