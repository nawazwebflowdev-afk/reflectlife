-- Add is_deceased field to profiles table if it doesn't exist
ALTER TABLE public.profiles 
ADD COLUMN IF NOT EXISTS is_deceased boolean DEFAULT false;

-- Create connections table
CREATE TABLE IF NOT EXISTS public.connections (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  owner_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  person_id uuid NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  relationship_type text NOT NULL,
  connection_type text NOT NULL CHECK (connection_type IN ('family', 'friendship')),
  shared_memory_id uuid,
  created_at timestamp with time zone DEFAULT now(),
  UNIQUE(owner_id, person_id)
);

-- Enable RLS on connections table
ALTER TABLE public.connections ENABLE ROW LEVEL SECURITY;

-- RLS Policies for connections table
CREATE POLICY "Users can view their own connections"
  ON public.connections
  FOR SELECT
  USING (owner_id = auth.uid());

CREATE POLICY "Users can insert their own connections"
  ON public.connections
  FOR INSERT
  WITH CHECK (owner_id = auth.uid());

CREATE POLICY "Users can update their own connections"
  ON public.connections
  FOR UPDATE
  USING (owner_id = auth.uid());

CREATE POLICY "Users can delete their own connections"
  ON public.connections
  FOR DELETE
  USING (owner_id = auth.uid());