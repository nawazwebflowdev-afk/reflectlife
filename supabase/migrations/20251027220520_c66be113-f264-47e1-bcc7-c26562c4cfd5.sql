-- Create memorial_likes table
CREATE TABLE public.memorial_likes (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  post_id UUID NOT NULL REFERENCES public.memorial_posts(id) ON DELETE CASCADE,
  user_id UUID NOT NULL,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  UNIQUE(post_id, user_id)
);

-- Create memorial_comments table
CREATE TABLE public.memorial_comments (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  post_id UUID NOT NULL REFERENCES public.memorial_posts(id) ON DELETE CASCADE,
  user_id UUID NOT NULL,
  content TEXT NOT NULL,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Enable RLS on memorial_likes
ALTER TABLE public.memorial_likes ENABLE ROW LEVEL SECURITY;

-- RLS Policies for memorial_likes
CREATE POLICY "Anyone can view likes"
  ON public.memorial_likes
  FOR SELECT
  USING (true);

CREATE POLICY "Authenticated users can like posts"
  ON public.memorial_likes
  FOR INSERT
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can unlike their own likes"
  ON public.memorial_likes
  FOR DELETE
  USING (auth.uid() = user_id);

-- Enable RLS on memorial_comments
ALTER TABLE public.memorial_comments ENABLE ROW LEVEL SECURITY;

-- RLS Policies for memorial_comments
CREATE POLICY "Anyone can view comments"
  ON public.memorial_comments
  FOR SELECT
  USING (true);

CREATE POLICY "Authenticated users can create comments"
  ON public.memorial_comments
  FOR INSERT
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update their own comments"
  ON public.memorial_comments
  FOR UPDATE
  USING (auth.uid() = user_id);

CREATE POLICY "Users can delete their own comments"
  ON public.memorial_comments
  FOR DELETE
  USING (auth.uid() = user_id);

-- Create indexes for better performance
CREATE INDEX idx_memorial_likes_post_id ON public.memorial_likes(post_id);
CREATE INDEX idx_memorial_likes_user_id ON public.memorial_likes(user_id);
CREATE INDEX idx_memorial_comments_post_id ON public.memorial_comments(post_id);
CREATE INDEX idx_memorial_comments_created_at ON public.memorial_comments(created_at DESC);

-- Create function to update like counts
CREATE OR REPLACE FUNCTION public.update_post_likes_count()
RETURNS TRIGGER AS $$
BEGIN
  IF TG_OP = 'INSERT' THEN
    UPDATE public.memorial_posts
    SET likes_count = likes_count + 1
    WHERE id = NEW.post_id;
    RETURN NEW;
  ELSIF TG_OP = 'DELETE' THEN
    UPDATE public.memorial_posts
    SET likes_count = GREATEST(0, likes_count - 1)
    WHERE id = OLD.post_id;
    RETURN OLD;
  END IF;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER SET search_path = public;

-- Create function to update comment counts
CREATE OR REPLACE FUNCTION public.update_post_comments_count()
RETURNS TRIGGER AS $$
BEGIN
  IF TG_OP = 'INSERT' THEN
    UPDATE public.memorial_posts
    SET comments_count = comments_count + 1
    WHERE id = NEW.post_id;
    RETURN NEW;
  ELSIF TG_OP = 'DELETE' THEN
    UPDATE public.memorial_posts
    SET comments_count = GREATEST(0, comments_count - 1)
    WHERE id = OLD.post_id;
    RETURN OLD;
  END IF;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER SET search_path = public;

-- Create triggers for automatic count updates
CREATE TRIGGER update_likes_count_trigger
  AFTER INSERT OR DELETE ON public.memorial_likes
  FOR EACH ROW
  EXECUTE FUNCTION public.update_post_likes_count();

CREATE TRIGGER update_comments_count_trigger
  AFTER INSERT OR DELETE ON public.memorial_comments
  FOR EACH ROW
  EXECUTE FUNCTION public.update_post_comments_count();