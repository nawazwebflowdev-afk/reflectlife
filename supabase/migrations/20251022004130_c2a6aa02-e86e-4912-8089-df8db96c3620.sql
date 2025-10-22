-- Create profiles table for user information
CREATE TABLE public.profiles (
  id UUID PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  full_name TEXT,
  avatar_url TEXT,
  bio TEXT,
  logo_url TEXT,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Create memorials table
CREATE TABLE public.memorials (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID REFERENCES public.profiles(id) ON DELETE CASCADE NOT NULL,
  name TEXT NOT NULL,
  date_of_birth DATE,
  date_of_death DATE,
  location TEXT,
  preview_image_url TEXT,
  bio TEXT,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Create memorial media table (photos, videos)
CREATE TABLE public.memorial_media (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  memorial_id UUID REFERENCES public.memorials(id) ON DELETE CASCADE NOT NULL,
  media_type TEXT NOT NULL CHECK (media_type IN ('photo', 'video')),
  media_url TEXT NOT NULL,
  caption TEXT,
  uploaded_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Create trees table for family/friendship trees
CREATE TABLE public.trees (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID REFERENCES public.profiles(id) ON DELETE CASCADE NOT NULL,
  tree_type TEXT NOT NULL CHECK (tree_type IN ('family', 'friendship')),
  name TEXT NOT NULL,
  template_id UUID,
  tree_data JSONB DEFAULT '[]'::jsonb,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Create tree templates table
CREATE TABLE public.tree_templates (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name TEXT NOT NULL,
  template_type TEXT NOT NULL,
  is_paid BOOLEAN DEFAULT FALSE,
  price DECIMAL(10,2),
  preview_image_url TEXT,
  style_data JSONB DEFAULT '{}'::jsonb,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Create activity timeline table
CREATE TABLE public.activity_timeline (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID REFERENCES public.profiles(id) ON DELETE CASCADE NOT NULL,
  activity_type TEXT NOT NULL,
  description TEXT NOT NULL,
  related_id UUID,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Enable Row Level Security
ALTER TABLE public.profiles ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.memorials ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.memorial_media ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.trees ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.tree_templates ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.activity_timeline ENABLE ROW LEVEL SECURITY;

-- Profiles policies
CREATE POLICY "Users can view their own profile"
  ON public.profiles FOR SELECT
  USING (auth.uid() = id);

CREATE POLICY "Users can update their own profile"
  ON public.profiles FOR UPDATE
  USING (auth.uid() = id);

CREATE POLICY "Users can insert their own profile"
  ON public.profiles FOR INSERT
  WITH CHECK (auth.uid() = id);

-- Memorials policies
CREATE POLICY "Users can view their own memorials"
  ON public.memorials FOR SELECT
  USING (user_id = auth.uid());

CREATE POLICY "Users can create their own memorials"
  ON public.memorials FOR INSERT
  WITH CHECK (user_id = auth.uid());

CREATE POLICY "Users can update their own memorials"
  ON public.memorials FOR UPDATE
  USING (user_id = auth.uid());

CREATE POLICY "Users can delete their own memorials"
  ON public.memorials FOR DELETE
  USING (user_id = auth.uid());

-- Memorial media policies
CREATE POLICY "Users can view media for their memorials"
  ON public.memorial_media FOR SELECT
  USING (EXISTS (
    SELECT 1 FROM public.memorials
    WHERE memorials.id = memorial_media.memorial_id
    AND memorials.user_id = auth.uid()
  ));

CREATE POLICY "Users can add media to their memorials"
  ON public.memorial_media FOR INSERT
  WITH CHECK (EXISTS (
    SELECT 1 FROM public.memorials
    WHERE memorials.id = memorial_media.memorial_id
    AND memorials.user_id = auth.uid()
  ));

CREATE POLICY "Users can delete media from their memorials"
  ON public.memorial_media FOR DELETE
  USING (EXISTS (
    SELECT 1 FROM public.memorials
    WHERE memorials.id = memorial_media.memorial_id
    AND memorials.user_id = auth.uid()
  ));

-- Trees policies
CREATE POLICY "Users can view their own trees"
  ON public.trees FOR SELECT
  USING (user_id = auth.uid());

CREATE POLICY "Users can create their own trees"
  ON public.trees FOR INSERT
  WITH CHECK (user_id = auth.uid());

CREATE POLICY "Users can update their own trees"
  ON public.trees FOR UPDATE
  USING (user_id = auth.uid());

CREATE POLICY "Users can delete their own trees"
  ON public.trees FOR DELETE
  USING (user_id = auth.uid());

-- Tree templates policies (public read access)
CREATE POLICY "Anyone can view tree templates"
  ON public.tree_templates FOR SELECT
  USING (true);

-- Activity timeline policies
CREATE POLICY "Users can view their own activity"
  ON public.activity_timeline FOR SELECT
  USING (user_id = auth.uid());

CREATE POLICY "Users can create their own activity"
  ON public.activity_timeline FOR INSERT
  WITH CHECK (user_id = auth.uid());

-- Function to update updated_at timestamp
CREATE OR REPLACE FUNCTION public.update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Triggers for updated_at
CREATE TRIGGER update_profiles_updated_at
  BEFORE UPDATE ON public.profiles
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

CREATE TRIGGER update_memorials_updated_at
  BEFORE UPDATE ON public.memorials
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

CREATE TRIGGER update_trees_updated_at
  BEFORE UPDATE ON public.trees
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

-- Trigger to create profile on user signup
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS TRIGGER AS $$
BEGIN
  INSERT INTO public.profiles (id, full_name, avatar_url)
  VALUES (
    NEW.id,
    COALESCE(NEW.raw_user_meta_data->>'full_name', ''),
    COALESCE(NEW.raw_user_meta_data->>'avatar_url', '')
  );
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER SET search_path = public;

CREATE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW EXECUTE FUNCTION public.handle_new_user();