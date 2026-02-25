
-- 1. Fix update_creator_balance: add authorization check
CREATE OR REPLACE FUNCTION public.update_creator_balance(creator_id uuid, amount numeric)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = 'public'
AS $$
BEGIN
  -- Only allow service_role (webhooks) or admins
  IF current_setting('request.jwt.claim.role', true) != 'service_role'
     AND NOT EXISTS (
       SELECT 1 FROM public.user_roles
       WHERE user_id = auth.uid() AND role = 'admin'
     ) THEN
    RAISE EXCEPTION 'Unauthorized: only admins or system can update creator balances';
  END IF;

  UPDATE profiles
  SET earnings_balance = coalesce(earnings_balance, 0) + amount
  WHERE id = creator_id;
END;
$$;

-- 2. Fix template_creators: prevent users from self-approving and add admin DELETE
-- Drop the existing user update policy that allows self-approval
DROP POLICY IF EXISTS "Users can update their own creator profile" ON public.template_creators;

-- Users can update their own profile info but NOT the approved field
CREATE POLICY "Users can update own creator info"
ON public.template_creators
FOR UPDATE
USING (auth.uid() = user_id)
WITH CHECK (auth.uid() = user_id AND approved = false);

-- Admins already have update via existing policy, add DELETE for admins
DROP POLICY IF EXISTS "Admins can delete applications" ON public.template_creators;
CREATE POLICY "Admins can delete applications"
ON public.template_creators
FOR DELETE
USING (public.has_role(auth.uid(), 'admin'::app_role));

-- 3. Fix memorial_candles spam: add unique constraints
CREATE UNIQUE INDEX IF NOT EXISTS unique_candle_per_user
ON public.memorial_candles (memorial_id, user_id)
WHERE user_id IS NOT NULL;

CREATE UNIQUE INDEX IF NOT EXISTS unique_candle_per_session
ON public.memorial_candles (memorial_id, session_id)
WHERE session_id IS NOT NULL;
