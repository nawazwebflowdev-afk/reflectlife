CREATE OR REPLACE FUNCTION public.is_admin()
RETURNS boolean LANGUAGE sql STABLE SECURITY INVOKER SET search_path = public
AS $$ SELECT public.has_role(auth.uid(), 'admin') $$;