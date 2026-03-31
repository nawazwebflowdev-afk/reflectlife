
ALTER TABLE public.site_templates
  ADD COLUMN IF NOT EXISTS color_palette jsonb DEFAULT '{}',
  ADD COLUMN IF NOT EXISTS font_family text DEFAULT NULL,
  ADD COLUMN IF NOT EXISTS font_heading text DEFAULT NULL,
  ADD COLUMN IF NOT EXISTS layout_style text DEFAULT 'classic';
