CREATE TYPE public.donor_type_enum AS ENUM ('private', 'company');
CREATE TYPE public.campaign_status_enum AS ENUM ('active', 'paused', 'completed', 'closed');

CREATE TABLE public.memorial_campaigns (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    memory_wall_id UUID NOT NULL REFERENCES public.memorials(id) ON DELETE CASCADE,
    organizer_user_id UUID NOT NULL,
    beneficiary_name VARCHAR(255) NOT NULL,
    charity_organization_name VARCHAR(255) DEFAULT NULL,
    story TEXT DEFAULT NULL,
    target_goal_amount DECIMAL(12, 2) NOT NULL DEFAULT 1000.00,
    currency VARCHAR(3) NOT NULL DEFAULT 'EUR',
    status public.campaign_status_enum NOT NULL DEFAULT 'active',
    created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
    UNIQUE (memory_wall_id)
);
GRANT SELECT ON public.memorial_campaigns TO anon;
GRANT SELECT, INSERT, UPDATE, DELETE ON public.memorial_campaigns TO authenticated;
GRANT ALL ON public.memorial_campaigns TO service_role;
ALTER TABLE public.memorial_campaigns ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Public can view active campaigns"
ON public.memorial_campaigns FOR SELECT
USING (status = 'active' OR organizer_user_id = auth.uid());

CREATE POLICY "Memorial owners can create campaigns"
ON public.memorial_campaigns FOR INSERT TO authenticated
WITH CHECK (organizer_user_id = auth.uid() AND public.is_memorial_owner(memory_wall_id, auth.uid()));

CREATE POLICY "Organizers can update their campaigns"
ON public.memorial_campaigns FOR UPDATE TO authenticated
USING (organizer_user_id = auth.uid()) WITH CHECK (organizer_user_id = auth.uid());

CREATE POLICY "Organizers can delete their campaigns"
ON public.memorial_campaigns FOR DELETE TO authenticated
USING (organizer_user_id = auth.uid());

CREATE TRIGGER update_memorial_campaigns_updated_at
BEFORE UPDATE ON public.memorial_campaigns
FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

CREATE TABLE public.memorial_donations (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    campaign_id UUID NOT NULL REFERENCES public.memorial_campaigns(id) ON DELETE CASCADE,
    donor_user_id UUID DEFAULT NULL,
    donor_type public.donor_type_enum NOT NULL DEFAULT 'private',
    gross_amount DECIMAL(12, 2) NOT NULL CHECK (gross_amount > 0),
    platform_fee_rate DECIMAL(4, 3) NOT NULL DEFAULT 0.025,
    platform_fee_amount DECIMAL(12, 2) NOT NULL DEFAULT 0,
    net_payout_amount DECIMAL(12, 2) NOT NULL DEFAULT 0,
    donor_name VARCHAR(255) DEFAULT 'Anonymous',
    donor_email VARCHAR(255) NOT NULL,
    condolence_message TEXT DEFAULT NULL,
    is_anonymous BOOLEAN NOT NULL DEFAULT FALSE,
    is_recurring BOOLEAN NOT NULL DEFAULT FALSE,
    stripe_session_id VARCHAR(255) UNIQUE,
    stripe_payment_intent_id VARCHAR(255) UNIQUE,
    payment_status VARCHAR(50) NOT NULL DEFAULT 'pending',
    created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
GRANT SELECT ON public.memorial_donations TO authenticated;
GRANT ALL ON public.memorial_donations TO service_role;
ALTER TABLE public.memorial_donations ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Organizers and donors can view donations"
ON public.memorial_donations FOR SELECT TO authenticated
USING (
  donor_user_id = auth.uid()
  OR EXISTS (SELECT 1 FROM public.memorial_campaigns c WHERE c.id = campaign_id AND c.organizer_user_id = auth.uid())
);

CREATE INDEX idx_memorial_donations_campaign ON public.memorial_donations(campaign_id, payment_status);

-- Fee calculation: 2.5% private, 3.0% company (server-side, cannot be spoofed)
CREATE OR REPLACE FUNCTION public.compute_donation_fees()
RETURNS trigger LANGUAGE plpgsql SET search_path = public AS $$
BEGIN
  NEW.platform_fee_rate := CASE WHEN NEW.donor_type = 'company' THEN 0.030 ELSE 0.025 END;
  NEW.platform_fee_amount := ROUND(NEW.gross_amount * NEW.platform_fee_rate, 2);
  NEW.net_payout_amount := NEW.gross_amount - NEW.platform_fee_amount;
  IF NEW.is_anonymous THEN NEW.donor_name := 'Anonymous'; END IF;
  RETURN NEW;
END $$;
CREATE TRIGGER compute_donation_fees_trg
BEFORE INSERT OR UPDATE OF gross_amount, donor_type, is_anonymous ON public.memorial_donations
FOR EACH ROW EXECUTE FUNCTION public.compute_donation_fees();

-- Organizer dashboard view (respects RLS of the caller)
CREATE OR REPLACE VIEW public.vw_charity_dashboard_summary
WITH (security_invoker = true) AS
SELECT
    mc.id AS campaign_id,
    mc.beneficiary_name,
    mc.target_goal_amount,
    COALESCE(SUM(md.gross_amount), 0) AS total_gross_raised,
    COALESCE(SUM(md.platform_fee_amount), 0) AS total_platform_fees_deducted,
    COALESCE(SUM(md.net_payout_amount), 0) AS total_net_payout,
    COUNT(md.id) AS total_donor_count,
    COUNT(CASE WHEN md.donor_type = 'company' THEN 1 END) AS corporate_donor_count,
    COUNT(CASE WHEN md.donor_type = 'private' THEN 1 END) AS private_donor_count
FROM public.memorial_campaigns mc
LEFT JOIN public.memorial_donations md ON mc.id = md.campaign_id AND md.payment_status = 'succeeded'
GROUP BY mc.id, mc.beneficiary_name, mc.target_goal_amount;
GRANT SELECT ON public.vw_charity_dashboard_summary TO authenticated, service_role;

-- Public totals for the progress bar (no personal data)
CREATE OR REPLACE FUNCTION public.get_campaign_public_summary(_campaign_id uuid)
RETURNS TABLE(total_raised numeric, donor_count bigint)
LANGUAGE sql STABLE SECURITY DEFINER SET search_path = public AS $$
  SELECT COALESCE(SUM(gross_amount), 0), COUNT(*)
  FROM public.memorial_donations
  WHERE campaign_id = _campaign_id AND payment_status = 'succeeded';
$$;

-- Public supporter feed (anonymous donors masked, no email)
CREATE OR REPLACE FUNCTION public.get_campaign_public_donations(_campaign_id uuid, _limit int DEFAULT 20)
RETURNS TABLE(id uuid, donor_name text, donor_type public.donor_type_enum, gross_amount numeric, condolence_message text, created_at timestamptz)
LANGUAGE sql STABLE SECURITY DEFINER SET search_path = public AS $$
  SELECT id,
         CASE WHEN is_anonymous THEN 'Anonymous' ELSE donor_name END,
         donor_type, gross_amount, condolence_message, created_at
  FROM public.memorial_donations
  WHERE campaign_id = _campaign_id AND payment_status = 'succeeded'
  ORDER BY created_at DESC
  LIMIT LEAST(GREATEST(_limit, 1), 100);
$$;
GRANT EXECUTE ON FUNCTION public.get_campaign_public_summary(uuid) TO anon, authenticated;
GRANT EXECUTE ON FUNCTION public.get_campaign_public_donations(uuid, int) TO anon, authenticated;