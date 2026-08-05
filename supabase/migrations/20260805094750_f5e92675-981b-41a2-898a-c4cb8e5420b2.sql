ALTER TABLE public.notifications
  ADD COLUMN IF NOT EXISTS remembrance_id uuid REFERENCES public.remembrances(id) ON DELETE CASCADE;
CREATE INDEX IF NOT EXISTS idx_notifications_remembrance ON public.notifications(remembrance_id);