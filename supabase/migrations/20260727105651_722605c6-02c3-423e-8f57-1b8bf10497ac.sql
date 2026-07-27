ALTER TABLE public.memorial_candles
  ADD COLUMN IF NOT EXISTS user_id uuid,
  ADD COLUMN IF NOT EXISTS contributor_name text,
  ADD COLUMN IF NOT EXISTS anonymous boolean NOT NULL DEFAULT false,
  ADD COLUMN IF NOT EXISTS message text,
  ADD COLUMN IF NOT EXISTS plan text,
  ADD COLUMN IF NOT EXISTS stripe_session_id text,
  ADD COLUMN IF NOT EXISTS renewal_email_sent boolean NOT NULL DEFAULT false,
  ADD COLUMN IF NOT EXISTS renewal_email_sent_at timestamptz;

UPDATE public.memorial_candles SET plan = current_plan WHERE plan IS NULL;

ALTER TABLE public.memorial_candles DROP CONSTRAINT IF EXISTS memorial_candles_memorial_id_key;

ALTER TABLE public.memorial_candles DROP CONSTRAINT IF EXISTS memorial_candles_plan_check;
ALTER TABLE public.memorial_candles ADD CONSTRAINT memorial_candles_plan_check
  CHECK (plan IS NULL OR plan = ANY (ARRAY['free'::text,'monthly'::text,'yearly'::text]));

CREATE UNIQUE INDEX IF NOT EXISTS memorial_candles_memorial_user_uidx
  ON public.memorial_candles (memorial_id, user_id) WHERE user_id IS NOT NULL;

CREATE INDEX IF NOT EXISTS memorial_candles_active_idx
  ON public.memorial_candles (memorial_id, status, expires_at DESC);

GRANT SELECT ON public.memorial_candles TO anon;
GRANT SELECT ON public.memorial_candles TO authenticated;
GRANT ALL ON public.memorial_candles TO service_role;

DROP POLICY IF EXISTS "Anyone can view memorial candles" ON public.memorial_candles;
CREATE POLICY "Anyone can view memorial candles"
  ON public.memorial_candles FOR SELECT USING (true);

CREATE OR REPLACE FUNCTION public.expire_stale_candles()
RETURNS void
LANGUAGE sql
SECURITY DEFINER
SET search_path TO 'public'
AS $$
  UPDATE public.memorial_candles
  SET status = 'expired', updated_at = now()
  WHERE status = 'active' AND expires_at IS NOT NULL AND expires_at <= now();
$$;

CREATE OR REPLACE FUNCTION public.light_user_candle(
  _memorial_id uuid,
  _user_id uuid,
  _plan text,
  _duration_seconds integer,
  _amount numeric,
  _contributor_name text,
  _anonymous boolean,
  _message text,
  _stripe_session_id text
)
RETURNS public.memorial_candles
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $$
DECLARE
  v_candle public.memorial_candles;
  v_now timestamptz := now();
  v_expiry timestamptz;
BEGIN
  IF _plan NOT IN ('free','monthly','yearly') THEN
    RAISE EXCEPTION 'Invalid plan';
  END IF;
  IF _user_id IS NULL THEN
    RAISE EXCEPTION 'Sign in required to light a candle';
  END IF;

  IF _stripe_session_id IS NOT NULL THEN
    SELECT * INTO v_candle FROM public.memorial_candles
    WHERE stripe_session_id = _stripe_session_id;
    IF FOUND THEN
      RETURN v_candle;
    END IF;
  END IF;

  SELECT * INTO v_candle FROM public.memorial_candles
  WHERE memorial_id = _memorial_id AND user_id = _user_id
  FOR UPDATE;

  IF FOUND AND v_candle.status = 'active' AND v_candle.expires_at IS NOT NULL AND v_candle.expires_at > v_now THEN
    v_expiry := v_candle.expires_at + make_interval(secs => _duration_seconds);
  ELSE
    v_expiry := v_now + make_interval(secs => _duration_seconds);
  END IF;

  IF FOUND THEN
    UPDATE public.memorial_candles
    SET status = 'active',
        started_at = CASE WHEN v_candle.status = 'active' AND v_candle.expires_at > v_now
                          THEN COALESCE(v_candle.started_at, v_now) ELSE v_now END,
        expires_at = v_expiry,
        plan = _plan,
        current_plan = _plan,
        contributor_name = COALESCE(NULLIF(trim(coalesce(_contributor_name,'')),''), v_candle.contributor_name),
        anonymous = COALESCE(_anonymous, false),
        message = COALESCE(NULLIF(trim(coalesce(_message,'')),''), v_candle.message),
        stripe_session_id = COALESCE(_stripe_session_id, v_candle.stripe_session_id),
        renewal_email_sent = false,
        renewal_email_sent_at = NULL,
        updated_at = v_now
    WHERE id = v_candle.id
    RETURNING * INTO v_candle;
  ELSE
    INSERT INTO public.memorial_candles
      (memorial_id, user_id, status, started_at, expires_at, plan, current_plan,
       contributor_name, anonymous, message, stripe_session_id)
    VALUES
      (_memorial_id, _user_id, 'active', v_now, v_expiry, _plan, _plan,
       NULLIF(trim(coalesce(_contributor_name,'')),''), COALESCE(_anonymous,false),
       NULLIF(trim(coalesce(_message,'')),''), _stripe_session_id)
    RETURNING * INTO v_candle;
  END IF;

  INSERT INTO public.candle_contributions
    (memorial_candle_id, memorial_id, user_id, contributor_name, anonymous, plan, amount, message, stripe_session_id)
  VALUES
    (v_candle.id, _memorial_id, _user_id,
     NULLIF(trim(coalesce(_contributor_name,'')),''), COALESCE(_anonymous,false),
     _plan, COALESCE(_amount,0), NULLIF(trim(coalesce(_message,'')),''), _stripe_session_id);

  RETURN v_candle;
END;
$$;