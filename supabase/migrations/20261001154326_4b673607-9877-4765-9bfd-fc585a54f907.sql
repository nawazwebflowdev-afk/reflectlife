CREATE TABLE public.platform_settings (
  key text PRIMARY KEY,
  value jsonb NOT NULL,
  updated_at timestamptz NOT NULL DEFAULT now()
);
GRANT SELECT ON public.platform_settings TO anon, authenticated;
GRANT INSERT, UPDATE ON public.platform_settings TO authenticated;
GRANT ALL ON public.platform_settings TO service_role;
ALTER TABLE public.platform_settings ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Anyone can read platform settings" ON public.platform_settings FOR SELECT USING (true);
CREATE POLICY "Admins can insert platform settings" ON public.platform_settings FOR INSERT TO authenticated WITH CHECK (public.has_role(auth.uid(), 'admin'));
CREATE POLICY "Admins can update platform settings" ON public.platform_settings FOR UPDATE TO authenticated USING (public.has_role(auth.uid(), 'admin')) WITH CHECK (public.has_role(auth.uid(), 'admin'));
INSERT INTO public.platform_settings(key, value) VALUES ('donation_fee_percent', '7'::jsonb), ('donations_test_mode', 'true'::jsonb) ON CONFLICT DO NOTHING;

CREATE TABLE public.memorial_fundraisers (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  memorial_id uuid NOT NULL UNIQUE REFERENCES public.memorials(id) ON DELETE CASCADE,
  owner_id uuid NOT NULL,
  enabled boolean NOT NULL DEFAULT false,
  recipient_type text NOT NULL DEFAULT 'private' CHECK (recipient_type IN ('private','company','charity')),
  recipient_name text,
  recipient_email text,
  country text,
  stripe_account_id text UNIQUE,
  charges_enabled boolean NOT NULL DEFAULT false,
  payouts_enabled boolean NOT NULL DEFAULT false,
  currency text,
  external_url text,
  show_totals boolean NOT NULL DEFAULT false,
  admin_paused boolean NOT NULL DEFAULT false,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);
GRANT SELECT, INSERT, UPDATE ON public.memorial_fundraisers TO authenticated;
GRANT ALL ON public.memorial_fundraisers TO service_role;
ALTER TABLE public.memorial_fundraisers ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Owners and admins read fundraisers" ON public.memorial_fundraisers FOR SELECT TO authenticated USING (owner_id = auth.uid() OR public.has_role(auth.uid(), 'admin'));
CREATE POLICY "Owners create fundraiser for own memorial" ON public.memorial_fundraisers FOR INSERT TO authenticated WITH CHECK (owner_id = auth.uid() AND public.is_memorial_owner(memorial_id, auth.uid()));
CREATE POLICY "Owners and admins update fundraisers" ON public.memorial_fundraisers FOR UPDATE TO authenticated USING (owner_id = auth.uid() OR public.has_role(auth.uid(), 'admin')) WITH CHECK (owner_id = auth.uid() OR public.has_role(auth.uid(), 'admin'));

-- Protect system-managed columns from browser writes
CREATE OR REPLACE FUNCTION public.guard_memorial_fundraiser()
RETURNS trigger LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE is_admin boolean := public.has_role(auth.uid(), 'admin');
BEGIN
  IF NEW.external_url IS NOT NULL AND NEW.external_url !~* '^https://[^\s]+$' THEN
    RAISE EXCEPTION 'External fundraising link must start with https://';
  END IF;
  IF NEW.recipient_name IS NOT NULL AND length(NEW.recipient_name) > 120 THEN RAISE EXCEPTION 'Recipient name too long'; END IF;
  IF auth.role() = 'service_role' THEN NEW.updated_at := now(); RETURN NEW; END IF;
  IF TG_OP = 'INSERT' THEN
    NEW.stripe_account_id := NULL; NEW.charges_enabled := false; NEW.payouts_enabled := false; NEW.currency := NULL; NEW.admin_paused := false;
  ELSE
    NEW.stripe_account_id := OLD.stripe_account_id; NEW.charges_enabled := OLD.charges_enabled; NEW.payouts_enabled := OLD.payouts_enabled;
    NEW.currency := OLD.currency; NEW.owner_id := OLD.owner_id; NEW.memorial_id := OLD.memorial_id;
    IF NOT is_admin THEN NEW.admin_paused := OLD.admin_paused; END IF;
    -- Recipient type/country are fixed once a Stripe account exists
    IF OLD.stripe_account_id IS NOT NULL THEN NEW.recipient_type := OLD.recipient_type; NEW.country := OLD.country; END IF;
  END IF;
  NEW.updated_at := now();
  RETURN NEW;
END $$;
CREATE TRIGGER guard_memorial_fundraiser BEFORE INSERT OR UPDATE ON public.memorial_fundraisers FOR EACH ROW EXECUTE FUNCTION public.guard_memorial_fundraiser();

CREATE TABLE public.fundraiser_donations (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  fundraiser_id uuid NOT NULL REFERENCES public.memorial_fundraisers(id) ON DELETE CASCADE,
  memorial_id uuid NOT NULL REFERENCES public.memorials(id) ON DELETE CASCADE,
  stripe_session_id text NOT NULL UNIQUE,
  stripe_payment_intent_id text,
  stripe_charge_id text,
  currency text NOT NULL,
  amount_cents integer NOT NULL,
  fee_cents integer NOT NULL DEFAULT 0,
  net_cents integer NOT NULL,
  covered_fees boolean NOT NULL DEFAULT false,
  donor_name text,
  anonymous boolean NOT NULL DEFAULT false,
  message text,
  message_hidden boolean NOT NULL DEFAULT false,
  status text NOT NULL DEFAULT 'succeeded' CHECK (status IN ('succeeded','refunded','partially_refunded')),
  refunded_cents integer NOT NULL DEFAULT 0,
  livemode boolean NOT NULL DEFAULT false,
  created_at timestamptz NOT NULL DEFAULT now()
);
CREATE INDEX fundraiser_donations_memorial_idx ON public.fundraiser_donations(memorial_id, created_at DESC);
GRANT SELECT ON public.fundraiser_donations TO authenticated;
GRANT ALL ON public.fundraiser_donations TO service_role;
ALTER TABLE public.fundraiser_donations ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Owners and admins read donations" ON public.fundraiser_donations FOR SELECT TO authenticated USING (public.has_role(auth.uid(), 'admin') OR EXISTS (SELECT 1 FROM public.memorial_fundraisers f WHERE f.id = fundraiser_id AND f.owner_id = auth.uid()));

CREATE TABLE public.fundraiser_reports (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  memorial_id uuid NOT NULL REFERENCES public.memorials(id) ON DELETE CASCADE,
  reporter_email text,
  reason text NOT NULL,
  reporter_user_id uuid,
  resolved boolean NOT NULL DEFAULT false,
  created_at timestamptz NOT NULL DEFAULT now()
);
GRANT SELECT, UPDATE ON public.fundraiser_reports TO authenticated;
GRANT ALL ON public.fundraiser_reports TO service_role;
ALTER TABLE public.fundraiser_reports ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Admins read reports" ON public.fundraiser_reports FOR SELECT TO authenticated USING (public.has_role(auth.uid(), 'admin'));
CREATE POLICY "Admins update reports" ON public.fundraiser_reports FOR UPDATE TO authenticated USING (public.has_role(auth.uid(), 'admin')) WITH CHECK (public.has_role(auth.uid(), 'admin'));

CREATE OR REPLACE FUNCTION public.can_view_memorial(_memorial_id uuid)
RETURNS boolean LANGUAGE sql STABLE SECURITY DEFINER SET search_path = public AS $$
  SELECT EXISTS (SELECT 1 FROM public.memorials m WHERE m.id = _memorial_id
    AND (m.is_public IS TRUE OR m.user_id = auth.uid() OR (auth.uid() IS NOT NULL AND public.has_memorial_access(_memorial_id, auth.uid()))))
$$;

CREATE OR REPLACE FUNCTION public.get_memorial_fundraiser(_memorial_id uuid)
RETURNS TABLE(enabled boolean, recipient_type text, recipient_name text, ready boolean, external_url text, currency text,
  show_totals boolean, paused boolean, fee_percent numeric, test_mode boolean, total_raised_cents bigint, donor_count bigint)
LANGUAGE sql STABLE SECURITY DEFINER SET search_path = public AS $$
  SELECT f.enabled, f.recipient_type, f.recipient_name,
    (f.stripe_account_id IS NOT NULL AND f.charges_enabled AND f.payouts_enabled),
    f.external_url, f.currency, f.show_totals, f.admin_paused,
    CASE WHEN m.memorial_type = 'defender_of_ukraine' OR (f.external_url IS NOT NULL AND f.stripe_account_id IS NULL) THEN 0
      ELSE COALESCE((SELECT (value #>> '{}')::numeric FROM public.platform_settings WHERE key = 'donation_fee_percent'), 7) END,
    COALESCE((SELECT (value #>> '{}')::boolean FROM public.platform_settings WHERE key = 'donations_test_mode'), true),
    CASE WHEN f.show_totals THEN (SELECT COALESCE(sum(d.amount_cents - d.refunded_cents),0) FROM public.fundraiser_donations d WHERE d.fundraiser_id = f.id AND d.status <> 'refunded') END,
    CASE WHEN f.show_totals THEN (SELECT count(*) FROM public.fundraiser_donations d WHERE d.fundraiser_id = f.id AND d.status <> 'refunded') END
  FROM public.memorial_fundraisers f JOIN public.memorials m ON m.id = f.memorial_id
  WHERE f.memorial_id = _memorial_id AND public.can_view_memorial(_memorial_id)
$$;

CREATE OR REPLACE FUNCTION public.get_memorial_donors(_memorial_id uuid, _limit integer DEFAULT 50)
RETURNS TABLE(id uuid, donor_name text, message text, created_at timestamptz)
LANGUAGE sql STABLE SECURITY DEFINER SET search_path = public AS $$
  SELECT d.id, CASE WHEN d.anonymous THEN NULL ELSE d.donor_name END,
    CASE WHEN d.message_hidden THEN NULL ELSE d.message END, d.created_at
  FROM public.fundraiser_donations d
  WHERE d.memorial_id = _memorial_id AND d.status <> 'refunded' AND public.can_view_memorial(_memorial_id)
  ORDER BY d.created_at DESC LIMIT LEAST(GREATEST(_limit,1),200)
$$;

CREATE OR REPLACE FUNCTION public.set_donation_message_hidden(_donation_id uuid, _hidden boolean)
RETURNS void LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM public.fundraiser_donations d JOIN public.memorial_fundraisers f ON f.id = d.fundraiser_id
    WHERE d.id = _donation_id AND (f.owner_id = auth.uid() OR public.has_role(auth.uid(),'admin'))) THEN
    RAISE EXCEPTION 'Not allowed';
  END IF;
  UPDATE public.fundraiser_donations SET message_hidden = _hidden WHERE id = _donation_id;
END $$;

REVOKE ALL ON FUNCTION public.set_donation_message_hidden(uuid, boolean) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.set_donation_message_hidden(uuid, boolean) TO authenticated;
GRANT EXECUTE ON FUNCTION public.get_memorial_fundraiser(uuid) TO anon, authenticated;
GRANT EXECUTE ON FUNCTION public.get_memorial_donors(uuid, integer) TO anon, authenticated;
GRANT EXECUTE ON FUNCTION public.can_view_memorial(uuid) TO anon, authenticated;