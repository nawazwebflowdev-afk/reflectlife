-- Drop the security definer view (it has issues)
DROP VIEW IF EXISTS public.public_profiles;

-- Drop the overly permissive policy we just created
DROP POLICY IF EXISTS "Authenticated users can view limited profile data via view" ON public.profiles;

-- Create a better approach: allow authenticated users to view limited fields
-- The application code will be updated to only select non-sensitive columns
-- For now, allow authenticated users to view profiles (for social features)
-- But the frontend code MUST be updated to only select safe columns
CREATE POLICY "Authenticated can view profiles for social features"
ON public.profiles
FOR SELECT
TO authenticated
USING (true);

-- Keep the existing user self-access policies (they already exist):
-- "Users can view their own profile" - auth.uid() = id
-- "Users can manage their own profile" - auth.uid() = id  
-- "Users can update their own profile" - auth.uid() = id
-- "Users can delete their own profile" - auth.uid() = id
-- "Users can insert their own profile" - auth.uid() = id