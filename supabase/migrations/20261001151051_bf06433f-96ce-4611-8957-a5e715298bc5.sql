CREATE OR REPLACE FUNCTION public.claim_guest_candle_rate_limit(_memorial_id uuid, _device_hash text, _ip_hash text, _rate_date date)
RETURNS boolean
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_device_count integer;
  v_ip_count integer;
BEGIN
  PERFORM pg_advisory_xact_lock(hashtextextended(_memorial_id::text || ':' || _rate_date::text || ':' || _device_hash, 0));
  PERFORM pg_advisory_xact_lock(hashtextextended(_memorial_id::text || ':' || _rate_date::text || ':' || _ip_hash, 0));

  SELECT count(*) INTO v_device_count
  FROM public.guest_candle_rate_limits
  WHERE memorial_id = _memorial_id AND device_hash = _device_hash AND rate_date = _rate_date;

  SELECT count(*) INTO v_ip_count
  FROM public.guest_candle_rate_limits
  WHERE memorial_id = _memorial_id AND ip_hash = _ip_hash AND rate_date = _rate_date;

  IF v_device_count >= 3 OR v_ip_count >= 3 THEN
    RETURN false;
  END IF;

  INSERT INTO public.guest_candle_rate_limits (memorial_id, device_hash, ip_hash, rate_date)
  VALUES (_memorial_id, _device_hash, _ip_hash, _rate_date);
  RETURN true;
END;
$$;
REVOKE ALL ON FUNCTION public.claim_guest_candle_rate_limit(uuid, text, text, date) FROM PUBLIC, anon, authenticated;
GRANT EXECUTE ON FUNCTION public.claim_guest_candle_rate_limit(uuid, text, text, date) TO service_role;

CREATE EXTENSION IF NOT EXISTS pg_cron WITH SCHEMA extensions;
CREATE EXTENSION IF NOT EXISTS pg_net WITH SCHEMA extensions;
SELECT cron.unschedule(jobid) FROM cron.job WHERE jobname = 'send-memorial-date-reminders-daily';
SELECT cron.schedule(
  'send-memorial-date-reminders-daily',
  '15 8 * * *',
  $$SELECT net.http_post(
    url := 'https://osmyfzkcydvtwgnbjplx.supabase.co/functions/v1/send-memorial-date-reminders',
    headers := jsonb_build_object('Content-Type','application/json','Authorization','Bearer eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Im9zbXlmemtjeWR2dHdnbmJqcGx4Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3NzIwMzk1MTYsImV4cCI6MjA4NzYxNTUxNn0.BMC8xuq-LmxNtkzEiSaADM58MutcbXNBU3WibIwWmLw'),
    body := '{}'::jsonb
  );$$
);