-- Reconcile missing purchase for Greece - El Greco (Stripe payment pi_3TFFpqH4lK5aBXs208z1DtOI)
INSERT INTO public.template_purchases (buyer_id, template_id, amount, payment_status, stripe_session_id)
VALUES ('1c8c33c3-0b56-4d43-bc73-d6e9c84bf771', 'c73be385-c22c-49e5-aea8-3cb30cf2fa5b', 9.99, 'success', 'pi_3TFFpqH4lK5aBXs208z1DtOI')
ON CONFLICT DO NOTHING;

UPDATE public.profiles
SET template_id = 'c73be385-c22c-49e5-aea8-3cb30cf2fa5b'
WHERE id = '1c8c33c3-0b56-4d43-bc73-d6e9c84bf771';