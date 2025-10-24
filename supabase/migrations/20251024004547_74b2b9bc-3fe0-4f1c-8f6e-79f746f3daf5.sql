-- Create enum for content types
CREATE TYPE public.content_type AS ENUM ('photo', 'video', 'note');

-- Create memorial_timelines table
CREATE TABLE public.memorial_timelines (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  title TEXT NOT NULL,
  description TEXT,
  background_url TEXT,
  is_public BOOLEAN DEFAULT false,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT now()
);

-- Create memorial_entries table
CREATE TABLE public.memorial_entries (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  timeline_id UUID NOT NULL REFERENCES public.memorial_timelines(id) ON DELETE CASCADE,
  content_type public.content_type NOT NULL,
  content_url TEXT,
  caption TEXT,
  event_date DATE,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT now()
);

-- Enable RLS
ALTER TABLE public.memorial_timelines ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.memorial_entries ENABLE ROW LEVEL SECURITY;

-- RLS Policies for memorial_timelines
CREATE POLICY "Users can create their own timelines"
  ON public.memorial_timelines FOR INSERT
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update their own timelines"
  ON public.memorial_timelines FOR UPDATE
  USING (auth.uid() = user_id);

CREATE POLICY "Users can delete their own timelines"
  ON public.memorial_timelines FOR DELETE
  USING (auth.uid() = user_id);

CREATE POLICY "Users can view their own timelines"
  ON public.memorial_timelines FOR SELECT
  USING (auth.uid() = user_id);

CREATE POLICY "Anyone can view public timelines"
  ON public.memorial_timelines FOR SELECT
  USING (is_public = true);

-- RLS Policies for memorial_entries
CREATE POLICY "Users can create entries for their timelines"
  ON public.memorial_entries FOR INSERT
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM public.memorial_timelines
      WHERE id = memorial_entries.timeline_id
      AND user_id = auth.uid()
    )
  );

CREATE POLICY "Users can update entries in their timelines"
  ON public.memorial_entries FOR UPDATE
  USING (
    EXISTS (
      SELECT 1 FROM public.memorial_timelines
      WHERE id = memorial_entries.timeline_id
      AND user_id = auth.uid()
    )
  );

CREATE POLICY "Users can delete entries from their timelines"
  ON public.memorial_entries FOR DELETE
  USING (
    EXISTS (
      SELECT 1 FROM public.memorial_timelines
      WHERE id = memorial_entries.timeline_id
      AND user_id = auth.uid()
    )
  );

CREATE POLICY "Users can view entries in their timelines"
  ON public.memorial_entries FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM public.memorial_timelines
      WHERE id = memorial_entries.timeline_id
      AND user_id = auth.uid()
    )
  );

CREATE POLICY "Anyone can view entries in public timelines"
  ON public.memorial_entries FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM public.memorial_timelines
      WHERE id = memorial_entries.timeline_id
      AND is_public = true
    )
  );

-- Create storage bucket for memorial uploads
INSERT INTO storage.buckets (id, name, public)
VALUES ('memorial_uploads', 'memorial_uploads', true);

-- Storage policies for memorial_uploads
CREATE POLICY "Users can upload their own memorial files"
  ON storage.objects FOR INSERT
  WITH CHECK (
    bucket_id = 'memorial_uploads' 
    AND auth.uid()::text = (storage.foldername(name))[1]
  );

CREATE POLICY "Anyone can view memorial files"
  ON storage.objects FOR SELECT
  USING (bucket_id = 'memorial_uploads');

CREATE POLICY "Users can update their own memorial files"
  ON storage.objects FOR UPDATE
  USING (
    bucket_id = 'memorial_uploads' 
    AND auth.uid()::text = (storage.foldername(name))[1]
  );

CREATE POLICY "Users can delete their own memorial files"
  ON storage.objects FOR DELETE
  USING (
    bucket_id = 'memorial_uploads' 
    AND auth.uid()::text = (storage.foldername(name))[1]
  );

-- Add trigger for updated_at on memorial_timelines
CREATE TRIGGER update_memorial_timelines_updated_at
  BEFORE UPDATE ON public.memorial_timelines
  FOR EACH ROW
  EXECUTE FUNCTION public.update_updated_at_column();