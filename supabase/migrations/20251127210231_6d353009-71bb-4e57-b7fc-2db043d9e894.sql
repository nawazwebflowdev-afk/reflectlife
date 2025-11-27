-- Add privacy controls to memorials table
ALTER TABLE public.memorials 
ADD COLUMN IF NOT EXISTS is_public BOOLEAN DEFAULT true,
ADD COLUMN IF NOT EXISTS privacy_level TEXT DEFAULT 'public' CHECK (privacy_level IN ('public', 'friends', 'private'));

-- Create indexes for performance optimization
CREATE INDEX IF NOT EXISTS idx_memorials_user_id ON public.memorials(user_id);
CREATE INDEX IF NOT EXISTS idx_memorials_created_at ON public.memorials(created_at DESC);
CREATE INDEX IF NOT EXISTS idx_memorials_is_public ON public.memorials(is_public);

CREATE INDEX IF NOT EXISTS idx_memorial_posts_user_id ON public.memorial_posts(user_id);
CREATE INDEX IF NOT EXISTS idx_memorial_posts_created_at ON public.memorial_posts(created_at DESC);

CREATE INDEX IF NOT EXISTS idx_memorial_tributes_memorial_id ON public.memorial_tributes(memorial_id);
CREATE INDEX IF NOT EXISTS idx_memorial_tributes_created_at ON public.memorial_tributes(created_at DESC);

CREATE INDEX IF NOT EXISTS idx_profiles_email ON public.profiles(email);
CREATE INDEX IF NOT EXISTS idx_profiles_template_id ON public.profiles(template_id);

CREATE INDEX IF NOT EXISTS idx_template_purchases_buyer_id ON public.template_purchases(buyer_id);
CREATE INDEX IF NOT EXISTS idx_template_purchases_template_id ON public.template_purchases(template_id);

CREATE INDEX IF NOT EXISTS idx_notifications_user_id ON public.notifications(user_id);
CREATE INDEX IF NOT EXISTS idx_notifications_created_at ON public.notifications(created_at DESC);
CREATE INDEX IF NOT EXISTS idx_notifications_read ON public.notifications(read);

CREATE INDEX IF NOT EXISTS idx_diary_entries_user_id ON public.diary_entries(user_id);
CREATE INDEX IF NOT EXISTS idx_diary_entries_entry_date ON public.diary_entries(entry_date DESC);

-- Update RLS policy for public memorials
DROP POLICY IF EXISTS "Anyone can view public memorials" ON public.memorials;
CREATE POLICY "Anyone can view public memorials" 
ON public.memorials 
FOR SELECT 
USING (is_public = true AND privacy_level = 'public');