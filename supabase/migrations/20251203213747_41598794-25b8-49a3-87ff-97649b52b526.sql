-- Add performance indexes for frequently queried columns
-- These indexes will improve query performance for user_id lookups

-- Index for memorial_posts.user_id (for timeline queries)
CREATE INDEX IF NOT EXISTS idx_memorial_posts_user_id ON public.memorial_posts(user_id);
CREATE INDEX IF NOT EXISTS idx_memorial_posts_created_at ON public.memorial_posts(created_at DESC);

-- Index for memorials.user_id (for memorial wall queries)
CREATE INDEX IF NOT EXISTS idx_memorials_user_id ON public.memorials(user_id);
CREATE INDEX IF NOT EXISTS idx_memorials_public ON public.memorials(is_public, privacy_level) WHERE is_public = true;

-- Index for site_templates.creator_id (for templates page)
CREATE INDEX IF NOT EXISTS idx_site_templates_creator_id ON public.site_templates(creator_id);

-- Index for template_purchases.buyer_id (for ownership checks)
CREATE INDEX IF NOT EXISTS idx_template_purchases_buyer_id ON public.template_purchases(buyer_id);
CREATE INDEX IF NOT EXISTS idx_template_purchases_template_id ON public.template_purchases(template_id);

-- Index for memorial_likes.post_id and user_id (for like queries)
CREATE INDEX IF NOT EXISTS idx_memorial_likes_post_user ON public.memorial_likes(post_id, user_id);

-- Index for notifications.user_id (for notifications dropdown)
CREATE INDEX IF NOT EXISTS idx_notifications_user_id ON public.notifications(user_id, created_at DESC);

-- Index for diary_entries.user_id (for diary page)
CREATE INDEX IF NOT EXISTS idx_diary_entries_user_id ON public.diary_entries(user_id);

-- Index for trees.user_id (for tree page)
CREATE INDEX IF NOT EXISTS idx_trees_user_id ON public.trees(user_id);

-- Index for template_creators.user_id (for creator checks)
CREATE INDEX IF NOT EXISTS idx_template_creators_user_id ON public.template_creators(user_id);