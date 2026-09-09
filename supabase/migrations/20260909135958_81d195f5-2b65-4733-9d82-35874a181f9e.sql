-- 1. Persistent hearts for memorial walls
CREATE TABLE IF NOT EXISTS public.memorial_hearts (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  memorial_id uuid NOT NULL REFERENCES public.memorials(id) ON DELETE CASCADE,
  user_id uuid REFERENCES auth.users(id) ON DELETE CASCADE,
  guest_key text,
  created_at timestamptz NOT NULL DEFAULT now()
);

GRANT SELECT, INSERT ON public.memorial_hearts TO anon;
GRANT SELECT, INSERT, DELETE ON public.memorial_hearts TO authenticated;
GRANT ALL ON public.memorial_hearts TO service_role;

ALTER TABLE public.memorial_hearts ENABLE ROW LEVEL SECURITY;

CREATE UNIQUE INDEX IF NOT EXISTS memorial_hearts_user_uniq
  ON public.memorial_hearts (memorial_id, user_id) WHERE user_id IS NOT NULL;
CREATE UNIQUE INDEX IF NOT EXISTS memorial_hearts_guest_uniq
  ON public.memorial_hearts (memorial_id, guest_key) WHERE guest_key IS NOT NULL;
CREATE INDEX IF NOT EXISTS memorial_hearts_memorial_idx ON public.memorial_hearts (memorial_id);

CREATE POLICY "Anyone can view hearts"
  ON public.memorial_hearts FOR SELECT
  TO anon, authenticated
  USING (true);

CREATE POLICY "Signed in users can add their own heart"
  ON public.memorial_hearts FOR INSERT
  TO authenticated
  WITH CHECK (user_id = auth.uid() AND guest_key IS NULL);

CREATE POLICY "Guests can add a heart with a guest key"
  ON public.memorial_hearts FOR INSERT
  TO anon
  WITH CHECK (user_id IS NULL AND guest_key IS NOT NULL AND length(guest_key) BETWEEN 8 AND 64);

CREATE POLICY "Users can remove their own heart"
  ON public.memorial_hearts FOR DELETE
  TO authenticated
  USING (user_id = auth.uid());

-- 2. Fundraiser type on campaigns (personal vs certified charity) drives donation fees
ALTER TABLE public.memorial_campaigns
  ADD COLUMN IF NOT EXISTS fundraiser_type text NOT NULL DEFAULT 'personal';

ALTER TABLE public.memorial_campaigns
  DROP CONSTRAINT IF EXISTS memorial_campaigns_fundraiser_type_check;
ALTER TABLE public.memorial_campaigns
  ADD CONSTRAINT memorial_campaigns_fundraiser_type_check
  CHECK (fundraiser_type IN ('personal', 'charity'));

UPDATE public.memorial_campaigns
  SET fundraiser_type = 'charity'
  WHERE charity_organization_name IS NOT NULL AND length(trim(charity_organization_name)) > 0;

-- 3. GoFundMe-style fee model: personal 3.1% + 0.30, certified charity 2.9% + 0.30
CREATE OR REPLACE FUNCTION public.compute_donation_fees()
RETURNS trigger
LANGUAGE plpgsql
SET search_path TO 'public'
AS $function$
DECLARE
  v_type text;
BEGIN
  SELECT fundraiser_type INTO v_type
  FROM public.memorial_campaigns
  WHERE id = NEW.campaign_id;

  NEW.platform_fee_rate := CASE WHEN v_type = 'charity' THEN 0.029 ELSE 0.031 END;
  NEW.platform_fee_amount := ROUND(NEW.gross_amount * NEW.platform_fee_rate + 0.30, 2);
  NEW.net_payout_amount := GREATEST(NEW.gross_amount - NEW.platform_fee_amount, 0);
  IF NEW.is_anonymous THEN NEW.donor_name := 'Anonymous'; END IF;
  RETURN NEW;
END $function$;