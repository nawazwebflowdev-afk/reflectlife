ALTER TABLE public.memorial_remembrances
  DROP CONSTRAINT IF EXISTS memorial_remembrances_frequency_check;

ALTER TABLE public.memorial_remembrances
  ADD CONSTRAINT memorial_remembrances_frequency_check
  CHECK (frequency = ANY (ARRAY['once'::text, 'daily'::text, 'weekly'::text, 'monthly'::text, 'yearly'::text]));

ALTER TABLE public.remembrance_phone_recipients
  ADD COLUMN IF NOT EXISTS email text;

ALTER TABLE public.remembrance_phone_recipients
  ALTER COLUMN phone DROP NOT NULL;

ALTER TABLE public.remembrance_phone_recipients
  DROP CONSTRAINT IF EXISTS remembrance_phone_recipients_contact_check;

ALTER TABLE public.remembrance_phone_recipients
  ADD CONSTRAINT remembrance_phone_recipients_contact_check
  CHECK (phone IS NOT NULL OR email IS NOT NULL);

ALTER TABLE public.remembrance_phone_recipients
  DROP CONSTRAINT IF EXISTS remembrance_phone_recipients_channel_check;

ALTER TABLE public.remembrance_phone_recipients
  ADD CONSTRAINT remembrance_phone_recipients_channel_check
  CHECK (channel = ANY (ARRAY['sms'::text, 'whatsapp'::text, 'email'::text]));

CREATE UNIQUE INDEX IF NOT EXISTS remembrance_phone_recipients_email_idx
  ON public.remembrance_phone_recipients (remembrance_id, email)
  WHERE email IS NOT NULL;