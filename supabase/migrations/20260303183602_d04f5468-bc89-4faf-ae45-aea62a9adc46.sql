
-- Create a security definer function to check tree access without triggering RLS recursion
CREATE OR REPLACE FUNCTION public.has_tree_access(_owner_id uuid, _user_id uuid, _permission text)
RETURNS boolean
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT EXISTS (
    SELECT 1
    FROM public.trees t
    JOIN public.tree_access ta ON ta.tree_id = t.id
    WHERE t.user_id = _owner_id
      AND ta.user_id = _user_id
      AND ta.status = 'accepted'
      AND _permission = ANY(ta.permissions)
  )
$$;

-- Drop the problematic policy
DROP POLICY IF EXISTS "Granted users can add connections" ON public.connections;

-- Recreate using the security definer function
CREATE POLICY "Granted users can add connections"
ON public.connections
FOR INSERT
TO authenticated
WITH CHECK (
  (auth.uid() = owner_id)
  OR public.has_tree_access(owner_id, auth.uid(), 'add_connections')
);

-- Also fix the SELECT policy on connections that has the same recursion issue
DROP POLICY IF EXISTS "View own or granted connections" ON public.connections;

CREATE POLICY "View own or granted connections"
ON public.connections
FOR SELECT
TO authenticated
USING (
  (owner_id = auth.uid())
  OR public.has_tree_access(owner_id, auth.uid(), 'view')
);
