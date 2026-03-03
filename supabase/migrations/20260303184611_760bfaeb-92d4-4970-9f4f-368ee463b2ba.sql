
-- Fix infinite recursion on trees table SELECT policy
-- The current policy queries tree_access, which has an ALL policy that queries trees back

-- Create a security definer function to check tree_access without RLS
CREATE OR REPLACE FUNCTION public.user_has_tree_access(_tree_id uuid, _user_id uuid)
RETURNS boolean
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT EXISTS (
    SELECT 1 FROM public.tree_access
    WHERE tree_id = _tree_id
      AND user_id = _user_id
      AND status = 'accepted'
  )
$$;

-- Drop and recreate the trees SELECT policy
DROP POLICY IF EXISTS "View own or granted trees" ON public.trees;

CREATE POLICY "View own or granted trees"
ON public.trees
FOR SELECT
TO authenticated
USING (
  (user_id = auth.uid())
  OR (is_public = true)
  OR public.user_has_tree_access(id, auth.uid())
);

-- Also fix tree_access ALL policy to use security definer function
CREATE OR REPLACE FUNCTION public.is_tree_owner(_tree_id uuid, _user_id uuid)
RETURNS boolean
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT EXISTS (
    SELECT 1 FROM public.trees
    WHERE id = _tree_id
      AND user_id = _user_id
  )
$$;

DROP POLICY IF EXISTS "Tree owners can manage access" ON public.tree_access;

CREATE POLICY "Tree owners can manage access"
ON public.tree_access
FOR ALL
TO authenticated
USING (public.is_tree_owner(tree_id, auth.uid()));
