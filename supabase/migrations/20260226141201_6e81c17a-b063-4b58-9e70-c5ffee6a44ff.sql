
-- Memorial access grants (who can view/interact with private memorials)
CREATE TABLE public.memorial_access (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  memorial_id uuid NOT NULL REFERENCES public.memorials(id) ON DELETE CASCADE,
  user_id uuid REFERENCES auth.users(id) ON DELETE CASCADE,
  invited_email text,
  invited_by uuid NOT NULL,
  permissions text[] NOT NULL DEFAULT ARRAY['view', 'comment', 'tribute'],
  status text NOT NULL DEFAULT 'pending',
  created_at timestamptz NOT NULL DEFAULT now(),
  CONSTRAINT memorial_access_user_or_email CHECK (user_id IS NOT NULL OR invited_email IS NOT NULL)
);

CREATE UNIQUE INDEX idx_memorial_access_user ON public.memorial_access(memorial_id, user_id) WHERE user_id IS NOT NULL;
CREATE UNIQUE INDEX idx_memorial_access_email ON public.memorial_access(memorial_id, invited_email) WHERE invited_email IS NOT NULL;

ALTER TABLE public.memorial_access ENABLE ROW LEVEL SECURITY;

-- Owner of the memorial can manage access
CREATE POLICY "Memorial owners can manage access"
  ON public.memorial_access FOR ALL
  USING (EXISTS (
    SELECT 1 FROM memorials WHERE memorials.id = memorial_access.memorial_id AND memorials.user_id = auth.uid()
  ));

-- Invited users can view their own access grants
CREATE POLICY "Users can view own access grants"
  ON public.memorial_access FOR SELECT
  USING (user_id = auth.uid());

-- Tree access grants (who can view/interact with private trees)
CREATE TABLE public.tree_access (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  tree_id uuid NOT NULL REFERENCES public.trees(id) ON DELETE CASCADE,
  user_id uuid REFERENCES auth.users(id) ON DELETE CASCADE,
  invited_email text,
  invited_by uuid NOT NULL,
  permissions text[] NOT NULL DEFAULT ARRAY['view', 'comment', 'add_connections'],
  status text NOT NULL DEFAULT 'pending',
  created_at timestamptz NOT NULL DEFAULT now(),
  CONSTRAINT tree_access_user_or_email CHECK (user_id IS NOT NULL OR invited_email IS NOT NULL)
);

CREATE UNIQUE INDEX idx_tree_access_user ON public.tree_access(tree_id, user_id) WHERE user_id IS NOT NULL;
CREATE UNIQUE INDEX idx_tree_access_email ON public.tree_access(tree_id, invited_email) WHERE invited_email IS NOT NULL;

ALTER TABLE public.tree_access ENABLE ROW LEVEL SECURITY;

-- Owner of the tree can manage access
CREATE POLICY "Tree owners can manage access"
  ON public.tree_access FOR ALL
  USING (EXISTS (
    SELECT 1 FROM trees WHERE trees.id = tree_access.tree_id AND trees.user_id = auth.uid()
  ));

-- Invited users can view own access
CREATE POLICY "Users can view own tree access"
  ON public.tree_access FOR SELECT
  USING (user_id = auth.uid());

-- Update memorials SELECT policy to also allow invited users to view private memorials
DROP POLICY IF EXISTS "Anyone can view public memorials" ON public.memorials;
CREATE POLICY "View public or granted memorials"
  ON public.memorials FOR SELECT
  USING (
    (is_public = true AND privacy_level = 'public'::privacy_level)
    OR (user_id = auth.uid())
    OR (EXISTS (
      SELECT 1 FROM memorial_access
      WHERE memorial_access.memorial_id = memorials.id
      AND memorial_access.user_id = auth.uid()
      AND memorial_access.status = 'accepted'
    ))
  );

-- Drop the separate "Users can view own memorials" since it's now merged above
DROP POLICY IF EXISTS "Users can view own memorials" ON public.memorials;

-- Update trees SELECT: allow invited users to view private trees
DROP POLICY IF EXISTS "Public trees viewable" ON public.trees;
DROP POLICY IF EXISTS "Users can view own trees" ON public.trees;
CREATE POLICY "View own or granted trees"
  ON public.trees FOR SELECT
  USING (
    (user_id = auth.uid())
    OR (is_public = true)
    OR (EXISTS (
      SELECT 1 FROM tree_access
      WHERE tree_access.tree_id = trees.id
      AND tree_access.user_id = auth.uid()
      AND tree_access.status = 'accepted'
    ))
  );

-- Allow invited users to view connections on shared trees
DROP POLICY IF EXISTS "Users can view own connections" ON public.connections;
CREATE POLICY "View own or granted connections"
  ON public.connections FOR SELECT
  USING (
    (owner_id = auth.uid())
    OR (EXISTS (
      SELECT 1 FROM trees t
      JOIN tree_access ta ON ta.tree_id = t.id
      WHERE t.user_id = connections.owner_id
      AND ta.user_id = auth.uid()
      AND ta.status = 'accepted'
      AND 'view' = ANY(ta.permissions)
    ))
  );

-- Allow invited users to add connections to shared trees
CREATE POLICY "Granted users can add connections"
  ON public.connections FOR INSERT
  WITH CHECK (
    (auth.uid() = owner_id)
    OR (EXISTS (
      SELECT 1 FROM trees t
      JOIN tree_access ta ON ta.tree_id = t.id
      WHERE t.user_id = connections.owner_id
      AND ta.user_id = auth.uid()
      AND ta.status = 'accepted'
      AND 'add_connections' = ANY(ta.permissions)
    ))
  );

-- Allow invited users to add tributes to private memorials
DROP POLICY IF EXISTS "Auth users can create tributes" ON public.memorial_tributes;
CREATE POLICY "Auth users can create tributes"
  ON public.memorial_tributes FOR INSERT
  WITH CHECK (
    auth.uid() = user_id
    AND (
      EXISTS (SELECT 1 FROM memorials WHERE id = memorial_tributes.memorial_id AND (is_public = true OR user_id = auth.uid()))
      OR EXISTS (
        SELECT 1 FROM memorial_access
        WHERE memorial_access.memorial_id = memorial_tributes.memorial_id
        AND memorial_access.user_id = auth.uid()
        AND memorial_access.status = 'accepted'
        AND 'tribute' = ANY(memorial_access.permissions)
      )
    )
  );
