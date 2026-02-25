
-- Fix: Recreate view with SECURITY INVOKER to use querying user's permissions
DROP VIEW IF EXISTS public.public_profiles;

CREATE VIEW public.public_profiles
WITH (security_invoker = true)
AS
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

GRANT SELECT ON public.public_profiles TO authenticated, anon;

-- Also fix the update_creator_balance function missing search_path
CREATE OR REPLACE FUNCTION public.update_creator_balance(creator_id uuid, amount numeric)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = 'public'
AS $$
BEGIN
  UPDATE profiles
  SET earnings_balance = coalesce(earnings_balance, 0) + amount
  WHERE id = creator_id;
END;
$$;
