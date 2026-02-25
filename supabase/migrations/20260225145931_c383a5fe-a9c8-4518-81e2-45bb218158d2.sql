
-- Drop the overly permissive profile SELECT policy
DROP POLICY IF EXISTS "Authenticated can view profiles for social features" ON public.profiles;

-- Create a restricted view for social features (excludes email, phone_number, earnings_balance)
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
  is_premium,
  template_id,
  created_at
FROM public.profiles;

-- Grant access to the view
GRANT SELECT ON public.public_profiles TO authenticated, anon;
