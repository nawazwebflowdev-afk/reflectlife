-- Add parent_connection_id to connections table for hierarchical relationships
ALTER TABLE public.connections 
ADD COLUMN parent_connection_id uuid REFERENCES public.connections(id) ON DELETE CASCADE;

-- Create index for better query performance
CREATE INDEX idx_connections_parent_id ON public.connections(parent_connection_id);

-- Create memorial_invitations table
CREATE TABLE public.memorial_invitations (
  id uuid NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  inviter_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  invitee_email text NOT NULL,
  memorial_id uuid REFERENCES public.memorials(id) ON DELETE CASCADE,
  connection_id uuid REFERENCES public.connections(id) ON DELETE CASCADE,
  created_at timestamp with time zone DEFAULT now(),
  status text NOT NULL DEFAULT 'pending' CHECK (status IN ('pending', 'accepted')),
  UNIQUE(invitee_email, memorial_id)
);

-- Enable RLS on memorial_invitations
ALTER TABLE public.memorial_invitations ENABLE ROW LEVEL SECURITY;

-- RLS policies for memorial_invitations
CREATE POLICY "Users can view invitations they sent"
  ON public.memorial_invitations
  FOR SELECT
  USING (auth.uid() = inviter_id);

CREATE POLICY "Users can view invitations sent to their email"
  ON public.memorial_invitations
  FOR SELECT
  USING (invitee_email = (SELECT email FROM auth.users WHERE id = auth.uid()));

CREATE POLICY "Authenticated users can create invitations"
  ON public.memorial_invitations
  FOR INSERT
  WITH CHECK (auth.uid() = inviter_id);

CREATE POLICY "Users can update invitations sent to their email"
  ON public.memorial_invitations
  FOR UPDATE
  USING (invitee_email = (SELECT email FROM auth.users WHERE id = auth.uid()));

-- Create index for email lookups
CREATE INDEX idx_memorial_invitations_email ON public.memorial_invitations(invitee_email);
CREATE INDEX idx_memorial_invitations_status ON public.memorial_invitations(status);