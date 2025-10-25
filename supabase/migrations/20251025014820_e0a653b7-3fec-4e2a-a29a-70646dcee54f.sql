-- Create site_templates table
CREATE TABLE public.site_templates (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  country TEXT NOT NULL,
  name TEXT NOT NULL,
  preview_url TEXT,
  price NUMERIC NOT NULL DEFAULT 0,
  is_free BOOLEAN NOT NULL DEFAULT false,
  description TEXT,
  creator_id UUID REFERENCES auth.users(id) ON DELETE SET NULL,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT now()
);

-- Enable RLS on site_templates
ALTER TABLE public.site_templates ENABLE ROW LEVEL SECURITY;

-- Everyone can view templates
CREATE POLICY "Anyone can view templates"
ON public.site_templates
FOR SELECT
USING (true);

-- Creators can insert their own templates
CREATE POLICY "Creators can insert their own templates"
ON public.site_templates
FOR INSERT
WITH CHECK (auth.uid() = creator_id);

-- Creators can update their own templates
CREATE POLICY "Creators can update their own templates"
ON public.site_templates
FOR UPDATE
USING (auth.uid() = creator_id);

-- Creators can delete their own templates
CREATE POLICY "Creators can delete their own templates"
ON public.site_templates
FOR DELETE
USING (auth.uid() = creator_id);

-- Create template_creators table
CREATE TABLE public.template_creators (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL UNIQUE,
  display_name TEXT NOT NULL,
  country TEXT NOT NULL,
  portfolio TEXT,
  approved BOOLEAN NOT NULL DEFAULT false,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT now()
);

-- Enable RLS on template_creators
ALTER TABLE public.template_creators ENABLE ROW LEVEL SECURITY;

-- Anyone can view approved creators
CREATE POLICY "Anyone can view approved creators"
ON public.template_creators
FOR SELECT
USING (approved = true);

-- Users can view their own creator profile
CREATE POLICY "Users can view their own creator profile"
ON public.template_creators
FOR SELECT
USING (auth.uid() = user_id);

-- Users can insert their own creator profile
CREATE POLICY "Users can insert their own creator profile"
ON public.template_creators
FOR INSERT
WITH CHECK (auth.uid() = user_id);

-- Users can update their own creator profile
CREATE POLICY "Users can update their own creator profile"
ON public.template_creators
FOR UPDATE
USING (auth.uid() = user_id);

-- Add template_id to profiles table
ALTER TABLE public.profiles
ADD COLUMN template_id UUID REFERENCES public.site_templates(id) ON DELETE SET NULL;

-- Seed site_templates with 10 templates (4 free, 6 paid)
INSERT INTO public.site_templates (country, name, preview_url, price, is_free, description) VALUES
('United States', 'American Heritage', 'https://images.unsplash.com/photo-1485963631004-f2f00b1d6606?w=400', 0, true, 'Classic American memorial style with patriotic accents'),
('United Kingdom', 'British Elegance', 'https://images.unsplash.com/photo-1513635269975-59663e0ac1ad?w=400', 0, true, 'Elegant British design with traditional elements'),
('France', 'French Grace', 'https://images.unsplash.com/photo-1502602898657-3e91760cbb34?w=400', 0, true, 'Graceful French-inspired memorial template'),
('Japan', 'Japanese Serenity', 'https://images.unsplash.com/photo-1528164344705-47542687000d?w=400', 0, true, 'Peaceful Japanese minimalist design'),
('Italy', 'Italian Renaissance', 'https://images.unsplash.com/photo-1523906834658-6e24ef2386f9?w=400', 29.99, false, 'Luxurious Italian-inspired classical design'),
('Spain', 'Spanish Sunset', 'https://images.unsplash.com/photo-1543785734-4b6e564642f8?w=400', 24.99, false, 'Warm Spanish colors and Mediterranean feel'),
('Germany', 'German Precision', 'https://images.unsplash.com/photo-1467269204594-9661b134dd2b?w=400', 34.99, false, 'Clean, structured German-inspired layout'),
('India', 'Indian Marigold', 'https://images.unsplash.com/photo-1524492412937-b28074a5d7da?w=400', 19.99, false, 'Vibrant colors inspired by Indian celebrations'),
('Brazil', 'Brazilian Carnival', 'https://images.unsplash.com/photo-1483729558449-99ef09a8c325?w=400', 27.99, false, 'Colorful and joyful Brazilian-themed design'),
('Australia', 'Aussie Outback', 'https://images.unsplash.com/photo-1523482580672-f109ba8cb9be?w=400', 22.99, false, 'Earth tones inspired by Australian landscapes');