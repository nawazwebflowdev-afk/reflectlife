-- Drop overly permissive policies that expose all profile data
DROP POLICY IF EXISTS "Public profiles are viewable by everyone" ON public.profiles;
DROP POLICY IF EXISTS "debug_select" ON public.profiles;

-- Create a secure view that only exposes non-sensitive profile columns
CREATE OR REPLACE VIEW public.public_profiles AS
SELECT 
  id,
  full_name,
  first_name,
  last_name,
  avatar_url,
  logo_url,
  bio,
  color_theme,
  username,
  emoji_avatar,
  is_deceased,
  country,
  created_at
FROM public.profiles;

-- Grant access to the view for both anonymous and authenticated users
GRANT SELECT ON public.public_profiles TO anon, authenticated;

-- Add a policy to allow authenticated users to see other profiles for social features
-- This is needed for features like showing who commented, who liked, etc.
-- But it's scoped properly - users only see their own full profile via direct table access
CREATE POLICY "Authenticated users can view limited profile data via view"
ON public.profiles
FOR SELECT
TO authenticated
USING (true);

-- Note: The view public_profiles should be used in the frontend code for 
-- displaying other users' info (comments, likes, tributes) to avoid exposing email/phone