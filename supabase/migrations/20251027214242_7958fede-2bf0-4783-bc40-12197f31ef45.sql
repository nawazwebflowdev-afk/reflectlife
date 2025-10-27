-- Create memorial_posts table
CREATE TABLE public.memorial_posts (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL,
  media_url TEXT,
  caption TEXT,
  location TEXT,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT now(),
  likes_count INTEGER DEFAULT 0,
  comments_count INTEGER DEFAULT 0
);

-- Enable RLS on memorial_posts
ALTER TABLE public.memorial_posts ENABLE ROW LEVEL SECURITY;

-- Policy: Anyone can view posts
CREATE POLICY "Anyone can view posts"
ON public.memorial_posts
FOR SELECT
USING (true);

-- Policy: Authenticated users can create posts
CREATE POLICY "Authenticated users can create posts"
ON public.memorial_posts
FOR INSERT
WITH CHECK (auth.uid() = user_id);

-- Policy: Users can update their own posts
CREATE POLICY "Users can update their own posts"
ON public.memorial_posts
FOR UPDATE
USING (auth.uid() = user_id);

-- Policy: Users can delete their own posts
CREATE POLICY "Users can delete their own posts"
ON public.memorial_posts
FOR DELETE
USING (auth.uid() = user_id);

-- Create index for efficient queries
CREATE INDEX idx_memorial_posts_created_at ON public.memorial_posts(created_at DESC);
CREATE INDEX idx_memorial_posts_user_id ON public.memorial_posts(user_id);