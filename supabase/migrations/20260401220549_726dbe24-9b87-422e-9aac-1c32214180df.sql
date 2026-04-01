
-- Fix the mismatched purchase record for buyer 1c8c33c3-0b56-4d43-bc73-d6e9c84bf771
-- The Stripe receipt shows "Caspar David Friedrich" (72fd57b3) but the DB saved "Greece - El Greco" (c73be385)

UPDATE public.template_purchases
SET template_id = '72fd57b3-1f43-4a4d-9d49-338a30b034c7'
WHERE id = '476fc655-8524-4c96-b063-4e577170a027'
  AND buyer_id = '1c8c33c3-0b56-4d43-bc73-d6e9c84bf771';

-- Also fix the active profile template to the correct one
UPDATE public.profiles
SET template_id = '72fd57b3-1f43-4a4d-9d49-338a30b034c7'
WHERE id = '1c8c33c3-0b56-4d43-bc73-d6e9c84bf771'
  AND template_id = 'c73be385-c22c-49e5-aea8-3cb30cf2fa5b';
