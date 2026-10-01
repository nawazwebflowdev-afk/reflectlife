ALTER TABLE public.memorials ADD COLUMN IF NOT EXISTS theme text NOT NULL DEFAULT 'standard';

CREATE TABLE public.memorial_invite_events (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  memorial_id uuid NOT NULL REFERENCES public.memorials(id) ON DELETE CASCADE,
  owner_id uuid NOT NULL,
  channel text NOT NULL,
  created_at timestamptz NOT NULL DEFAULT now()
);
GRANT SELECT, INSERT ON public.memorial_invite_events TO authenticated;
GRANT ALL ON public.memorial_invite_events TO service_role;
ALTER TABLE public.memorial_invite_events ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Owners log invites" ON public.memorial_invite_events FOR INSERT TO authenticated
  WITH CHECK (owner_id = auth.uid() AND channel IN ('whatsapp','telegram','viber','email','copy') AND public.is_memorial_owner(memorial_id, auth.uid()));
CREATE POLICY "Owners read invites" ON public.memorial_invite_events FOR SELECT TO authenticated
  USING (owner_id = auth.uid() OR public.has_role(auth.uid(), 'admin'));

CREATE TABLE public.owner_notification_settings (
  user_id uuid PRIMARY KEY,
  new_memory_email boolean NOT NULL DEFAULT true,
  weekly_summary_email boolean NOT NULL DEFAULT true,
  updated_at timestamptz NOT NULL DEFAULT now()
);
GRANT SELECT, INSERT, UPDATE ON public.owner_notification_settings TO authenticated;
GRANT ALL ON public.owner_notification_settings TO service_role;
ALTER TABLE public.owner_notification_settings ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Own notification settings" ON public.owner_notification_settings FOR ALL TO authenticated
  USING (user_id = auth.uid()) WITH CHECK (user_id = auth.uid());

CREATE TABLE public.owner_email_log (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  kind text NOT NULL,
  ref_id text NOT NULL,
  created_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE (kind, ref_id)
);
GRANT ALL ON public.owner_email_log TO service_role;
ALTER TABLE public.owner_email_log ENABLE ROW LEVEL SECURITY;