ALTER TABLE public.memorials
  ADD COLUMN IF NOT EXISTS slug text,
  ADD COLUMN IF NOT EXISTS memorial_type text NOT NULL DEFAULT 'standard',
  ADD COLUMN IF NOT EXISTS defender_label text,
  ADD COLUMN IF NOT EXISTS service_unit text,
  ADD COLUMN IF NOT EXISTS service_place text,
  ADD COLUMN IF NOT EXISTS guest_candles_enabled boolean NOT NULL DEFAULT true,
  ADD CONSTRAINT memorials_memorial_type_check CHECK (memorial_type IN ('standard','defender_of_ukraine')),
  ADD CONSTRAINT memorials_defender_label_check CHECK (defender_label IS NULL OR defender_label IN ('defender_male','defender_female'));

CREATE UNIQUE INDEX IF NOT EXISTS memorials_slug_unique_idx ON public.memorials(slug) WHERE slug IS NOT NULL;

CREATE TABLE public.memorial_guest_candles (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  memorial_id uuid NOT NULL REFERENCES public.memorials(id) ON DELETE CASCADE,
  contributor_name text,
  device_hash text NOT NULL,
  ip_hash text NOT NULL,
  hidden_by_owner boolean NOT NULL DEFAULT false,
  lit_at timestamptz NOT NULL DEFAULT now(),
  burns_until timestamptz NOT NULL DEFAULT (now() + interval '7 days'),
  CONSTRAINT guest_candle_name_length CHECK (contributor_name IS NULL OR char_length(contributor_name) <= 40)
);
GRANT SELECT ON public.memorial_guest_candles TO anon, authenticated;
GRANT UPDATE ON public.memorial_guest_candles TO authenticated;
GRANT ALL ON public.memorial_guest_candles TO service_role;
ALTER TABLE public.memorial_guest_candles ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Visible guest candles can be viewed" ON public.memorial_guest_candles FOR SELECT TO anon, authenticated USING (
  hidden_by_owner = false OR EXISTS (SELECT 1 FROM public.memorials m WHERE m.id = memorial_id AND m.user_id = auth.uid())
);
CREATE POLICY "Owners can hide guest candles" ON public.memorial_guest_candles FOR UPDATE TO authenticated USING (
  EXISTS (SELECT 1 FROM public.memorials m WHERE m.id = memorial_id AND m.user_id = auth.uid())
) WITH CHECK (
  EXISTS (SELECT 1 FROM public.memorials m WHERE m.id = memorial_id AND m.user_id = auth.uid())
);
CREATE INDEX memorial_guest_candles_memorial_lit_idx ON public.memorial_guest_candles(memorial_id, lit_at DESC);

CREATE TABLE public.guest_candle_rate_limits (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  memorial_id uuid NOT NULL REFERENCES public.memorials(id) ON DELETE CASCADE,
  device_hash text NOT NULL,
  ip_hash text NOT NULL,
  rate_date date NOT NULL DEFAULT CURRENT_DATE,
  created_at timestamptz NOT NULL DEFAULT now()
);
GRANT ALL ON public.guest_candle_rate_limits TO service_role;
ALTER TABLE public.guest_candle_rate_limits ENABLE ROW LEVEL SECURITY;
CREATE INDEX guest_candle_rate_lookup_idx ON public.guest_candle_rate_limits(memorial_id, device_hash, ip_hash, rate_date);

CREATE TABLE public.memorial_remembrance_preferences (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  memorial_id uuid NOT NULL UNIQUE REFERENCES public.memorials(id) ON DELETE CASCADE,
  owner_id uuid NOT NULL,
  ninth_day boolean NOT NULL DEFAULT false,
  fortieth_day boolean NOT NULL DEFAULT false,
  first_anniversary boolean NOT NULL DEFAULT false,
  annual_anniversary boolean NOT NULL DEFAULT false,
  owner_email_enabled boolean NOT NULL DEFAULT false,
  language text NOT NULL DEFAULT 'en' CHECK (language IN ('en','uk')),
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.memorial_remembrance_preferences TO authenticated;
GRANT ALL ON public.memorial_remembrance_preferences TO service_role;
ALTER TABLE public.memorial_remembrance_preferences ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Owners manage remembrance preferences" ON public.memorial_remembrance_preferences FOR ALL TO authenticated USING (
  owner_id = auth.uid() AND EXISTS (SELECT 1 FROM public.memorials m WHERE m.id = memorial_id AND m.user_id = auth.uid())
) WITH CHECK (
  owner_id = auth.uid() AND EXISTS (SELECT 1 FROM public.memorials m WHERE m.id = memorial_id AND m.user_id = auth.uid())
);
CREATE TRIGGER update_memorial_remembrance_preferences_updated_at BEFORE UPDATE ON public.memorial_remembrance_preferences FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

CREATE TABLE public.memorial_remembrance_recipients (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  preference_id uuid NOT NULL REFERENCES public.memorial_remembrance_preferences(id) ON DELETE CASCADE,
  access_id uuid NOT NULL REFERENCES public.memorial_access(id) ON DELETE CASCADE,
  recipient_user_id uuid,
  recipient_email text NOT NULL,
  opted_in boolean NOT NULL DEFAULT false,
  language text NOT NULL DEFAULT 'en' CHECK (language IN ('en','uk')),
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE(preference_id, recipient_email)
);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.memorial_remembrance_recipients TO authenticated;
GRANT ALL ON public.memorial_remembrance_recipients TO service_role;
ALTER TABLE public.memorial_remembrance_recipients ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Owners view remembrance recipients" ON public.memorial_remembrance_recipients FOR SELECT TO authenticated USING (
  EXISTS (SELECT 1 FROM public.memorial_remembrance_preferences p WHERE p.id = preference_id AND p.owner_id = auth.uid()) OR recipient_user_id = auth.uid()
);
CREATE POLICY "Owners add remembrance recipients" ON public.memorial_remembrance_recipients FOR INSERT TO authenticated WITH CHECK (
  EXISTS (SELECT 1 FROM public.memorial_remembrance_preferences p WHERE p.id = preference_id AND p.owner_id = auth.uid())
);
CREATE POLICY "Recipients or owners update opt in" ON public.memorial_remembrance_recipients FOR UPDATE TO authenticated USING (
  recipient_user_id = auth.uid() OR EXISTS (SELECT 1 FROM public.memorial_remembrance_preferences p WHERE p.id = preference_id AND p.owner_id = auth.uid())
) WITH CHECK (
  recipient_user_id = auth.uid() OR EXISTS (SELECT 1 FROM public.memorial_remembrance_preferences p WHERE p.id = preference_id AND p.owner_id = auth.uid())
);
CREATE POLICY "Owners remove remembrance recipients" ON public.memorial_remembrance_recipients FOR DELETE TO authenticated USING (
  EXISTS (SELECT 1 FROM public.memorial_remembrance_preferences p WHERE p.id = preference_id AND p.owner_id = auth.uid())
);
CREATE TRIGGER update_memorial_remembrance_recipients_updated_at BEFORE UPDATE ON public.memorial_remembrance_recipients FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

CREATE TABLE public.memorial_remembrance_deliveries (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  preference_id uuid NOT NULL REFERENCES public.memorial_remembrance_preferences(id) ON DELETE CASCADE,
  milestone_key text NOT NULL,
  recipient_email_hash text NOT NULL,
  scheduled_for date NOT NULL,
  sent_at timestamptz,
  error text,
  created_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE(preference_id, milestone_key, recipient_email_hash, scheduled_for)
);
GRANT ALL ON public.memorial_remembrance_deliveries TO service_role;
ALTER TABLE public.memorial_remembrance_deliveries ENABLE ROW LEVEL SECURITY;

CREATE TABLE public.guest_candle_conversions (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  memorial_id uuid NOT NULL REFERENCES public.memorials(id) ON DELETE CASCADE,
  device_hash text NOT NULL,
  user_id uuid,
  event_type text NOT NULL CHECK (event_type IN ('signup_started','signup_completed')),
  created_at timestamptz NOT NULL DEFAULT now()
);
GRANT ALL ON public.guest_candle_conversions TO service_role;
ALTER TABLE public.guest_candle_conversions ENABLE ROW LEVEL SECURITY;