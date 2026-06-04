
-- memorial_entries: respect parent memorial privacy
DROP POLICY IF EXISTS "Anyone can view memorial entries" ON public.memorial_entries;
CREATE POLICY "View memorial entries respecting privacy"
  ON public.memorial_entries FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM public.memorials m
      WHERE m.id = memorial_entries.timeline_id
        AND (
          (m.is_public = true AND m.privacy_level = 'public')
          OR m.user_id = auth.uid()
          OR public.has_memorial_access(m.id, auth.uid())
        )
    )
  );

-- memorial_tributes: respect parent memorial privacy
DROP POLICY IF EXISTS "Anyone can view memorial tributes" ON public.memorial_tributes;
CREATE POLICY "View memorial tributes respecting privacy"
  ON public.memorial_tributes FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM public.memorials m
      WHERE m.id = memorial_tributes.memorial_id
        AND (
          (m.is_public = true AND m.privacy_level = 'public')
          OR m.user_id = auth.uid()
          OR public.has_memorial_access(m.id, auth.uid())
        )
    )
  );

-- tributes (guest table): only public memorials
DROP POLICY IF EXISTS "Anyone can view guest tributes" ON public.tributes;
DROP POLICY IF EXISTS "Anyone can create guest tributes" ON public.tributes;

CREATE POLICY "View guest tributes on public memorials"
  ON public.tributes FOR SELECT
  USING (
    memorial_id IS NOT NULL AND EXISTS (
      SELECT 1 FROM public.memorials m
      WHERE m.id = tributes.memorial_id
        AND m.is_public = true
        AND m.privacy_level = 'public'
    )
  );

CREATE POLICY "Create guest tributes on public memorials"
  ON public.tributes FOR INSERT
  WITH CHECK (
    tribute_text IS NOT NULL
    AND char_length(tribute_text) > 0
    AND memorial_id IS NOT NULL
    AND EXISTS (
      SELECT 1 FROM public.memorials m
      WHERE m.id = tributes.memorial_id
        AND m.is_public = true
        AND m.privacy_level = 'public'
    )
  );

-- Storage: remove overly permissive timeline background policies
DROP POLICY IF EXISTS "Auth upload own timeline bg" ON storage.objects;
DROP POLICY IF EXISTS "Auth update own timeline bg" ON storage.objects;
DROP POLICY IF EXISTS "Auth delete own timeline bg" ON storage.objects;
