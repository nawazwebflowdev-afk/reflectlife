-- Create support_messages table for Help Centre contact form
CREATE TABLE public.support_messages (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  name TEXT NOT NULL,
  email TEXT NOT NULL,
  country TEXT NOT NULL,
  message TEXT NOT NULL,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Enable Row Level Security
ALTER TABLE public.support_messages ENABLE ROW LEVEL SECURITY;

-- Create policy to allow anyone to insert support messages
CREATE POLICY "Anyone can submit support messages"
ON public.support_messages
FOR INSERT
WITH CHECK (true);

-- Create policy to allow viewing own messages (optional, for future use)
CREATE POLICY "Users can view their own messages"
ON public.support_messages
FOR SELECT
USING (email = (SELECT email FROM auth.users WHERE id = auth.uid()));

-- Add index on email for better query performance
CREATE INDEX idx_support_messages_email ON public.support_messages(email);

-- Add index on created_at for sorting
CREATE INDEX idx_support_messages_created_at ON public.support_messages(created_at DESC);