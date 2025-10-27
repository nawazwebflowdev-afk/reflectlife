-- Create enum for user roles
CREATE TYPE public.app_role AS ENUM ('admin', 'creator', 'user');

-- Create user_roles table
CREATE TABLE public.user_roles (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL,
  role app_role NOT NULL,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT now(),
  UNIQUE (user_id, role)
);

-- Enable RLS on user_roles
ALTER TABLE public.user_roles ENABLE ROW LEVEL SECURITY;

-- Policy: Users can view their own roles
CREATE POLICY "Users can view their own roles"
ON public.user_roles
FOR SELECT
USING (auth.uid() = user_id);

-- Policy: Only admins can insert roles
CREATE POLICY "Admins can insert roles"
ON public.user_roles
FOR INSERT
WITH CHECK (
  EXISTS (
    SELECT 1 FROM public.user_roles
    WHERE user_id = auth.uid() AND role = 'admin'
  )
);

-- Create security definer function to check roles
CREATE OR REPLACE FUNCTION public.has_role(_user_id uuid, _role app_role)
RETURNS boolean
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT EXISTS (
    SELECT 1
    FROM public.user_roles
    WHERE user_id = _user_id
      AND role = _role
  )
$$;

-- Add creator_id column to tree_templates
ALTER TABLE public.tree_templates
ADD COLUMN creator_id UUID REFERENCES auth.users(id) ON DELETE SET NULL;

-- Policy 2: Allow INSERT only for approved creators
CREATE POLICY "Approved creators can insert tree templates"
ON public.tree_templates
FOR INSERT
WITH CHECK (
  EXISTS (
    SELECT 1 FROM public.template_creators
    WHERE user_id = auth.uid() AND approved = true
  )
);

-- Policy 3: Allow UPDATE for creator or admin
CREATE POLICY "Creators and admins can update tree templates"
ON public.tree_templates
FOR UPDATE
USING (
  auth.uid() = creator_id OR public.has_role(auth.uid(), 'admin')
);

-- Policy 4: Allow DELETE for creator or admin
CREATE POLICY "Creators and admins can delete tree templates"
ON public.tree_templates
FOR DELETE
USING (
  auth.uid() = creator_id OR public.has_role(auth.uid(), 'admin')
);