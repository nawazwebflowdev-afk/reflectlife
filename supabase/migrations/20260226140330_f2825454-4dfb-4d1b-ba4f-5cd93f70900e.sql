
-- Create trigger function to update comments_count on memorial_posts
CREATE OR REPLACE FUNCTION public.update_comments_count()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = 'public'
AS $$
BEGIN
  IF TG_OP = 'INSERT' THEN
    UPDATE memorial_posts SET comments_count = COALESCE(comments_count, 0) + 1 WHERE id = NEW.post_id;
    RETURN NEW;
  ELSIF TG_OP = 'DELETE' THEN
    UPDATE memorial_posts SET comments_count = GREATEST(COALESCE(comments_count, 0) - 1, 0) WHERE id = OLD.post_id;
    RETURN OLD;
  END IF;
  RETURN NULL;
END;
$$;

-- Create trigger function to update likes_count on memorial_posts
CREATE OR REPLACE FUNCTION public.update_likes_count()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = 'public'
AS $$
BEGIN
  IF TG_OP = 'INSERT' THEN
    UPDATE memorial_posts SET likes_count = COALESCE(likes_count, 0) + 1 WHERE id = NEW.post_id;
    RETURN NEW;
  ELSIF TG_OP = 'DELETE' THEN
    UPDATE memorial_posts SET likes_count = GREATEST(COALESCE(likes_count, 0) - 1, 0) WHERE id = OLD.post_id;
    RETURN OLD;
  END IF;
  RETURN NULL;
END;
$$;

-- Attach triggers
CREATE TRIGGER update_comments_count_trigger
AFTER INSERT OR DELETE ON public.memorial_comments
FOR EACH ROW EXECUTE FUNCTION public.update_comments_count();

CREATE TRIGGER update_likes_count_trigger
AFTER INSERT OR DELETE ON public.memorial_likes
FOR EACH ROW EXECUTE FUNCTION public.update_likes_count();
