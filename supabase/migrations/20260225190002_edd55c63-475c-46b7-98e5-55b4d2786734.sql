-- Create a server-side function to validate and create payout requests
CREATE OR REPLACE FUNCTION public.request_payout(
  p_amount NUMERIC,
  p_payout_method JSONB
) RETURNS UUID
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_balance NUMERIC;
  v_payout_id UUID;
BEGIN
  -- Verify caller is authenticated
  IF auth.uid() IS NULL THEN
    RAISE EXCEPTION 'Not authenticated';
  END IF;

  -- Get current balance with row lock
  SELECT earnings_balance INTO v_balance
  FROM profiles
  WHERE id = auth.uid()
  FOR UPDATE;

  IF v_balance IS NULL THEN
    RAISE EXCEPTION 'Profile not found';
  END IF;

  -- Validate minimum
  IF p_amount < 10 THEN
    RAISE EXCEPTION 'Minimum withdrawal is €10';
  END IF;

  -- Validate balance
  IF p_amount > v_balance THEN
    RAISE EXCEPTION 'Insufficient balance';
  END IF;

  -- Create payout request
  INSERT INTO creator_payouts (creator_id, amount, status, payout_method)
  VALUES (auth.uid(), p_amount, 'pending', p_payout_method)
  RETURNING id INTO v_payout_id;

  -- Deduct balance immediately to prevent double-spend
  UPDATE profiles
  SET earnings_balance = earnings_balance - p_amount
  WHERE id = auth.uid();

  RETURN v_payout_id;
END;
$$;