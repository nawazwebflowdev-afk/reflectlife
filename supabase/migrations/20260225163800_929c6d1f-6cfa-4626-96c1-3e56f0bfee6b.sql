
-- Fix tree_contributions: drop broken policies and add restrictive ones
DROP POLICY IF EXISTS "Authenticated users can insert contributions" ON public.tree_contributions;
DROP POLICY IF EXISTS "Owners can DELETE contributions" ON public.tree_contributions;
DROP POLICY IF EXISTS "Owners can SELECT contributions" ON public.tree_contributions;
DROP POLICY IF EXISTS "Owners can UPDATE contributions" ON public.tree_contributions;

-- Deny all access since these tables are unused
CREATE POLICY "No access" ON public.tree_contributions FOR ALL USING (false) WITH CHECK (false);

-- Fix tree_nodes: drop broken policies and add restrictive ones
DROP POLICY IF EXISTS "Tree owners can DELETE nodes" ON public.tree_nodes;
DROP POLICY IF EXISTS "Tree owners can INSERT nodes" ON public.tree_nodes;
DROP POLICY IF EXISTS "Tree owners can SELECT nodes" ON public.tree_nodes;
DROP POLICY IF EXISTS "Tree owners can UPDATE nodes" ON public.tree_nodes;

CREATE POLICY "No access" ON public.tree_nodes FOR ALL USING (false) WITH CHECK (false);
