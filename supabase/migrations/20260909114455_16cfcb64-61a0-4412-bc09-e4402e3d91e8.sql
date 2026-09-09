CREATE TABLE public.memorial_campaign_payouts (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  campaign_id uuid NOT NULL REFERENCES public.memorial_campaigns(id) ON DELETE CASCADE,
  organizer_user_id uuid NOT NULL REFERENCES auth.users(id),
  amount numeric NOT NULL,
  status text NOT NULL DEFAULT 'pending',
  payout_method jsonb NOT NULL DEFAULT '{}'::jsonb,
  created_at timestamp with time zone NOT NULL DEFAULT now(),
  updated_at timestamp with time zone NOT NULL DEFAULT now()
);

GRANT SELECT, INSERT ON public.memorial_campaign_payouts TO authenticated;
GRANT ALL ON public.memorial_campaign_payouts TO service_role;

ALTER TABLE public.memorial_campaign_payouts ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Organizers can view their campaign payouts" ON public.memorial_campaign_payouts
  FOR SELECT TO authenticated
  USING (organizer_user_id = auth.uid());

CREATE POLICY "Organizers can create payouts for their campaigns" ON public.memorial_campaign_payouts
  FOR INSERT TO authenticated
  WITH CHECK (
    organizer_user_id = auth.uid()
    AND EXISTS (
      SELECT 1 FROM public.memorial_campaigns c
      WHERE c.id = campaign_id AND c.organizer_user_id = auth.uid()
    )
  );

CREATE OR REPLACE FUNCTION public.update_memorial_campaign_payouts_updated_at()
RETURNS trigger
LANGUAGE plpgsql
SET search_path = public
AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$;

CREATE TRIGGER update_memorial_campaign_payouts_updated_at
BEFORE UPDATE ON public.memorial_campaign_payouts
FOR EACH ROW EXECUTE FUNCTION public.update_memorial_campaign_payouts_updated_at();