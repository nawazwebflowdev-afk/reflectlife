-- Add missing foreign key constraints to ensure data integrity and enable proper JOIN queries

-- Add foreign key from site_templates.creator_id to profiles.id
ALTER TABLE public.site_templates
DROP CONSTRAINT IF EXISTS site_templates_creator_id_fkey;

ALTER TABLE public.site_templates
ADD CONSTRAINT site_templates_creator_id_fkey
FOREIGN KEY (creator_id)
REFERENCES public.profiles(id)
ON DELETE SET NULL;

-- Add foreign key from memorial_posts.user_id to profiles.id
ALTER TABLE public.memorial_posts
DROP CONSTRAINT IF EXISTS memorial_posts_user_id_fkey;

ALTER TABLE public.memorial_posts
ADD CONSTRAINT memorial_posts_user_id_fkey
FOREIGN KEY (user_id)
REFERENCES public.profiles(id)
ON DELETE CASCADE;

-- Add indexes for better query performance on foreign keys
CREATE INDEX IF NOT EXISTS idx_site_templates_creator_id ON public.site_templates(creator_id);
CREATE INDEX IF NOT EXISTS idx_memorial_posts_user_id ON public.memorial_posts(user_id);
CREATE INDEX IF NOT EXISTS idx_memorial_posts_created_at ON public.memorial_posts(created_at DESC);