-- Drop the unused update_creator_balance function that has authorization issues
DROP FUNCTION IF EXISTS public.update_creator_balance(uuid, numeric);
