-- Add per-page template columns to profiles
ALTER TABLE public.profiles
ADD COLUMN tree_template_id uuid REFERENCES public.site_templates(id) DEFAULT NULL,
ADD COLUMN timeline_template_id uuid REFERENCES public.site_templates(id) DEFAULT NULL;