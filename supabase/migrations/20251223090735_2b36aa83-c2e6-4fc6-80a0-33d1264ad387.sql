-- Create table for tracking candle lights
CREATE TABLE public.memorial_candles (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  memorial_id UUID NOT NULL REFERENCES public.memorials(id) ON DELETE CASCADE,
  user_id UUID REFERENCES auth.users(id) ON DELETE SET NULL,
  session_id TEXT, -- For anonymous users
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Enable RLS
ALTER TABLE public.memorial_candles ENABLE ROW LEVEL SECURITY;

-- Anyone can view candle counts (for display)
CREATE POLICY "Anyone can view candles"
ON public.memorial_candles
FOR SELECT
USING (true);

-- Anyone can light a candle (authenticated or anonymous via session)
CREATE POLICY "Anyone can light a candle"
ON public.memorial_candles
FOR INSERT
WITH CHECK (true);

-- Create index for fast counting
CREATE INDEX idx_memorial_candles_memorial_id ON public.memorial_candles(memorial_id);

-- Add to realtime
ALTER TABLE public.memorial_candles REPLICA IDENTITY FULL;