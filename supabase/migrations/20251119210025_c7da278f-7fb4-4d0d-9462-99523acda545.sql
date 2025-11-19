-- Create memorial_tributes table
CREATE TABLE IF NOT EXISTS public.memorial_tributes (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  memorial_id uuid NOT NULL REFERENCES public.memorials(id) ON DELETE CASCADE,
  user_id uuid NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  tribute_text text NOT NULL,
  media_url text,
  created_at timestamp with time zone NOT NULL DEFAULT now()
);

-- Enable RLS
ALTER TABLE public.memorial_tributes ENABLE ROW LEVEL SECURITY;

-- Policy: Anyone can view tributes
CREATE POLICY "Anyone can view tributes"
ON public.memorial_tributes
FOR SELECT
USING (true);

-- Policy: Authenticated users can create tributes
CREATE POLICY "Authenticated users can create tributes"
ON public.memorial_tributes
FOR INSERT
WITH CHECK (auth.uid() = user_id);

-- Policy: Users can delete their own tributes
CREATE POLICY "Users can delete their own tributes"
ON public.memorial_tributes
FOR DELETE
USING (auth.uid() = user_id);

-- Create index for faster queries
CREATE INDEX idx_memorial_tributes_memorial_id ON public.memorial_tributes(memorial_id);
CREATE INDEX idx_memorial_tributes_user_id ON public.memorial_tributes(user_id);
CREATE INDEX idx_memorial_tributes_created_at ON public.memorial_tributes(created_at DESC);