ALTER TABLE public.remembrances
  ADD COLUMN IF NOT EXISTS title TEXT,
  ADD COLUMN IF NOT EXISTS description TEXT,
  ADD COLUMN IF NOT EXISTS location TEXT,
  ADD COLUMN IF NOT EXISTS category TEXT,
  ADD COLUMN IF NOT EXISTS image_url TEXT;

ALTER TABLE public.remembrances DROP CONSTRAINT IF EXISTS remembrances_event_type_chk;
ALTER TABLE public.remembrances ADD CONSTRAINT remembrances_event_type_chk
  CHECK (event_type = ANY (ARRAY[
    'birthday','date_of_death','anniversary','memorial_service','funeral','special_memory','custom',
    'reminder','task','appointment','goal','milestone','event','medication'
  ]));

ALTER TABLE public.remembrances DROP CONSTRAINT IF EXISTS remembrances_recurrence_chk;
ALTER TABLE public.remembrances ADD CONSTRAINT remembrances_recurrence_chk
  CHECK (recurrence = ANY (ARRAY['once','hourly','daily','weekly','monthly','yearly','custom']));

ALTER TABLE public.remembrances DROP CONSTRAINT IF EXISTS remembrances_unit_chk;
ALTER TABLE public.remembrances ADD CONSTRAINT remembrances_unit_chk
  CHECK (recurrence_unit = ANY (ARRAY['hour','day','week','month','year']));