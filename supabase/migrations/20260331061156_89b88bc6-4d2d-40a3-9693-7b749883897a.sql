
-- Seed diverse theme data for existing templates based on their artistic style
UPDATE public.site_templates SET
  color_palette = '{"primary":"220 70% 50%","secondary":"200 60% 65%","accent":"180 50% 45%","background":"210 30% 97%","foreground":"220 25% 20%"}',
  font_heading = 'Playfair Display',
  font_family = 'Lora',
  layout_style = 'classic'
WHERE name ILIKE '%Monet%';

UPDATE public.site_templates SET
  color_palette = '{"primary":"45 90% 50%","secondary":"30 80% 55%","accent":"200 60% 45%","background":"45 30% 96%","foreground":"30 30% 18%"}',
  font_heading = 'Cormorant Garamond',
  font_family = 'EB Garamond',
  layout_style = 'elegant'
WHERE name ILIKE '%van Gogh%';

UPDATE public.site_templates SET
  color_palette = '{"primary":"40 70% 55%","secondary":"15 60% 50%","accent":"170 40% 40%","background":"40 25% 95%","foreground":"20 20% 22%"}',
  font_heading = 'Cinzel',
  font_family = 'Crimson Text',
  layout_style = 'ornate'
WHERE name ILIKE '%Klimt%';

UPDATE public.site_templates SET
  color_palette = '{"primary":"315 18% 32%","secondary":"43 45% 58%","accent":"105 10% 45%","background":"42 35% 96%","foreground":"280 20% 25%"}',
  font_heading = 'Merriweather',
  font_family = 'Source Serif Pro',
  layout_style = 'classic'
WHERE color_palette = '{}' OR color_palette IS NULL;
