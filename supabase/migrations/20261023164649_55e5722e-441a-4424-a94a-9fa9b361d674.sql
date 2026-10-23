-- 1. Sensitive: signed-in only, with owner checks
REVOKE EXECUTE ON FUNCTION public.request_payout(numeric, jsonb) FROM PUBLIC, anon;
REVOKE EXECUTE ON FUNCTION public.get_campaign_payout_summary(uuid) FROM PUBLIC, anon;
REVOKE EXECUTE ON FUNCTION public.search_my_contacts(text) FROM PUBLIC, anon;
REVOKE EXECUTE ON FUNCTION public.lookup_contact_by_phone(text) FROM PUBLIC, anon;
REVOKE EXECUTE ON FUNCTION public.set_donation_message_hidden(uuid, boolean) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.request_payout(numeric, jsonb) TO authenticated, service_role;
GRANT EXECUTE ON FUNCTION public.get_campaign_payout_summary(uuid) TO authenticated, service_role;
GRANT EXECUTE ON FUNCTION public.search_my_contacts(text) TO authenticated, service_role;
GRANT EXECUTE ON FUNCTION public.lookup_contact_by_phone(text) TO authenticated, service_role;
GRANT EXECUTE ON FUNCTION public.set_donation_message_hidden(uuid, boolean) TO authenticated, service_role;

CREATE OR REPLACE FUNCTION public.get_campaign_payout_summary(_campaign_id uuid)
 RETURNS TABLE(total_gross numeric, total_net numeric, total_paid_out numeric, available_payout numeric, donor_count bigint)
 LANGUAGE plpgsql STABLE SECURITY DEFINER SET search_path TO 'public'
AS $$
BEGIN
  IF auth.role() <> 'service_role' AND NOT EXISTS (
    SELECT 1 FROM public.memorial_campaigns c
    WHERE c.id = _campaign_id
      AND (c.organizer_user_id = auth.uid() OR public.has_role(auth.uid(), 'admin'))
  ) THEN
    RAISE EXCEPTION 'Not allowed';
  END IF;
  RETURN QUERY
  WITH d AS (
    SELECT COALESCE(SUM(gross_amount),0) AS gross, COALESCE(SUM(net_payout_amount),0) AS net, COUNT(*) AS donors
    FROM public.memorial_donations WHERE campaign_id = _campaign_id AND payment_status = 'succeeded'),
  p AS (
    SELECT COALESCE(SUM(amount),0) AS paid FROM public.memorial_campaign_payouts
    WHERE campaign_id = _campaign_id AND status = 'completed')
  SELECT d.gross, d.net, p.paid, GREATEST(d.net - p.paid, 0), d.donors FROM d, p;
END $$;
REVOKE EXECUTE ON FUNCTION public.get_campaign_payout_summary(uuid) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.get_campaign_payout_summary(uuid) TO authenticated, service_role;

-- 2. Candle writes: only server-side (Edge Functions with service role)
REVOKE EXECUTE ON FUNCTION public.apply_candle_contribution(uuid, text, integer, numeric, text, boolean, text, uuid, text) FROM PUBLIC, anon, authenticated;
REVOKE EXECUTE ON FUNCTION public.light_user_candle(uuid, uuid, text, integer, numeric, text, boolean, text, text) FROM PUBLIC, anon, authenticated;
REVOKE EXECUTE ON FUNCTION public.claim_guest_candle_rate_limit(uuid, text, text, date) FROM PUBLIC, anon, authenticated;
REVOKE EXECUTE ON FUNCTION public.expire_stale_candles() FROM PUBLIC, anon, authenticated;
GRANT EXECUTE ON FUNCTION public.apply_candle_contribution(uuid, text, integer, numeric, text, boolean, text, uuid, text) TO service_role;
GRANT EXECUTE ON FUNCTION public.light_user_candle(uuid, uuid, text, integer, numeric, text, boolean, text, text) TO service_role;
GRANT EXECUTE ON FUNCTION public.claim_guest_candle_rate_limit(uuid, text, text, date) TO service_role;
GRANT EXECUTE ON FUNCTION public.expire_stale_candles() TO service_role;

-- 3. Internal trigger functions: no direct calls
REVOKE EXECUTE ON FUNCTION public.handle_new_user() FROM PUBLIC, anon, authenticated;
REVOKE EXECUTE ON FUNCTION public.guard_memorial_fundraiser() FROM PUBLIC, anon, authenticated;
REVOKE EXECUTE ON FUNCTION public.notify_admins_on_creator_application() FROM PUBLIC, anon, authenticated;
REVOKE EXECUTE ON FUNCTION public.notify_on_remembrance_response() FROM PUBLIC, anon, authenticated;
REVOKE EXECUTE ON FUNCTION public.update_comments_count() FROM PUBLIC, anon, authenticated;
REVOKE EXECUTE ON FUNCTION public.update_likes_count() FROM PUBLIC, anon, authenticated;
REVOKE EXECUTE ON FUNCTION public.rls_auto_enable() FROM PUBLIC, anon, authenticated;