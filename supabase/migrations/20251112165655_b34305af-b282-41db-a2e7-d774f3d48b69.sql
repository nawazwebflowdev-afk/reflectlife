-- Add username to profiles if not exists
ALTER TABLE public.profiles ADD COLUMN IF NOT EXISTS username text UNIQUE;

-- Add content and updated_at to memorial_posts (used as timeline_posts)
ALTER TABLE public.memorial_posts ADD COLUMN IF NOT EXISTS content text;
ALTER TABLE public.memorial_posts ADD COLUMN IF NOT EXISTS updated_at timestamptz DEFAULT now();

-- Add description and images array to memorials
ALTER TABLE public.memorials ADD COLUMN IF NOT EXISTS description text;
ALTER TABLE public.memorials ADD COLUMN IF NOT EXISTS images text[];

-- Create notifications table for comment and like alerts
CREATE TABLE IF NOT EXISTS public.notifications (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid REFERENCES public.profiles(id) ON DELETE CASCADE NOT NULL,
  actor_id uuid REFERENCES public.profiles(id) ON DELETE CASCADE NOT NULL,
  type text NOT NULL CHECK (type IN ('comment', 'like')),
  post_id uuid REFERENCES public.memorial_posts(id) ON DELETE CASCADE,
  comment_id uuid REFERENCES public.memorial_comments(id) ON DELETE CASCADE,
  read boolean DEFAULT false,
  created_at timestamptz DEFAULT now()
);

-- Enable RLS on notifications
ALTER TABLE public.notifications ENABLE ROW LEVEL SECURITY;

-- RLS policies for notifications
CREATE POLICY "Users can view their own notifications"
  ON public.notifications FOR SELECT
  USING (auth.uid() = user_id);

CREATE POLICY "System can insert notifications"
  ON public.notifications FOR INSERT
  WITH CHECK (true);

CREATE POLICY "Users can update their own notifications"
  ON public.notifications FOR UPDATE
  USING (auth.uid() = user_id);

CREATE POLICY "Users can delete their own notifications"
  ON public.notifications FOR DELETE
  USING (auth.uid() = user_id);

-- Create indexes for performance
CREATE INDEX IF NOT EXISTS idx_timeline_posts_user_id ON public.memorial_posts(user_id);
CREATE INDEX IF NOT EXISTS idx_post_comments_post_id ON public.memorial_comments(post_id);
CREATE INDEX IF NOT EXISTS idx_memorials_user_id ON public.memorials(user_id);
CREATE INDEX IF NOT EXISTS idx_notifications_user_id ON public.notifications(user_id);
CREATE INDEX IF NOT EXISTS idx_notifications_read ON public.notifications(read);

-- Create trigger to update updated_at on memorial_posts
CREATE OR REPLACE FUNCTION update_memorial_post_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER SET search_path = public;

CREATE TRIGGER update_memorial_posts_updated_at
  BEFORE UPDATE ON public.memorial_posts
  FOR EACH ROW
  EXECUTE FUNCTION update_memorial_post_updated_at();

-- Function to create notification on comment
CREATE OR REPLACE FUNCTION notify_on_comment()
RETURNS TRIGGER AS $$
BEGIN
  -- Only notify if someone else comments on your post
  IF NEW.user_id != (SELECT user_id FROM public.memorial_posts WHERE id = NEW.post_id) THEN
    INSERT INTO public.notifications (user_id, actor_id, type, post_id, comment_id)
    SELECT 
      memorial_posts.user_id,
      NEW.user_id,
      'comment',
      NEW.post_id,
      NEW.id
    FROM public.memorial_posts
    WHERE memorial_posts.id = NEW.post_id;
  END IF;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER SET search_path = public;

CREATE TRIGGER notify_on_comment_trigger
  AFTER INSERT ON public.memorial_comments
  FOR EACH ROW
  EXECUTE FUNCTION notify_on_comment();

-- Function to create notification on like
CREATE OR REPLACE FUNCTION notify_on_like()
RETURNS TRIGGER AS $$
BEGIN
  -- Only notify if someone else likes your post
  IF NEW.user_id != (SELECT user_id FROM public.memorial_posts WHERE id = NEW.post_id) THEN
    INSERT INTO public.notifications (user_id, actor_id, type, post_id)
    SELECT 
      memorial_posts.user_id,
      NEW.user_id,
      'like',
      NEW.post_id
    FROM public.memorial_posts
    WHERE memorial_posts.id = NEW.post_id;
  END IF;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER SET search_path = public;

CREATE TRIGGER notify_on_like_trigger
  AFTER INSERT ON public.memorial_likes
  FOR EACH ROW
  EXECUTE FUNCTION notify_on_like();