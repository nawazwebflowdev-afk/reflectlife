CREATE OR REPLACE FUNCTION public.get_campaign_payout_summary(_campaign_id uuid)
RETURNS TABLE(
  total_gross numeric,
  total_net numeric,
  total_paid_out numeric,
  available_payout numeric,
  donor_count bigint
)
LANGUAGE sql
STABLE SECURITY DEFINER
SET search_path = public
AS $$
  WITH donations AS (
    SELECT COALESCE(SUM(gross_amount), 0) AS gross,
           COALESCE(SUM(net_payout_amount), 0) AS net,
           COUNT(*) AS donors
    FROM public.memorial_donations
    WHERE campaign_id = _campaign_id
      AND payment_status = 'succeeded'
  ),
  payouts AS (
    SELECT COALESCE(SUM(amount), 0) AS paid
    FROM public.memorial_campaign_payouts
    WHERE campaign_id = _campaign_id
      AND status = 'completed'
  )
  SELECT d.gross AS total_gross,
         d.net AS total_net,
         p.paid AS total_paid_out,
         GREATEST(d.net - p.paid, 0) AS available_payout,
         d.donors AS donor_count
  FROM donations d, payouts p;
$$;

GRANT EXECUTE ON FUNCTION public.get_campaign_payout_summary(uuid) TO authenticated;
GRANT EXECUTE ON FUNCTION public.get_campaign_payout_summary(uuid) TO service_role;