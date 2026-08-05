CREATE OR REPLACE FUNCTION public.notify_on_remembrance_response()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $$
DECLARE
  target uuid;
BEGIN
  FOR target IN
    SELECT r.creator_id FROM public.remembrances r WHERE r.id = NEW.remembrance_id
    UNION
    SELECT rr.user_id FROM public.remembrance_recipients rr
     WHERE rr.remembrance_id = NEW.remembrance_id
       AND rr.user_id IS NOT NULL
       AND rr.status = 'active'
  LOOP
    IF target IS NOT NULL AND target <> NEW.user_id THEN
      INSERT INTO public.notifications (user_id, actor_id, type, remembrance_id)
      VALUES (target, NEW.user_id, 'remembrance_response', NEW.remembrance_id);
    END IF;
  END LOOP;
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS on_remembrance_response ON public.remembrance_responses;
CREATE TRIGGER on_remembrance_response
AFTER INSERT ON public.remembrance_responses
FOR EACH ROW EXECUTE FUNCTION public.notify_on_remembrance_response();