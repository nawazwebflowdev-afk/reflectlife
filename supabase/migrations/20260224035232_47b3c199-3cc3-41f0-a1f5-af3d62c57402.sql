
-- Fix notifications INSERT policy: should only allow system/trigger inserts, not arbitrary
DROP POLICY IF EXISTS "System can insert notifications" ON public.notifications;
CREATE POLICY "Authenticated users can insert notifications"
  ON public.notifications
  FOR INSERT
  TO authenticated
  WITH CHECK (auth.uid() = actor_id);

-- Fix tree_contributions INSERT policy: too permissive (allows anyone)
DROP POLICY IF EXISTS "Public can INSERT contributions" ON public.tree_contributions;
CREATE POLICY "Authenticated users can insert contributions"
  ON public.tree_contributions
  FOR INSERT
  TO authenticated
  WITH CHECK (true);

-- Remove duplicate/redundant RLS policies on memorials
DROP POLICY IF EXISTS "debug_select" ON public.memorials;
DROP POLICY IF EXISTS "Anyone can view all memorials" ON public.memorials;
DROP POLICY IF EXISTS "Users can view their own memorials" ON public.memorials;
DROP POLICY IF EXISTS "Users can create their own memorials" ON public.memorials;
DROP POLICY IF EXISTS "Users can update their own memorials" ON public.memorials;
DROP POLICY IF EXISTS "Users can delete their own memorials" ON public.memorials;
-- Keep "Anyone can view public memorials" and "Users can manage their own memorials"

-- Remove duplicate debug_select on site_templates
DROP POLICY IF EXISTS "debug_select" ON public.site_templates;

-- Remove duplicate INSERT policies on site_templates (keep one)
DROP POLICY IF EXISTS "Creators can insert their own templates" ON public.site_templates;

-- Remove debug_select on trees
DROP POLICY IF EXISTS "debug_select" ON public.trees;

-- Remove duplicate tree policies
DROP POLICY IF EXISTS "Users can create their own trees" ON public.trees;
DROP POLICY IF EXISTS "Users can delete their own trees" ON public.trees;
DROP POLICY IF EXISTS "Users can update their own trees" ON public.trees;
DROP POLICY IF EXISTS "Users can view their own trees" ON public.trees;
