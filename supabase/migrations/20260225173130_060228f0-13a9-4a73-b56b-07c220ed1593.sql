
-- ============================================
-- REFLECTLIFE FULL DATABASE SCHEMA (FIXED ORDER)
-- ============================================

-- 1. ENUM TYPES
CREATE TYPE public.app_role AS ENUM ('admin', 'moderator', 'user');
CREATE TYPE public.privacy_level AS ENUM ('public', 'friends', 'private');

-- 2. UTILITY FUNCTIONS (no dependencies)
CREATE OR REPLACE FUNCTION public.update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SET search_path = public;

-- 3. USER ROLES TABLE (must come before has_role function)
CREATE TABLE public.user_roles (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL,
  role app_role NOT NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE (user_id, role)
);
ALTER TABLE public.user_roles ENABLE ROW LEVEL SECURITY;

-- 4. has_role function (now user_roles exists)
CREATE OR REPLACE FUNCTION public.has_role(_user_id uuid, _role app_role)
RETURNS boolean
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT EXISTS (
    SELECT 1 FROM public.user_roles
    WHERE user_id = _user_id AND role = _role
  )
$$;

-- RLS for user_roles
CREATE POLICY "Users can view their own roles" ON public.user_roles
  FOR SELECT TO authenticated USING (auth.uid() = user_id);
CREATE POLICY "Admins can manage roles" ON public.user_roles
  FOR ALL TO authenticated USING (public.has_role(auth.uid(), 'admin'));

-- 5. PROFILES TABLE
CREATE TABLE public.profiles (
  id UUID PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  full_name TEXT,
  first_name TEXT,
  last_name TEXT,
  username TEXT UNIQUE,
  email TEXT,
  phone TEXT,
  avatar_url TEXT,
  emoji_avatar TEXT,
  bio TEXT,
  country TEXT,
  color_theme TEXT DEFAULT 'default',
  template_id UUID,
  earnings_balance NUMERIC(10,2) DEFAULT 0,
  is_premium BOOLEAN DEFAULT false,
  is_deceased BOOLEAN DEFAULT false,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
ALTER TABLE public.profiles ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view all profiles" ON public.profiles
  FOR SELECT TO authenticated USING (true);
CREATE POLICY "Users can update own profile" ON public.profiles
  FOR UPDATE TO authenticated USING (auth.uid() = id);
CREATE POLICY "Users can insert own profile" ON public.profiles
  FOR INSERT TO authenticated WITH CHECK (auth.uid() = id);

CREATE TRIGGER update_profiles_updated_at
  BEFORE UPDATE ON public.profiles
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

-- Public profiles view
CREATE VIEW public.public_profiles WITH (security_invoker = true) AS
  SELECT id, full_name, first_name, last_name, username, avatar_url, emoji_avatar, country, is_deceased
  FROM public.profiles;

-- Auto-create profile on signup
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  INSERT INTO public.profiles (id, email, full_name)
  VALUES (
    NEW.id,
    NEW.email,
    COALESCE(NEW.raw_user_meta_data->>'full_name', NEW.raw_user_meta_data->>'name', '')
  );
  RETURN NEW;
END;
$$;

CREATE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW EXECUTE FUNCTION public.handle_new_user();

-- 6. MEMORIALS TABLE
CREATE TABLE public.memorials (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  name TEXT NOT NULL,
  bio TEXT,
  date_of_birth DATE,
  date_of_death DATE,
  location TEXT,
  preview_image_url TEXT,
  is_public BOOLEAN DEFAULT true,
  privacy_level privacy_level DEFAULT 'public',
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
ALTER TABLE public.memorials ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Anyone can view public memorials" ON public.memorials
  FOR SELECT USING (is_public = true AND privacy_level = 'public');
CREATE POLICY "Users can view own memorials" ON public.memorials
  FOR SELECT TO authenticated USING (auth.uid() = user_id);
CREATE POLICY "Users can create own memorials" ON public.memorials
  FOR INSERT TO authenticated WITH CHECK (auth.uid() = user_id);
CREATE POLICY "Users can update own memorials" ON public.memorials
  FOR UPDATE TO authenticated USING (auth.uid() = user_id);
CREATE POLICY "Users can delete own memorials" ON public.memorials
  FOR DELETE TO authenticated USING (auth.uid() = user_id);

CREATE TRIGGER update_memorials_updated_at
  BEFORE UPDATE ON public.memorials
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

-- 7. MEMORIAL MEDIA
CREATE TABLE public.memorial_media (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  memorial_id UUID NOT NULL REFERENCES public.memorials(id) ON DELETE CASCADE,
  media_type TEXT NOT NULL DEFAULT 'image',
  media_url TEXT NOT NULL,
  caption TEXT,
  uploaded_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
ALTER TABLE public.memorial_media ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Anyone can view memorial media" ON public.memorial_media
  FOR SELECT USING (true);
CREATE POLICY "Memorial owners can manage media" ON public.memorial_media
  FOR ALL TO authenticated USING (
    EXISTS (SELECT 1 FROM public.memorials WHERE id = memorial_id AND user_id = auth.uid())
  );

-- 8. MEMORIAL ENTRIES
CREATE TABLE public.memorial_entries (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  timeline_id UUID NOT NULL,
  caption TEXT,
  content_type TEXT DEFAULT 'text',
  content_url TEXT,
  event_date DATE,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
ALTER TABLE public.memorial_entries ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Anyone can view memorial entries" ON public.memorial_entries
  FOR SELECT USING (true);
CREATE POLICY "Auth users can create entries" ON public.memorial_entries
  FOR INSERT TO authenticated WITH CHECK (true);
CREATE POLICY "Auth users can update entries" ON public.memorial_entries
  FOR UPDATE TO authenticated USING (true);
CREATE POLICY "Auth users can delete entries" ON public.memorial_entries
  FOR DELETE TO authenticated USING (true);

-- 9. MEMORIAL TRIBUTES
CREATE TABLE public.memorial_tributes (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  memorial_id UUID NOT NULL REFERENCES public.memorials(id) ON DELETE CASCADE,
  user_id UUID REFERENCES auth.users(id) ON DELETE SET NULL,
  tribute_text TEXT NOT NULL,
  media_url TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
ALTER TABLE public.memorial_tributes ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Anyone can view memorial tributes" ON public.memorial_tributes
  FOR SELECT USING (true);
CREATE POLICY "Auth users can create tributes" ON public.memorial_tributes
  FOR INSERT TO authenticated WITH CHECK (auth.uid() = user_id);
CREATE POLICY "Users can delete own tributes" ON public.memorial_tributes
  FOR DELETE TO authenticated USING (auth.uid() = user_id);

-- 10. TRIBUTES (guest tributes)
CREATE TABLE public.tributes (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  memorial_id UUID,
  user_id UUID REFERENCES auth.users(id) ON DELETE SET NULL,
  tribute_text TEXT NOT NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
ALTER TABLE public.tributes ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Anyone can view guest tributes" ON public.tributes
  FOR SELECT USING (true);
CREATE POLICY "Anyone can create guest tributes" ON public.tributes
  FOR INSERT WITH CHECK (true);

-- 11. MEMORIAL CANDLES
CREATE TABLE public.memorial_candles (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  memorial_id UUID NOT NULL REFERENCES public.memorials(id) ON DELETE CASCADE,
  session_id TEXT,
  user_id UUID REFERENCES auth.users(id) ON DELETE SET NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
ALTER TABLE public.memorial_candles ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Anyone can view candles" ON public.memorial_candles
  FOR SELECT USING (true);
CREATE POLICY "Anyone can light a candle" ON public.memorial_candles
  FOR INSERT WITH CHECK (true);

-- 12. MEMORIAL POSTS
CREATE TABLE public.memorial_posts (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  media_url TEXT,
  caption TEXT,
  location TEXT,
  likes_count INT DEFAULT 0,
  comments_count INT DEFAULT 0,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
ALTER TABLE public.memorial_posts ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Anyone can view posts" ON public.memorial_posts
  FOR SELECT USING (true);
CREATE POLICY "Auth users can create posts" ON public.memorial_posts
  FOR INSERT TO authenticated WITH CHECK (auth.uid() = user_id);
CREATE POLICY "Users can update own posts" ON public.memorial_posts
  FOR UPDATE TO authenticated USING (auth.uid() = user_id);
CREATE POLICY "Users can delete own posts" ON public.memorial_posts
  FOR DELETE TO authenticated USING (auth.uid() = user_id);

-- 13. MEMORIAL COMMENTS
CREATE TABLE public.memorial_comments (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  post_id UUID NOT NULL REFERENCES public.memorial_posts(id) ON DELETE CASCADE,
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  content TEXT NOT NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
ALTER TABLE public.memorial_comments ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Anyone can view comments" ON public.memorial_comments
  FOR SELECT USING (true);
CREATE POLICY "Auth users can create comments" ON public.memorial_comments
  FOR INSERT TO authenticated WITH CHECK (auth.uid() = user_id);
CREATE POLICY "Users can delete own comments" ON public.memorial_comments
  FOR DELETE TO authenticated USING (auth.uid() = user_id);

-- 14. MEMORIAL LIKES
CREATE TABLE public.memorial_likes (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  post_id UUID NOT NULL REFERENCES public.memorial_posts(id) ON DELETE CASCADE,
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE(post_id, user_id)
);
ALTER TABLE public.memorial_likes ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Anyone can view likes" ON public.memorial_likes
  FOR SELECT USING (true);
CREATE POLICY "Auth users can like" ON public.memorial_likes
  FOR INSERT TO authenticated WITH CHECK (auth.uid() = user_id);
CREATE POLICY "Users can unlike" ON public.memorial_likes
  FOR DELETE TO authenticated USING (auth.uid() = user_id);

-- 15. MEMORIAL TIMELINES
CREATE TABLE public.memorial_timelines (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  title TEXT NOT NULL,
  description TEXT,
  background_url TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
ALTER TABLE public.memorial_timelines ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Anyone can view timelines" ON public.memorial_timelines
  FOR SELECT USING (true);
CREATE POLICY "Users can create own timelines" ON public.memorial_timelines
  FOR INSERT TO authenticated WITH CHECK (auth.uid() = user_id);
CREATE POLICY "Users can update own timelines" ON public.memorial_timelines
  FOR UPDATE TO authenticated USING (auth.uid() = user_id);
CREATE POLICY "Users can delete own timelines" ON public.memorial_timelines
  FOR DELETE TO authenticated USING (auth.uid() = user_id);

CREATE TRIGGER update_memorial_timelines_updated_at
  BEFORE UPDATE ON public.memorial_timelines
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

-- 16. MEMORIAL INVITATIONS
CREATE TABLE public.memorial_invitations (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  connection_id UUID,
  invitee_email TEXT,
  invited_by UUID REFERENCES auth.users(id) ON DELETE CASCADE,
  status TEXT DEFAULT 'pending',
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
ALTER TABLE public.memorial_invitations ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view relevant invitations" ON public.memorial_invitations
  FOR SELECT TO authenticated USING (
    invited_by = auth.uid() OR invitee_email = (SELECT email FROM auth.users WHERE id = auth.uid())
  );
CREATE POLICY "Auth users can create invitations" ON public.memorial_invitations
  FOR INSERT TO authenticated WITH CHECK (auth.uid() = invited_by);

-- 17. NOTIFICATIONS
CREATE TABLE public.notifications (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  actor_id UUID REFERENCES public.profiles(id) ON DELETE SET NULL,
  type TEXT NOT NULL,
  read BOOLEAN DEFAULT false,
  post_id UUID,
  comment_id UUID,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
ALTER TABLE public.notifications ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view own notifications" ON public.notifications
  FOR SELECT TO authenticated USING (auth.uid() = user_id);
CREATE POLICY "Auth users can create notifications" ON public.notifications
  FOR INSERT TO authenticated WITH CHECK (true);
CREATE POLICY "Users can update own notifications" ON public.notifications
  FOR UPDATE TO authenticated USING (auth.uid() = user_id);
CREATE POLICY "Users can delete own notifications" ON public.notifications
  FOR DELETE TO authenticated USING (auth.uid() = user_id);

-- 18. SITE TEMPLATES
CREATE TABLE public.site_templates (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name TEXT NOT NULL,
  country TEXT NOT NULL,
  preview_url TEXT,
  price NUMERIC(6,2) DEFAULT 0,
  is_free BOOLEAN DEFAULT true,
  description TEXT,
  is_creator_template BOOLEAN DEFAULT false,
  creator_id UUID REFERENCES public.profiles(id) ON DELETE SET NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
ALTER TABLE public.site_templates ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Anyone can view templates" ON public.site_templates
  FOR SELECT USING (true);
CREATE POLICY "Creators can insert own templates" ON public.site_templates
  FOR INSERT TO authenticated WITH CHECK (auth.uid() = creator_id OR creator_id IS NULL);
CREATE POLICY "Creators can update own templates" ON public.site_templates
  FOR UPDATE TO authenticated USING (auth.uid() = creator_id);
CREATE POLICY "Creators can delete own templates" ON public.site_templates
  FOR DELETE TO authenticated USING (auth.uid() = creator_id);

CREATE INDEX idx_site_templates_creator_id ON public.site_templates(creator_id);

-- 19. TEMPLATE CREATORS
CREATE TABLE public.template_creators (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  display_name TEXT,
  country TEXT,
  portfolio TEXT,
  description TEXT,
  approved BOOLEAN DEFAULT false,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE(user_id)
);
ALTER TABLE public.template_creators ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view own creator profile" ON public.template_creators
  FOR SELECT TO authenticated USING (auth.uid() = user_id);
CREATE POLICY "Users can create own creator profile" ON public.template_creators
  FOR INSERT TO authenticated WITH CHECK (auth.uid() = user_id);
CREATE POLICY "Admins can view all creators" ON public.template_creators
  FOR SELECT TO authenticated USING (public.has_role(auth.uid(), 'admin'));
CREATE POLICY "Admins can update creators" ON public.template_creators
  FOR UPDATE TO authenticated USING (public.has_role(auth.uid(), 'admin'));

-- 20. TEMPLATE PURCHASES
CREATE TABLE public.template_purchases (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  buyer_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  template_id UUID NOT NULL REFERENCES public.site_templates(id) ON DELETE CASCADE,
  payment_status TEXT DEFAULT 'pending',
  stripe_session_id TEXT,
  amount NUMERIC(6,2),
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
ALTER TABLE public.template_purchases ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view own purchases" ON public.template_purchases
  FOR SELECT TO authenticated USING (auth.uid() = buyer_id);
CREATE POLICY "Auth users can create purchases" ON public.template_purchases
  FOR INSERT TO authenticated WITH CHECK (auth.uid() = buyer_id);
CREATE POLICY "Users can update own purchases" ON public.template_purchases
  FOR UPDATE TO authenticated USING (auth.uid() = buyer_id);

-- 21. CREATOR PAYOUTS
CREATE TABLE public.creator_payouts (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  creator_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  amount NUMERIC(10,2) NOT NULL,
  status TEXT DEFAULT 'pending',
  payout_method JSONB DEFAULT '{}',
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
ALTER TABLE public.creator_payouts ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view own payouts" ON public.creator_payouts
  FOR SELECT TO authenticated USING (auth.uid() = creator_id);
CREATE POLICY "Users can create own payouts" ON public.creator_payouts
  FOR INSERT TO authenticated WITH CHECK (auth.uid() = creator_id);

-- 22. DIARY ENTRIES
CREATE TABLE public.diary_entries (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  title TEXT NOT NULL,
  content TEXT,
  entry_date DATE NOT NULL DEFAULT CURRENT_DATE,
  media_url TEXT,
  favorite_song_url TEXT,
  tags TEXT[],
  is_private BOOLEAN DEFAULT true,
  reactions JSONB DEFAULT '{}',
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
ALTER TABLE public.diary_entries ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view own diary" ON public.diary_entries
  FOR SELECT TO authenticated USING (auth.uid() = user_id);
CREATE POLICY "Public diary entries viewable" ON public.diary_entries
  FOR SELECT USING (is_private = false);
CREATE POLICY "Users can create own diary" ON public.diary_entries
  FOR INSERT TO authenticated WITH CHECK (auth.uid() = user_id);
CREATE POLICY "Users can update own diary" ON public.diary_entries
  FOR UPDATE TO authenticated USING (auth.uid() = user_id);
CREATE POLICY "Users can delete own diary" ON public.diary_entries
  FOR DELETE TO authenticated USING (auth.uid() = user_id);

CREATE TRIGGER update_diary_entries_updated_at
  BEFORE UPDATE ON public.diary_entries
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

-- 23. TREES
CREATE TABLE public.trees (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  name TEXT DEFAULT 'My Family Tree',
  is_public BOOLEAN DEFAULT false,
  share_token TEXT UNIQUE,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
ALTER TABLE public.trees ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view own trees" ON public.trees
  FOR SELECT TO authenticated USING (auth.uid() = user_id);
CREATE POLICY "Public trees viewable" ON public.trees
  FOR SELECT USING (is_public = true);
CREATE POLICY "Users can create own trees" ON public.trees
  FOR INSERT TO authenticated WITH CHECK (auth.uid() = user_id);
CREATE POLICY "Users can update own trees" ON public.trees
  FOR UPDATE TO authenticated USING (auth.uid() = user_id);
CREATE POLICY "Users can delete own trees" ON public.trees
  FOR DELETE TO authenticated USING (auth.uid() = user_id);

-- 24. CONNECTIONS
CREATE TABLE public.connections (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  owner_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  person_id UUID REFERENCES public.profiles(id) ON DELETE SET NULL,
  related_person_name TEXT,
  relationship_type TEXT NOT NULL,
  connection_type TEXT NOT NULL DEFAULT 'family',
  parent_connection_id UUID REFERENCES public.connections(id) ON DELETE SET NULL,
  shared_memory_id UUID,
  image_url TEXT,
  x_pos NUMERIC,
  y_pos NUMERIC,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
ALTER TABLE public.connections ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view own connections" ON public.connections
  FOR SELECT TO authenticated USING (auth.uid() = owner_id);
CREATE POLICY "Users can create own connections" ON public.connections
  FOR INSERT TO authenticated WITH CHECK (auth.uid() = owner_id);
CREATE POLICY "Users can update own connections" ON public.connections
  FOR UPDATE TO authenticated USING (auth.uid() = owner_id);
CREATE POLICY "Users can delete own connections" ON public.connections
  FOR DELETE TO authenticated USING (auth.uid() = owner_id);

-- 25. TREE CONTRIBUTIONS
CREATE TABLE public.tree_contributions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  tree_id UUID REFERENCES public.trees(id) ON DELETE CASCADE,
  contributor_id UUID REFERENCES auth.users(id) ON DELETE CASCADE,
  connection_id UUID REFERENCES public.connections(id) ON DELETE CASCADE,
  status TEXT DEFAULT 'pending',
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
ALTER TABLE public.tree_contributions ENABLE ROW LEVEL SECURITY;

CREATE POLICY "View contributions" ON public.tree_contributions
  FOR SELECT TO authenticated USING (
    EXISTS (SELECT 1 FROM public.trees WHERE id = tree_id AND user_id = auth.uid())
    OR contributor_id = auth.uid()
  );
CREATE POLICY "Create contributions" ON public.tree_contributions
  FOR INSERT TO authenticated WITH CHECK (auth.uid() = contributor_id);

-- 26. STORAGE BUCKETS
INSERT INTO storage.buckets (id, name, public) VALUES ('avatars', 'avatars', true);
INSERT INTO storage.buckets (id, name, public) VALUES ('memorial_uploads', 'memorial_uploads', true);
INSERT INTO storage.buckets (id, name, public) VALUES ('timeline_backgrounds', 'timeline_backgrounds', true);

-- Storage policies
CREATE POLICY "Avatars publicly accessible" ON storage.objects
  FOR SELECT USING (bucket_id = 'avatars');
CREATE POLICY "Auth upload avatars" ON storage.objects
  FOR INSERT WITH CHECK (bucket_id = 'avatars' AND auth.role() = 'authenticated');
CREATE POLICY "Auth update avatars" ON storage.objects
  FOR UPDATE USING (bucket_id = 'avatars' AND auth.role() = 'authenticated');

CREATE POLICY "Memorial uploads accessible" ON storage.objects
  FOR SELECT USING (bucket_id = 'memorial_uploads');
CREATE POLICY "Auth upload memorial files" ON storage.objects
  FOR INSERT WITH CHECK (bucket_id = 'memorial_uploads' AND auth.role() = 'authenticated');
CREATE POLICY "Auth update memorial files" ON storage.objects
  FOR UPDATE USING (bucket_id = 'memorial_uploads' AND auth.role() = 'authenticated');

CREATE POLICY "Timeline bg accessible" ON storage.objects
  FOR SELECT USING (bucket_id = 'timeline_backgrounds');
CREATE POLICY "Auth upload timeline bg" ON storage.objects
  FOR INSERT WITH CHECK (bucket_id = 'timeline_backgrounds' AND auth.role() = 'authenticated');

-- 27. INDEXES
CREATE INDEX idx_memorials_user_id ON public.memorials(user_id);
CREATE INDEX idx_memorial_media_memorial_id ON public.memorial_media(memorial_id);
CREATE INDEX idx_memorial_entries_timeline_id ON public.memorial_entries(timeline_id);
CREATE INDEX idx_memorial_tributes_memorial_id ON public.memorial_tributes(memorial_id);
CREATE INDEX idx_memorial_candles_memorial_id ON public.memorial_candles(memorial_id);
CREATE INDEX idx_memorial_comments_post_id ON public.memorial_comments(post_id);
CREATE INDEX idx_memorial_posts_user_id ON public.memorial_posts(user_id);
CREATE INDEX idx_memorial_likes_post_id ON public.memorial_likes(post_id);
CREATE INDEX idx_notifications_user_id ON public.notifications(user_id);
CREATE INDEX idx_connections_owner_id ON public.connections(owner_id);
CREATE INDEX idx_diary_entries_user_id ON public.diary_entries(user_id);
CREATE INDEX idx_template_purchases_buyer_id ON public.template_purchases(buyer_id);

-- 28. ENABLE REALTIME
ALTER PUBLICATION supabase_realtime ADD TABLE public.memorial_posts;
ALTER PUBLICATION supabase_realtime ADD TABLE public.memorials;
ALTER PUBLICATION supabase_realtime ADD TABLE public.notifications;
ALTER PUBLICATION supabase_realtime ADD TABLE public.memorial_candles;

-- Set template_id FK now that site_templates exists
ALTER TABLE public.profiles ADD CONSTRAINT profiles_template_id_fkey 
  FOREIGN KEY (template_id) REFERENCES public.site_templates(id) ON DELETE SET NULL;
