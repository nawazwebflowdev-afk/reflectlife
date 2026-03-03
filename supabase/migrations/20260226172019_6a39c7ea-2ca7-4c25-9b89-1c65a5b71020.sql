
-- Create a trigger function to notify admins when a creator application is submitted
CREATE OR REPLACE FUNCTION public.notify_admins_on_creator_application()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  admin_record RECORD;
BEGIN
  -- Insert a notification for each admin user
  FOR admin_record IN
    SELECT user_id FROM public.user_roles WHERE role = 'admin'
  LOOP
    INSERT INTO public.notifications (user_id, actor_id, type)
    VALUES (admin_record.user_id, NEW.user_id, 'creator_application');
  END LOOP;
  
  RETURN NEW;
END;
$$;

-- Create the trigger on template_creators table
CREATE TRIGGER on_creator_application_submitted
AFTER INSERT ON public.template_creators
FOR EACH ROW
EXECUTE FUNCTION public.notify_admins_on_creator_application();
