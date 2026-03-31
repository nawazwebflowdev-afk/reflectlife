
UPDATE public.site_templates SET
  color_palette = '{"primary":"200 65% 45%","secondary":"180 50% 55%","accent":"160 40% 50%","background":"200 25% 97%","foreground":"200 30% 18%"}',
  font_heading = 'Libre Baskerville', font_family = 'Nunito', layout_style = 'modern'
WHERE name ILIKE '%Friedrich%';

UPDATE public.site_templates SET
  color_palette = '{"primary":"350 60% 50%","secondary":"20 70% 60%","accent":"40 50% 50%","background":"30 20% 96%","foreground":"350 25% 20%"}',
  font_heading = 'Josefin Sans', font_family = 'Open Sans', layout_style = 'minimal'
WHERE name ILIKE '%Anker%';

UPDATE public.site_templates SET
  color_palette = '{"primary":"270 50% 45%","secondary":"290 40% 55%","accent":"320 45% 50%","background":"270 20% 97%","foreground":"270 25% 18%"}',
  font_heading = 'DM Serif Display', font_family = 'DM Sans', layout_style = 'elegant'
WHERE name ILIKE '%Idromeno%';
