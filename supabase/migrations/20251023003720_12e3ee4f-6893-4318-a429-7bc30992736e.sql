-- Add color_theme field to profiles table
ALTER TABLE public.profiles 
ADD COLUMN IF NOT EXISTS color_theme text DEFAULT 'light';

-- Update the handle_new_user function to include color_theme
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $$
BEGIN
  INSERT INTO public.profiles (id, full_name, avatar_url, email, logo_url, color_theme)
  VALUES (
    NEW.id,
    COALESCE(NEW.raw_user_meta_data->>'full_name', ''),
    COALESCE(NEW.raw_user_meta_data->>'avatar_url', ''),
    NEW.email,
    '',
    'light'
  );
  RETURN NEW;
END;
$$;