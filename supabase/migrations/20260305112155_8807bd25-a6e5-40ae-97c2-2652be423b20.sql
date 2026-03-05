
-- =============================================
-- Convert ALL restrictive policies to PERMISSIVE
-- =============================================

-- CONNECTIONS
DROP POLICY IF EXISTS "Users can create own connections" ON public.connections;
DROP POLICY IF EXISTS "Users can delete own connections" ON public.connections;
DROP POLICY IF EXISTS "Users can update own connections" ON public.connections;
DROP POLICY IF EXISTS "View own or granted connections" ON public.connections;

CREATE POLICY "Users can create own connections" ON public.connections FOR INSERT
WITH CHECK ((auth.uid() = owner_id) OR has_tree_access(owner_id, auth.uid(), 'add_connections'::text));

CREATE POLICY "Users can delete own connections" ON public.connections FOR DELETE
USING (auth.uid() = owner_id);

CREATE POLICY "Users can update own connections" ON public.connections FOR UPDATE
USING (auth.uid() = owner_id);

CREATE POLICY "View own or granted connections" ON public.connections FOR SELECT
USING ((owner_id = auth.uid()) OR has_tree_access(owner_id, auth.uid(), 'view'::text));

-- CREATOR_PAYOUTS
DROP POLICY IF EXISTS "Users can create own payouts" ON public.creator_payouts;
DROP POLICY IF EXISTS "Users can view own payouts" ON public.creator_payouts;

CREATE POLICY "Users can create own payouts" ON public.creator_payouts FOR INSERT
WITH CHECK (auth.uid() = creator_id);

CREATE POLICY "Users can view own payouts" ON public.creator_payouts FOR SELECT
USING (auth.uid() = creator_id);

-- DIARY_ENTRIES
DROP POLICY IF EXISTS "Public diary entries viewable" ON public.diary_entries;
DROP POLICY IF EXISTS "Users can create own diary" ON public.diary_entries;
DROP POLICY IF EXISTS "Users can delete own diary" ON public.diary_entries;
DROP POLICY IF EXISTS "Users can update own diary" ON public.diary_entries;
DROP POLICY IF EXISTS "Users can view own diary" ON public.diary_entries;

CREATE POLICY "Users can view own diary" ON public.diary_entries FOR SELECT
USING ((auth.uid() = user_id) OR (is_private = false));

CREATE POLICY "Users can create own diary" ON public.diary_entries FOR INSERT
WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can delete own diary" ON public.diary_entries FOR DELETE
USING (auth.uid() = user_id);

CREATE POLICY "Users can update own diary" ON public.diary_entries FOR UPDATE
USING (auth.uid() = user_id);

-- MEMORIAL_ACCESS
DROP POLICY IF EXISTS "Memorial owners can manage access" ON public.memorial_access;
DROP POLICY IF EXISTS "Users can view own access grants" ON public.memorial_access;

CREATE POLICY "Memorial owners can manage access" ON public.memorial_access FOR ALL
USING (is_memorial_owner(memorial_id, auth.uid()))
WITH CHECK (is_memorial_owner(memorial_id, auth.uid()));

CREATE POLICY "Users can view own access grants" ON public.memorial_access FOR SELECT
USING (user_id = auth.uid());

-- MEMORIAL_CANDLES
DROP POLICY IF EXISTS "Anyone can light a candle" ON public.memorial_candles;
DROP POLICY IF EXISTS "Anyone can view candles" ON public.memorial_candles;

CREATE POLICY "Anyone can view candles" ON public.memorial_candles FOR SELECT
USING (true);

CREATE POLICY "Anyone can light a candle" ON public.memorial_candles FOR INSERT
WITH CHECK ((memorial_id IS NOT NULL) AND ((session_id IS NOT NULL) OR (user_id IS NOT NULL)));

-- MEMORIAL_COMMENTS
DROP POLICY IF EXISTS "Anyone can view comments" ON public.memorial_comments;
DROP POLICY IF EXISTS "Auth users can create comments" ON public.memorial_comments;
DROP POLICY IF EXISTS "Users can delete own comments" ON public.memorial_comments;

CREATE POLICY "Anyone can view comments" ON public.memorial_comments FOR SELECT
USING (true);

CREATE POLICY "Auth users can create comments" ON public.memorial_comments FOR INSERT
WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can delete own comments" ON public.memorial_comments FOR DELETE
USING (auth.uid() = user_id);

-- MEMORIAL_ENTRIES
DROP POLICY IF EXISTS "Anyone can view memorial entries" ON public.memorial_entries;
DROP POLICY IF EXISTS "Memorial owners can create entries" ON public.memorial_entries;
DROP POLICY IF EXISTS "Memorial owners can delete entries" ON public.memorial_entries;
DROP POLICY IF EXISTS "Memorial owners can update entries" ON public.memorial_entries;

CREATE POLICY "Anyone can view memorial entries" ON public.memorial_entries FOR SELECT
USING (true);

CREATE POLICY "Memorial owners can create entries" ON public.memorial_entries FOR INSERT
WITH CHECK (EXISTS (SELECT 1 FROM memorials m WHERE m.id = memorial_entries.timeline_id AND m.user_id = auth.uid()));

CREATE POLICY "Memorial owners can delete entries" ON public.memorial_entries FOR DELETE
USING (EXISTS (SELECT 1 FROM memorials m WHERE m.id = memorial_entries.timeline_id AND m.user_id = auth.uid()));

CREATE POLICY "Memorial owners can update entries" ON public.memorial_entries FOR UPDATE
USING (EXISTS (SELECT 1 FROM memorials m WHERE m.id = memorial_entries.timeline_id AND m.user_id = auth.uid()));

-- MEMORIAL_INVITATIONS
DROP POLICY IF EXISTS "Auth users can create invitations" ON public.memorial_invitations;
DROP POLICY IF EXISTS "Invitees can view their invitations" ON public.memorial_invitations;
DROP POLICY IF EXISTS "Inviters can view own invitations" ON public.memorial_invitations;

CREATE POLICY "Auth users can create invitations" ON public.memorial_invitations FOR INSERT
WITH CHECK (auth.uid() = invited_by);

CREATE POLICY "Inviters can view own invitations" ON public.memorial_invitations FOR SELECT
USING ((invited_by = auth.uid()) OR (invitee_email = (SELECT profiles.email FROM profiles WHERE profiles.id = auth.uid())));

-- MEMORIAL_LIKES
DROP POLICY IF EXISTS "Anyone can view likes" ON public.memorial_likes;
DROP POLICY IF EXISTS "Auth users can like" ON public.memorial_likes;
DROP POLICY IF EXISTS "Users can unlike" ON public.memorial_likes;

CREATE POLICY "Anyone can view likes" ON public.memorial_likes FOR SELECT
USING (true);

CREATE POLICY "Auth users can like" ON public.memorial_likes FOR INSERT
WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can unlike" ON public.memorial_likes FOR DELETE
USING (auth.uid() = user_id);

-- MEMORIAL_MEDIA
DROP POLICY IF EXISTS "Anyone can view memorial media" ON public.memorial_media;
DROP POLICY IF EXISTS "Memorial owners can manage media" ON public.memorial_media;

CREATE POLICY "Anyone can view memorial media" ON public.memorial_media FOR SELECT
USING (true);

CREATE POLICY "Memorial owners can manage media" ON public.memorial_media FOR ALL
USING (EXISTS (SELECT 1 FROM memorials WHERE memorials.id = memorial_media.memorial_id AND memorials.user_id = auth.uid()));

-- MEMORIAL_POSTS
DROP POLICY IF EXISTS "Anyone can view posts" ON public.memorial_posts;
DROP POLICY IF EXISTS "Auth users can create posts" ON public.memorial_posts;
DROP POLICY IF EXISTS "Users can delete own posts" ON public.memorial_posts;
DROP POLICY IF EXISTS "Users can update own posts" ON public.memorial_posts;

CREATE POLICY "Anyone can view posts" ON public.memorial_posts FOR SELECT
USING (true);

CREATE POLICY "Auth users can create posts" ON public.memorial_posts FOR INSERT
WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can delete own posts" ON public.memorial_posts FOR DELETE
USING (auth.uid() = user_id);

CREATE POLICY "Users can update own posts" ON public.memorial_posts FOR UPDATE
USING (auth.uid() = user_id);

-- MEMORIAL_TIMELINES
DROP POLICY IF EXISTS "Anyone can view timelines" ON public.memorial_timelines;
DROP POLICY IF EXISTS "Users can create own timelines" ON public.memorial_timelines;
DROP POLICY IF EXISTS "Users can delete own timelines" ON public.memorial_timelines;
DROP POLICY IF EXISTS "Users can update own timelines" ON public.memorial_timelines;

CREATE POLICY "Anyone can view timelines" ON public.memorial_timelines FOR SELECT
USING (true);

CREATE POLICY "Users can create own timelines" ON public.memorial_timelines FOR INSERT
WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can delete own timelines" ON public.memorial_timelines FOR DELETE
USING (auth.uid() = user_id);

CREATE POLICY "Users can update own timelines" ON public.memorial_timelines FOR UPDATE
USING (auth.uid() = user_id);

-- MEMORIAL_TRIBUTES
DROP POLICY IF EXISTS "Anyone can view memorial tributes" ON public.memorial_tributes;
DROP POLICY IF EXISTS "Auth users can create tributes" ON public.memorial_tributes;
DROP POLICY IF EXISTS "Users can delete own tributes" ON public.memorial_tributes;

CREATE POLICY "Anyone can view memorial tributes" ON public.memorial_tributes FOR SELECT
USING (true);

CREATE POLICY "Auth users can create tributes" ON public.memorial_tributes FOR INSERT
WITH CHECK ((auth.uid() = user_id) AND ((EXISTS (SELECT 1 FROM memorials WHERE memorials.id = memorial_tributes.memorial_id AND (memorials.is_public = true OR memorials.user_id = auth.uid()))) OR (EXISTS (SELECT 1 FROM memorial_access WHERE memorial_access.memorial_id = memorial_tributes.memorial_id AND memorial_access.user_id = auth.uid() AND memorial_access.status = 'accepted' AND 'tribute' = ANY(memorial_access.permissions)))));

CREATE POLICY "Users can delete own tributes" ON public.memorial_tributes FOR DELETE
USING (auth.uid() = user_id);

-- MEMORIALS
DROP POLICY IF EXISTS "Users can create own memorials" ON public.memorials;
DROP POLICY IF EXISTS "Users can delete own memorials" ON public.memorials;
DROP POLICY IF EXISTS "Users can update own memorials" ON public.memorials;
DROP POLICY IF EXISTS "View public or own or granted memorials" ON public.memorials;

CREATE POLICY "View public or own or granted memorials" ON public.memorials FOR SELECT
USING (((is_public = true) AND (privacy_level = 'public'::privacy_level)) OR (auth.uid() = user_id) OR has_memorial_access(id, auth.uid()));

CREATE POLICY "Users can create own memorials" ON public.memorials FOR INSERT
WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can delete own memorials" ON public.memorials FOR DELETE
USING (auth.uid() = user_id);

CREATE POLICY "Users can update own memorials" ON public.memorials FOR UPDATE
USING (auth.uid() = user_id);

-- NOTIFICATIONS
DROP POLICY IF EXISTS "Users can create own notifications" ON public.notifications;
DROP POLICY IF EXISTS "Users can delete own notifications" ON public.notifications;
DROP POLICY IF EXISTS "Users can update own notifications" ON public.notifications;
DROP POLICY IF EXISTS "Users can view own notifications" ON public.notifications;

CREATE POLICY "Users can view own notifications" ON public.notifications FOR SELECT
USING (auth.uid() = user_id);

CREATE POLICY "Users can create own notifications" ON public.notifications FOR INSERT
WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can delete own notifications" ON public.notifications FOR DELETE
USING (auth.uid() = user_id);

CREATE POLICY "Users can update own notifications" ON public.notifications FOR UPDATE
USING (auth.uid() = user_id);

-- PROFILES
DROP POLICY IF EXISTS "Admins can view all profiles" ON public.profiles;
DROP POLICY IF EXISTS "Users can insert own profile" ON public.profiles;
DROP POLICY IF EXISTS "Users can update own profile" ON public.profiles;

CREATE POLICY "Users can view profiles" ON public.profiles FOR SELECT
USING ((auth.uid() = id) OR has_role(auth.uid(), 'admin'::app_role));

CREATE POLICY "Users can insert own profile" ON public.profiles FOR INSERT
WITH CHECK (auth.uid() = id);

CREATE POLICY "Users can update own profile" ON public.profiles FOR UPDATE
USING (auth.uid() = id)
WITH CHECK ((auth.uid() = id) AND (NOT (is_premium IS DISTINCT FROM (SELECT p.is_premium FROM profiles p WHERE p.id = auth.uid()))) AND (NOT (earnings_balance IS DISTINCT FROM (SELECT p.earnings_balance FROM profiles p WHERE p.id = auth.uid()))));

-- SITE_TEMPLATES
DROP POLICY IF EXISTS "Anyone can view templates" ON public.site_templates;
DROP POLICY IF EXISTS "Creators can delete own templates" ON public.site_templates;
DROP POLICY IF EXISTS "Creators can insert own templates" ON public.site_templates;
DROP POLICY IF EXISTS "Creators can update own templates" ON public.site_templates;

CREATE POLICY "Anyone can view templates" ON public.site_templates FOR SELECT
USING (true);

CREATE POLICY "Creators can insert own templates" ON public.site_templates FOR INSERT
WITH CHECK ((auth.uid() = creator_id) OR (creator_id IS NULL));

CREATE POLICY "Creators can update own templates" ON public.site_templates FOR UPDATE
USING (auth.uid() = creator_id);

CREATE POLICY "Creators can delete own templates" ON public.site_templates FOR DELETE
USING (auth.uid() = creator_id);

-- TEMPLATE_CREATORS
DROP POLICY IF EXISTS "Admins can delete applications" ON public.template_creators;
DROP POLICY IF EXISTS "Admins can update creators" ON public.template_creators;
DROP POLICY IF EXISTS "Admins can view all creators" ON public.template_creators;
DROP POLICY IF EXISTS "Users can create own creator profile" ON public.template_creators;
DROP POLICY IF EXISTS "Users can view own creator profile" ON public.template_creators;

CREATE POLICY "Users can view own or admin view creators" ON public.template_creators FOR SELECT
USING ((auth.uid() = user_id) OR has_role(auth.uid(), 'admin'::app_role));

CREATE POLICY "Users can create own creator profile" ON public.template_creators FOR INSERT
WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Admins can update creators" ON public.template_creators FOR UPDATE
USING (has_role(auth.uid(), 'admin'::app_role));

CREATE POLICY "Admins can delete applications" ON public.template_creators FOR DELETE
USING (has_role(auth.uid(), 'admin'::app_role));

-- TEMPLATE_PURCHASES
DROP POLICY IF EXISTS "Auth users can create purchases" ON public.template_purchases;
DROP POLICY IF EXISTS "Users can update own purchases" ON public.template_purchases;
DROP POLICY IF EXISTS "Users can view own purchases" ON public.template_purchases;

CREATE POLICY "Users can view own purchases" ON public.template_purchases FOR SELECT
USING (auth.uid() = buyer_id);

CREATE POLICY "Auth users can create purchases" ON public.template_purchases FOR INSERT
WITH CHECK (auth.uid() = buyer_id);

CREATE POLICY "Users can update own purchases" ON public.template_purchases FOR UPDATE
USING (auth.uid() = buyer_id);

-- TREE_ACCESS
DROP POLICY IF EXISTS "Tree owners can manage access" ON public.tree_access;
DROP POLICY IF EXISTS "Users can view own tree access" ON public.tree_access;

CREATE POLICY "Tree owners can manage access" ON public.tree_access FOR ALL
USING (is_tree_owner(tree_id, auth.uid()));

CREATE POLICY "Users can view own tree access" ON public.tree_access FOR SELECT
USING (user_id = auth.uid());

-- TREE_CONTRIBUTIONS
DROP POLICY IF EXISTS "Create contributions" ON public.tree_contributions;
DROP POLICY IF EXISTS "View contributions" ON public.tree_contributions;

CREATE POLICY "View contributions" ON public.tree_contributions FOR SELECT
USING ((EXISTS (SELECT 1 FROM trees WHERE trees.id = tree_contributions.tree_id AND trees.user_id = auth.uid())) OR (contributor_id = auth.uid()));

CREATE POLICY "Create contributions" ON public.tree_contributions FOR INSERT
WITH CHECK (auth.uid() = contributor_id);

-- TREES
DROP POLICY IF EXISTS "Users can create own trees" ON public.trees;
DROP POLICY IF EXISTS "Users can delete own trees" ON public.trees;
DROP POLICY IF EXISTS "Users can update own trees" ON public.trees;
DROP POLICY IF EXISTS "View own or granted trees" ON public.trees;

CREATE POLICY "View own or granted trees" ON public.trees FOR SELECT
USING ((user_id = auth.uid()) OR (is_public = true) OR user_has_tree_access(id, auth.uid()));

CREATE POLICY "Users can create own trees" ON public.trees FOR INSERT
WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can delete own trees" ON public.trees FOR DELETE
USING (auth.uid() = user_id);

CREATE POLICY "Users can update own trees" ON public.trees FOR UPDATE
USING (auth.uid() = user_id);

-- TRIBUTES
DROP POLICY IF EXISTS "Anyone can create guest tributes" ON public.tributes;
DROP POLICY IF EXISTS "Anyone can view guest tributes" ON public.tributes;

CREATE POLICY "Anyone can view guest tributes" ON public.tributes FOR SELECT
USING (true);

CREATE POLICY "Anyone can create guest tributes" ON public.tributes FOR INSERT
WITH CHECK ((tribute_text IS NOT NULL) AND (char_length(tribute_text) > 0));

-- USER_ROLES
DROP POLICY IF EXISTS "Admins can manage roles" ON public.user_roles;
DROP POLICY IF EXISTS "Users can view their own roles" ON public.user_roles;

CREATE POLICY "Admins can manage roles" ON public.user_roles FOR ALL
USING (has_role(auth.uid(), 'admin'::app_role));

CREATE POLICY "Users can view their own roles" ON public.user_roles FOR SELECT
USING (auth.uid() = user_id);
