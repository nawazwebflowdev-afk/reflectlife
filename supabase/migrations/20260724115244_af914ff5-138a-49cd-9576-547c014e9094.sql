
CREATE TABLE public.memorial_remembrances (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  memorial_id UUID NOT NULL UNIQUE REFERENCES public.memorials(id) ON DELETE CASCADE,
  created_by UUID NOT NULL,
  time_utc TIME NOT NULL,
  timezone TEXT NOT NULL DEFAULT 'UTC',
  time_local TEXT NOT NULL,
  frequency TEXT NOT NULL CHECK (frequency IN ('daily','weekly','monthly','yearly')),
  anchor_date DATE NOT NULL,
  has_end_date BOOLEAN NOT NULL DEFAULT false,
  end_date DATE,
  reminder_enabled BOOLEAN NOT NULL DEFAULT true,
  reminder_timing TEXT NOT NULL DEFAULT '2_minutes_before' CHECK (reminder_timing IN ('2_minutes_before','1_day_before')),
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

GRANT SELECT ON public.memorial_remembrances TO anon;
GRANT SELECT, INSERT, UPDATE, DELETE ON public.memorial_remembrances TO authenticated;
GRANT ALL ON public.memorial_remembrances TO service_role;

ALTER TABLE public.memorial_remembrances ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Read remembrance if memorial visible"
ON public.memorial_remembrances FOR SELECT
USING (
  EXISTS (
    SELECT 1 FROM public.memorials m
    WHERE m.id = memorial_id
      AND (
        (m.is_public = true AND m.privacy_level = 'public')
        OR m.user_id = auth.uid()
        OR public.has_memorial_access(m.id, auth.uid())
      )
  )
);

CREATE POLICY "Owner or collaborator can insert remembrance"
ON public.memorial_remembrances FOR INSERT
TO authenticated
WITH CHECK (
  created_by = auth.uid() AND (
    public.is_memorial_owner(memorial_id, auth.uid())
    OR public.has_memorial_access(memorial_id, auth.uid())
  )
);

CREATE POLICY "Owner or collaborator can update remembrance"
ON public.memorial_remembrances FOR UPDATE
TO authenticated
USING (
  public.is_memorial_owner(memorial_id, auth.uid())
  OR public.has_memorial_access(memorial_id, auth.uid())
)
WITH CHECK (
  public.is_memorial_owner(memorial_id, auth.uid())
  OR public.has_memorial_access(memorial_id, auth.uid())
);

CREATE POLICY "Owner or collaborator can delete remembrance"
ON public.memorial_remembrances FOR DELETE
TO authenticated
USING (
  public.is_memorial_owner(memorial_id, auth.uid())
  OR public.has_memorial_access(memorial_id, auth.uid())
);

CREATE TRIGGER update_memorial_remembrances_updated_at
BEFORE UPDATE ON public.memorial_remembrances
FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

-- Dedupe log for sent reminder emails
CREATE TABLE public.remembrance_notifications (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  remembrance_id UUID NOT NULL REFERENCES public.memorial_remembrances(id) ON DELETE CASCADE,
  event_at TIMESTAMPTZ NOT NULL,
  sent_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  recipients_count INTEGER NOT NULL DEFAULT 0,
  UNIQUE(remembrance_id, event_at)
);

GRANT ALL ON public.remembrance_notifications TO service_role;
ALTER TABLE public.remembrance_notifications ENABLE ROW LEVEL SECURITY;

-- Realtime for instant clock updates across viewers
ALTER PUBLICATION supabase_realtime ADD TABLE public.memorial_remembrances;
