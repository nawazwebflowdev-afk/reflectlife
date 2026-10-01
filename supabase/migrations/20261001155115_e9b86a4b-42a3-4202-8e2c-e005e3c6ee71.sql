REVOKE ALL ON FUNCTION public.guard_memorial_fundraiser() FROM PUBLIC, anon, authenticated;
REVOKE ALL ON FUNCTION public.can_view_memorial(uuid) FROM PUBLIC, anon, authenticated;
REVOKE ALL ON FUNCTION public.get_memorial_fundraiser(uuid) FROM PUBLIC;
REVOKE ALL ON FUNCTION public.get_memorial_donors(uuid, integer) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.get_memorial_fundraiser(uuid) TO anon, authenticated;
GRANT EXECUTE ON FUNCTION public.get_memorial_donors(uuid, integer) TO anon, authenticated;