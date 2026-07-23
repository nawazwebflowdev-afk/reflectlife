
-- 1. Reshape memorial_candles
DROP TABLE IF EXISTS public.memorial_candles CASCADE;

CREATE TABLE public.memorial_candles (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  memorial_id UUID NOT NULL UNIQUE REFERENCES public.memorials(id) ON DELETE CASCADE,
  status TEXT NOT NULL DEFAULT 'inactive' CHECK (status IN ('inactive','active','expired')),
  started_at TIMESTAMPTZ,
  expires_at TIMESTAMPTZ,
  current_plan TEXT CHECK (current_plan IN ('free','monthly','yearly')),
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

GRANT SELECT ON public.memorial_candles TO anon;
GRANT SELECT ON public.memorial_candles TO authenticated;
GRANT ALL ON public.memorial_candles TO service_role;

ALTER TABLE public.memorial_candles ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Anyone can view memorial candles"
  ON public.memorial_candles FOR SELECT
  TO anon, authenticated
  USING (true);

CREATE TRIGGER update_memorial_candles_updated_at
  BEFORE UPDATE ON public.memorial_candles
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

-- 2. Contributions history
CREATE TABLE public.candle_contributions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  memorial_candle_id UUID NOT NULL REFERENCES public.memorial_candles(id) ON DELETE CASCADE,
  memorial_id UUID NOT NULL REFERENCES public.memorials(id) ON DELETE CASCADE,
  user_id UUID REFERENCES auth.users(id) ON DELETE SET NULL,
  contributor_name TEXT,
  anonymous BOOLEAN NOT NULL DEFAULT false,
  plan TEXT NOT NULL CHECK (plan IN ('free','monthly','yearly')),
  amount NUMERIC(10,2) NOT NULL DEFAULT 0,
  message TEXT,
  stripe_session_id TEXT UNIQUE,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  CONSTRAINT candle_contributions_message_len CHECK (message IS NULL OR char_length(message) <= 100)
);

CREATE INDEX candle_contributions_memorial_idx ON public.candle_contributions (memorial_id, created_at DESC);
CREATE INDEX candle_contributions_candle_idx ON public.candle_contributions (memorial_candle_id, created_at DESC);

GRANT SELECT ON public.candle_contributions TO anon;
GRANT SELECT ON public.candle_contributions TO authenticated;
GRANT ALL ON public.candle_contributions TO service_role;

ALTER TABLE public.candle_contributions ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Anyone can view candle contributions"
  ON public.candle_contributions FOR SELECT
  TO anon, authenticated
  USING (true);

-- 3. Atomic lighting / extension helper
CREATE OR REPLACE FUNCTION public.apply_candle_contribution(
  _memorial_id UUID,
  _plan TEXT,
  _duration_seconds INTEGER,
  _amount NUMERIC,
  _contributor_name TEXT,
  _anonymous BOOLEAN,
  _message TEXT,
  _user_id UUID,
  _stripe_session_id TEXT
) RETURNS public.memorial_candles
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_candle public.memorial_candles;
  v_new_expiry TIMESTAMPTZ;
  v_now TIMESTAMPTZ := now();
BEGIN
  IF _plan NOT IN ('free','monthly','yearly') THEN
    RAISE EXCEPTION 'Invalid plan';
  END IF;

  IF _stripe_session_id IS NOT NULL THEN
    IF EXISTS (SELECT 1 FROM public.candle_contributions WHERE stripe_session_id = _stripe_session_id) THEN
      SELECT c.* INTO v_candle
      FROM public.memorial_candles c
      WHERE c.memorial_id = _memorial_id;
      RETURN v_candle;
    END IF;
  END IF;

  INSERT INTO public.memorial_candles (memorial_id, status)
  VALUES (_memorial_id, 'inactive')
  ON CONFLICT (memorial_id) DO NOTHING;

  SELECT * INTO v_candle
  FROM public.memorial_candles
  WHERE memorial_id = _memorial_id
  FOR UPDATE;

  IF v_candle.status = 'active' AND v_candle.expires_at IS NOT NULL AND v_candle.expires_at > v_now THEN
    v_new_expiry := v_candle.expires_at + make_interval(secs => _duration_seconds);
  ELSE
    v_new_expiry := v_now + make_interval(secs => _duration_seconds);
    v_candle.started_at := v_now;
  END IF;

  UPDATE public.memorial_candles
  SET status = 'active',
      started_at = COALESCE(v_candle.started_at, v_now),
      expires_at = v_new_expiry,
      current_plan = _plan,
      updated_at = v_now
  WHERE id = v_candle.id
  RETURNING * INTO v_candle;

  INSERT INTO public.candle_contributions
    (memorial_candle_id, memorial_id, user_id, contributor_name, anonymous, plan, amount, message, stripe_session_id)
  VALUES
    (v_candle.id, _memorial_id, _user_id,
     NULLIF(trim(coalesce(_contributor_name,'')), ''),
     COALESCE(_anonymous, false),
     _plan, COALESCE(_amount, 0),
     NULLIF(trim(coalesce(_message,'')), ''),
     _stripe_session_id);

  RETURN v_candle;
END;
$$;

REVOKE ALL ON FUNCTION public.apply_candle_contribution(UUID,TEXT,INTEGER,NUMERIC,TEXT,BOOLEAN,TEXT,UUID,TEXT) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.apply_candle_contribution(UUID,TEXT,INTEGER,NUMERIC,TEXT,BOOLEAN,TEXT,UUID,TEXT) TO service_role;

-- 4. Expire stale candles helper (callable by clients)
CREATE OR REPLACE FUNCTION public.expire_stale_candles()
RETURNS void
LANGUAGE sql
SECURITY DEFINER
SET search_path = public
AS $$
  UPDATE public.memorial_candles
  SET status = 'expired', updated_at = now()
  WHERE status = 'active' AND expires_at IS NOT NULL AND expires_at <= now();
$$;

GRANT EXECUTE ON FUNCTION public.expire_stale_candles() TO anon, authenticated, service_role;

-- 5. Realtime
ALTER PUBLICATION supabase_realtime ADD TABLE public.memorial_candles;
ALTER PUBLICATION supabase_realtime ADD TABLE public.candle_contributions;
ALTER TABLE public.memorial_candles REPLICA IDENTITY FULL;
ALTER TABLE public.candle_contributions REPLICA IDENTITY FULL;
