-- Fix overly permissive notification insert policy
-- Drop the CHECK(true) policy that allows anyone to insert notifications for any user
DROP POLICY IF EXISTS "System can insert notifications" ON public.notifications;

-- The existing "Users can create own notifications" policy (WITH CHECK auth.uid() = user_id) 
-- already exists and correctly restricts user-initiated inserts.
-- SECURITY DEFINER trigger functions (notify_admins_on_creator_application, update_comments_count, update_likes_count)
-- bypass RLS, so system-generated notifications still work.