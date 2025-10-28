-- Add description field to template_creators table
ALTER TABLE public.template_creators
ADD COLUMN description text;

-- Update RLS policies to allow admins to view all applications
CREATE POLICY "Admins can view all creator applications"
ON public.template_creators
FOR SELECT
USING (has_role(auth.uid(), 'admin'));

-- Allow admins to update creator applications (for approval)
CREATE POLICY "Admins can update creator applications"
ON public.template_creators
FOR UPDATE
USING (has_role(auth.uid(), 'admin'));