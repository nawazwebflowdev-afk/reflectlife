ALTER TABLE public.memorial_remembrances
  ADD COLUMN IF NOT EXISTS custom_message text;

CREATE TABLE IF NOT EXISTS public.remembrance_phone_recipients (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  remembrance_id uuid NOT NULL REFERENCES public.memorial_remembrances(id) ON DELETE CASCADE,
  memorial_id uuid NOT NULL REFERENCES public.memorials(id) ON DELETE CASCADE,
  phone text NOT NULL,
  display_name text,
  channel text NOT NULL DEFAULT 'sms',
  created_by uuid NOT NULL,
  created_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE (remembrance_id, phone, channel)
);

GRANT SELECT, INSERT, UPDATE, DELETE ON public.remembrance_phone_recipients TO authenticated;
GRANT ALL ON public.remembrance_phone_recipients TO service_role;

ALTER TABLE public.remembrance_phone_recipients ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Memorial team can view phone recipients"
ON public.remembrance_phone_recipients
AS PERMISSIVE FOR SELECT
TO authenticated
USING (
  public.is_memorial_owner(memorial_id, auth.uid())
  OR public.has_memorial_access(memorial_id, auth.uid())
);

CREATE POLICY "Memorial team can add phone recipients"
ON public.remembrance_phone_recipients
AS PERMISSIVE FOR INSERT
TO authenticated
WITH CHECK (
  created_by = auth.uid()
  AND (
    public.is_memorial_owner(memorial_id, auth.uid())
    OR public.has_memorial_access(memorial_id, auth.uid())
  )
);

CREATE POLICY "Memorial team can update phone recipients"
ON public.remembrance_phone_recipients
AS PERMISSIVE FOR UPDATE
TO authenticated
USING (
  public.is_memorial_owner(memorial_id, auth.uid())
  OR public.has_memorial_access(memorial_id, auth.uid())
)
WITH CHECK (
  public.is_memorial_owner(memorial_id, auth.uid())
  OR public.has_memorial_access(memorial_id, auth.uid())
);

CREATE POLICY "Memorial team can delete phone recipients"
ON public.remembrance_phone_recipients
AS PERMISSIVE FOR DELETE
TO authenticated
USING (
  public.is_memorial_owner(memorial_id, auth.uid())
  OR public.has_memorial_access(memorial_id, auth.uid())
);

CREATE INDEX IF NOT EXISTS remembrance_phone_recipients_remembrance_idx
  ON public.remembrance_phone_recipients (remembrance_id);