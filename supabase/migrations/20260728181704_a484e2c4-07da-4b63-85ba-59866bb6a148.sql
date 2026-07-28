UPDATE public.site_templates
SET is_free = true, price = 0
WHERE name IN ('Misty Blue', 'Sage Haven', 'Rosewood Light', 'Ivory Dawn');

UPDATE public.site_templates
SET is_free = false
WHERE name NOT IN ('Misty Blue', 'Sage Haven', 'Rosewood Light', 'Ivory Dawn');