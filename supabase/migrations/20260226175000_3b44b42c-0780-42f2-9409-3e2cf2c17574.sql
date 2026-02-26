
-- Drop the redundant old SELECT policy - the new "Admins can view all profiles" covers owner access too
DROP POLICY IF EXISTS "Users can view own profile" ON public.profiles;
