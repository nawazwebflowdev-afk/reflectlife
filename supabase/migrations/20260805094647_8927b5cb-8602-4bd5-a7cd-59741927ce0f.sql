-- Remembrance Calendar core
CREATE TABLE public.remembrances (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  creator_id uuid NOT NULL,
  event_type text NOT NULL DEFAULT 'special_memory',
  event_date date NOT NULL,
  time_local time NOT NULL DEFAULT '09:00',
  timezone text NOT NULL DEFAULT 'UTC',
  recurrence text NOT NULL DEFAULT 'once',
  recurrence_interval integer NOT NULL DEFAULT 1,
  recurrence_unit text NOT NULL DEFAULT 'year',
  end_date date,
  message text,
  is_active boolean NOT NULL DEFAULT true,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  CONSTRAINT remembrances_event_type_chk CHECK (event_type IN ('birthday','date_of_death','anniversary','memorial_service','funeral','special_memory','custom')),
  CONSTRAINT remembrances_recurrence_chk CHECK (recurrence IN ('once','daily','weekly','monthly','yearly','custom')),
  CONSTRAINT remembrances_unit_chk CHECK (recurrence_unit IN ('day','week','month','year'))
);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.remembrances TO authenticated;
GRANT ALL ON public.remembrances TO service_role;
ALTER TABLE public.remembrances ENABLE ROW LEVEL SECURITY;

CREATE TABLE public.remembrance_subjects (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  remembrance_id uuid NOT NULL REFERENCES public.remembrances(id) ON DELETE CASCADE,
  memorial_id uuid REFERENCES public.memorials(id) ON DELETE SET NULL,
  subject_name text NOT NULL,
  subject_avatar_url text,
  created_at timestamptz NOT NULL DEFAULT now()
);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.remembrance_subjects TO authenticated;
GRANT ALL ON public.remembrance_subjects TO service_role;
ALTER TABLE public.remembrance_subjects ENABLE ROW LEVEL SECURITY;

CREATE TABLE public.remembrance_recipients (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  remembrance_id uuid NOT NULL REFERENCES public.remembrances(id) ON DELETE CASCADE,
  user_id uuid,
  invited_email text,
  invited_phone text,
  display_name text,
  timezone text,
  share_presence boolean NOT NULL DEFAULT true,
  status text NOT NULL DEFAULT 'active',
  created_at timestamptz NOT NULL DEFAULT now(),
  CONSTRAINT remembrance_recipients_status_chk CHECK (status IN ('active','paused','removed')),
  CONSTRAINT remembrance_recipients_target_chk CHECK (user_id IS NOT NULL OR invited_email IS NOT NULL OR invited_phone IS NOT NULL)
);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.remembrance_recipients TO authenticated;
GRANT ALL ON public.remembrance_recipients TO service_role;
ALTER TABLE public.remembrance_recipients ENABLE ROW LEVEL SECURITY;

CREATE TABLE public.remembrance_responses (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  remembrance_id uuid NOT NULL REFERENCES public.remembrances(id) ON DELETE CASCADE,
  occurrence_date date,
  user_id uuid NOT NULL,
  response_type text,
  response_text text,
  created_at timestamptz NOT NULL DEFAULT now()
);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.remembrance_responses TO authenticated;
GRANT ALL ON public.remembrance_responses TO service_role;
ALTER TABLE public.remembrance_responses ENABLE ROW LEVEL SECURITY;

CREATE TABLE public.remembrance_reactions (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  remembrance_id uuid NOT NULL REFERENCES public.remembrances(id) ON DELETE CASCADE,
  response_id uuid REFERENCES public.remembrance_responses(id) ON DELETE CASCADE,
  user_id uuid NOT NULL,
  reaction text NOT NULL,
  created_at timestamptz NOT NULL DEFAULT now()
);
CREATE UNIQUE INDEX remembrance_reactions_unique_response ON public.remembrance_reactions (response_id, user_id) WHERE response_id IS NOT NULL;
CREATE UNIQUE INDEX remembrance_reactions_unique_remembrance ON public.remembrance_reactions (remembrance_id, user_id) WHERE response_id IS NULL;
GRANT SELECT, INSERT, UPDATE, DELETE ON public.remembrance_reactions TO authenticated;
GRANT ALL ON public.remembrance_reactions TO service_role;
ALTER TABLE public.remembrance_reactions ENABLE ROW LEVEL SECURITY;

CREATE TABLE public.remembrance_deliveries (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  remembrance_id uuid NOT NULL REFERENCES public.remembrances(id) ON DELETE CASCADE,
  recipient_id uuid NOT NULL REFERENCES public.remembrance_recipients(id) ON DELETE CASCADE,
  scheduled_for timestamptz NOT NULL,
  status text NOT NULL DEFAULT 'pending',
  error text,
  delivered_at timestamptz,
  opened_at timestamptz,
  created_at timestamptz NOT NULL DEFAULT now()
);
CREATE UNIQUE INDEX remembrance_deliveries_unique ON public.remembrance_deliveries (remembrance_id, recipient_id, scheduled_for);
GRANT SELECT, UPDATE ON public.remembrance_deliveries TO authenticated;
GRANT ALL ON public.remembrance_deliveries TO service_role;
ALTER TABLE public.remembrance_deliveries ENABLE ROW LEVEL SECURITY;

CREATE INDEX idx_remembrance_subjects_rid ON public.remembrance_subjects(remembrance_id);
CREATE INDEX idx_remembrance_recipients_rid ON public.remembrance_recipients(remembrance_id);
CREATE INDEX idx_remembrance_recipients_user ON public.remembrance_recipients(user_id);
CREATE INDEX idx_remembrance_responses_rid ON public.remembrance_responses(remembrance_id);

-- Access helpers
CREATE OR REPLACE FUNCTION public.is_remembrance_creator(_remembrance_id uuid, _user_id uuid)
RETURNS boolean LANGUAGE sql STABLE SECURITY DEFINER SET search_path TO 'public' AS $$
  SELECT EXISTS (SELECT 1 FROM public.remembrances r WHERE r.id = _remembrance_id AND r.creator_id = _user_id)
$$;

CREATE OR REPLACE FUNCTION public.is_remembrance_participant(_remembrance_id uuid, _user_id uuid)
RETURNS boolean LANGUAGE sql STABLE SECURITY DEFINER SET search_path TO 'public' AS $$
  SELECT EXISTS (SELECT 1 FROM public.remembrances r WHERE r.id = _remembrance_id AND r.creator_id = _user_id)
      OR EXISTS (
        SELECT 1 FROM public.remembrance_recipients rr
        WHERE rr.remembrance_id = _remembrance_id
          AND rr.user_id = _user_id
          AND rr.status <> 'removed'
      )
$$;

-- Policies
CREATE POLICY "Participants view remembrances" ON public.remembrances FOR SELECT TO authenticated
  USING (creator_id = auth.uid() OR public.is_remembrance_participant(id, auth.uid()));
CREATE POLICY "Creators insert remembrances" ON public.remembrances FOR INSERT TO authenticated
  WITH CHECK (creator_id = auth.uid());
CREATE POLICY "Creators update remembrances" ON public.remembrances FOR UPDATE TO authenticated
  USING (creator_id = auth.uid()) WITH CHECK (creator_id = auth.uid());
CREATE POLICY "Creators delete remembrances" ON public.remembrances FOR DELETE TO authenticated
  USING (creator_id = auth.uid());

CREATE POLICY "Participants view subjects" ON public.remembrance_subjects FOR SELECT TO authenticated
  USING (public.is_remembrance_participant(remembrance_id, auth.uid()));
CREATE POLICY "Creators manage subjects" ON public.remembrance_subjects FOR ALL TO authenticated
  USING (public.is_remembrance_creator(remembrance_id, auth.uid()))
  WITH CHECK (public.is_remembrance_creator(remembrance_id, auth.uid()));

CREATE POLICY "Participants view recipients" ON public.remembrance_recipients FOR SELECT TO authenticated
  USING (user_id = auth.uid() OR public.is_remembrance_creator(remembrance_id, auth.uid()));
CREATE POLICY "Creators manage recipients" ON public.remembrance_recipients FOR ALL TO authenticated
  USING (public.is_remembrance_creator(remembrance_id, auth.uid()))
  WITH CHECK (public.is_remembrance_creator(remembrance_id, auth.uid()));
CREATE POLICY "Recipients update own preferences" ON public.remembrance_recipients FOR UPDATE TO authenticated
  USING (user_id = auth.uid()) WITH CHECK (user_id = auth.uid());

CREATE POLICY "Participants view responses" ON public.remembrance_responses FOR SELECT TO authenticated
  USING (public.is_remembrance_participant(remembrance_id, auth.uid()));
CREATE POLICY "Participants add responses" ON public.remembrance_responses FOR INSERT TO authenticated
  WITH CHECK (user_id = auth.uid() AND public.is_remembrance_participant(remembrance_id, auth.uid()));
CREATE POLICY "Authors update own responses" ON public.remembrance_responses FOR UPDATE TO authenticated
  USING (user_id = auth.uid()) WITH CHECK (user_id = auth.uid());
CREATE POLICY "Authors delete own responses" ON public.remembrance_responses FOR DELETE TO authenticated
  USING (user_id = auth.uid());

CREATE POLICY "Participants view reactions" ON public.remembrance_reactions FOR SELECT TO authenticated
  USING (public.is_remembrance_participant(remembrance_id, auth.uid()));
CREATE POLICY "Participants add reactions" ON public.remembrance_reactions FOR INSERT TO authenticated
  WITH CHECK (user_id = auth.uid() AND public.is_remembrance_participant(remembrance_id, auth.uid()));
CREATE POLICY "Authors delete own reactions" ON public.remembrance_reactions FOR DELETE TO authenticated
  USING (user_id = auth.uid());

CREATE POLICY "Participants view deliveries" ON public.remembrance_deliveries FOR SELECT TO authenticated
  USING (
    public.is_remembrance_creator(remembrance_id, auth.uid())
    OR EXISTS (SELECT 1 FROM public.remembrance_recipients rr WHERE rr.id = recipient_id AND rr.user_id = auth.uid())
  );
CREATE POLICY "Recipients mark deliveries opened" ON public.remembrance_deliveries FOR UPDATE TO authenticated
  USING (EXISTS (SELECT 1 FROM public.remembrance_recipients rr WHERE rr.id = recipient_id AND rr.user_id = auth.uid()))
  WITH CHECK (EXISTS (SELECT 1 FROM public.remembrance_recipients rr WHERE rr.id = recipient_id AND rr.user_id = auth.uid()));

CREATE TRIGGER update_remembrances_updated_at BEFORE UPDATE ON public.remembrances
FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

-- Privacy-safe people lookup: only people already connected to the caller
CREATE OR REPLACE FUNCTION public.search_my_contacts(_query text)
RETURNS TABLE (user_id uuid, full_name text, avatar_url text, relation text)
LANGUAGE sql STABLE SECURITY DEFINER SET search_path TO 'public' AS $$
  WITH me AS (SELECT auth.uid() AS uid),
  contacts AS (
    SELECT ma.user_id AS uid, 'memorial'::text AS relation
      FROM public.memorial_access ma
      JOIN public.memorials m ON m.id = ma.memorial_id
     WHERE ma.user_id IS NOT NULL AND ma.status = 'accepted'
       AND (m.user_id = (SELECT uid FROM me) OR ma.invited_by = (SELECT uid FROM me))
    UNION
    SELECT m.user_id, 'memorial' FROM public.memorial_access ma
      JOIN public.memorials m ON m.id = ma.memorial_id
     WHERE ma.user_id = (SELECT uid FROM me) AND ma.status = 'accepted'
    UNION
    SELECT ta.user_id, 'tree' FROM public.tree_access ta
      JOIN public.trees t ON t.id = ta.tree_id
     WHERE ta.user_id IS NOT NULL AND ta.status = 'accepted'
       AND (t.user_id = (SELECT uid FROM me) OR ta.invited_by = (SELECT uid FROM me))
    UNION
    SELECT t.user_id, 'tree' FROM public.tree_access ta
      JOIN public.trees t ON t.id = ta.tree_id
     WHERE ta.user_id = (SELECT uid FROM me) AND ta.status = 'accepted'
    UNION
    SELECT c.person_id, 'family' FROM public.connections c
     WHERE c.owner_id = (SELECT uid FROM me) AND c.person_id IS NOT NULL
  )
  SELECT p.id, COALESCE(NULLIF(trim(p.full_name), ''), p.username, p.email), p.avatar_url, min(ct.relation)
    FROM contacts ct
    JOIN public.profiles p ON p.id = ct.uid
   WHERE auth.uid() IS NOT NULL
     AND ct.uid <> auth.uid()
     AND COALESCE(p.is_deceased, false) = false
     AND (
       _query IS NULL OR length(trim(_query)) = 0
       OR p.full_name ILIKE '%' || _query || '%'
       OR p.username ILIKE '%' || _query || '%'
     )
   GROUP BY p.id, p.full_name, p.username, p.email, p.avatar_url
   LIMIT 20
$$;

CREATE OR REPLACE FUNCTION public.lookup_contact_by_phone(_phone text)
RETURNS TABLE (user_id uuid, full_name text, avatar_url text)
LANGUAGE sql STABLE SECURITY DEFINER SET search_path TO 'public' AS $$
  SELECT c.user_id, c.full_name, c.avatar_url
    FROM public.search_my_contacts(NULL) c
    JOIN public.profiles p ON p.id = c.user_id
   WHERE auth.uid() IS NOT NULL
     AND _phone IS NOT NULL
     AND length(regexp_replace(_phone, '[^0-9]', '', 'g')) >= 7
     AND regexp_replace(COALESCE(p.phone, ''), '[^0-9]', '', 'g') = regexp_replace(_phone, '[^0-9]', '', 'g')
   LIMIT 1
$$;

REVOKE ALL ON FUNCTION public.search_my_contacts(text) FROM PUBLIC;
REVOKE ALL ON FUNCTION public.lookup_contact_by_phone(text) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.search_my_contacts(text) TO authenticated;
GRANT EXECUTE ON FUNCTION public.lookup_contact_by_phone(text) TO authenticated;

ALTER PUBLICATION supabase_realtime ADD TABLE public.remembrance_responses;
ALTER PUBLICATION supabase_realtime ADD TABLE public.remembrance_reactions;