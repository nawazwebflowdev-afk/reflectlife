
-- ============================================
-- SECURITY HARDENING: REMOVE ALWAYS-TRUE RLS
-- Fixes Supabase linter: permissive RLS policies
-- ============================================

-- 1) memorial_entries: tie entries to memorial owner via timeline_id -> memorials.id
ALTER TABLE public.memorial_entries
  ADD CONSTRAINT memorial_entries_timeline_id_fkey
  FOREIGN KEY (timeline_id) REFERENCES public.memorials(id) ON DELETE CASCADE;

DROP POLICY IF EXISTS "Auth users can create entries" ON public.memorial_entries;
DROP POLICY IF EXISTS "Auth users can update entries" ON public.memorial_entries;
DROP POLICY IF EXISTS "Auth users can delete entries" ON public.memorial_entries;

CREATE POLICY "Memorial owners can create entries" ON public.memorial_entries
  FOR INSERT TO authenticated
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM public.memorials m
      WHERE m.id = memorial_entries.timeline_id
        AND m.user_id = auth.uid()
    )
  );

CREATE POLICY "Memorial owners can update entries" ON public.memorial_entries
  FOR UPDATE TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM public.memorials m
      WHERE m.id = memorial_entries.timeline_id
        AND m.user_id = auth.uid()
    )
  );

CREATE POLICY "Memorial owners can delete entries" ON public.memorial_entries
  FOR DELETE TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM public.memorials m
      WHERE m.id = memorial_entries.timeline_id
        AND m.user_id = auth.uid()
    )
  );

-- 2) notifications: only allow creating notifications for yourself from client
DROP POLICY IF EXISTS "Auth users can create notifications" ON public.notifications;

CREATE POLICY "Users can create own notifications" ON public.notifications
  FOR INSERT TO authenticated
  WITH CHECK (auth.uid() = user_id);

-- 3) memorial_candles: allow anon/auth insert without always-true check
DROP POLICY IF EXISTS "Anyone can light a candle" ON public.memorial_candles;

CREATE POLICY "Anyone can light a candle" ON public.memorial_candles
  FOR INSERT TO anon, authenticated
  WITH CHECK (
    memorial_id IS NOT NULL
    AND (
      session_id IS NOT NULL
      OR user_id IS NOT NULL
    )
  );

-- 4) tributes (guest tributes): require non-empty tribute_text
DROP POLICY IF EXISTS "Anyone can create guest tributes" ON public.tributes;

CREATE POLICY "Anyone can create guest tributes" ON public.tributes
  FOR INSERT TO anon, authenticated
  WITH CHECK (
    tribute_text IS NOT NULL
    AND char_length(tribute_text) > 0
  );
