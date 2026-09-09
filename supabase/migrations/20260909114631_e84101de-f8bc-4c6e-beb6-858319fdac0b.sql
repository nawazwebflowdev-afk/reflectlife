REVOKE ALL ON FUNCTION public.get_campaign_payout_summary(uuid) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.get_campaign_payout_summary(uuid) TO authenticated;
GRANT EXECUTE ON FUNCTION public.get_campaign_payout_summary(uuid) TO service_role;

REVOKE ALL ON FUNCTION public.update_memorial_campaign_payouts_updated_at() FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.update_memorial_campaign_payouts_updated_at() TO authenticated;
GRANT EXECUTE ON FUNCTION public.update_memorial_campaign_payouts_updated_at() TO service_role;