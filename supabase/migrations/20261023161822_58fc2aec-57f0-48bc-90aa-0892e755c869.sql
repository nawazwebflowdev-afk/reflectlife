DROP POLICY "Anyone can read platform settings" ON public.platform_settings;
CREATE POLICY "Admins can read platform settings" ON public.platform_settings FOR SELECT TO authenticated USING (public.has_role(auth.uid(), 'admin'));

DROP POLICY "Anyone can view candle contributions" ON public.candle_contributions;
CREATE POLICY "Contributors and owners can view candle contributions" ON public.candle_contributions FOR SELECT TO authenticated USING (user_id = auth.uid() OR public.is_memorial_owner(memorial_id, auth.uid()) OR public.has_role(auth.uid(), 'admin'));

DROP POLICY "Anyone can view memorial candles" ON public.memorial_candles;
CREATE POLICY "Candles visible on viewable memorials" ON public.memorial_candles FOR SELECT TO public USING (EXISTS (SELECT 1 FROM public.memorials m WHERE m.id = memorial_id));

DROP POLICY "Anyone can view hearts" ON public.memorial_hearts;
CREATE POLICY "Hearts visible on viewable memorials" ON public.memorial_hearts FOR SELECT TO public USING (EXISTS (SELECT 1 FROM public.memorials m WHERE m.id = memorial_id));

DROP POLICY "Public reads info media" ON storage.objects;

DROP POLICY "Users upload own avatars" ON storage.objects;
CREATE POLICY "Users upload own avatars" ON storage.objects FOR INSERT TO public WITH CHECK (bucket_id = 'avatars' AND auth.role() = 'authenticated' AND (storage.foldername(name))[1] = 'user-avatars' AND (storage.foldername(name))[2] = (select auth.uid()::text));

DROP POLICY "Users update own avatars" ON storage.objects;
CREATE POLICY "Users update own avatars" ON storage.objects FOR UPDATE TO public USING (bucket_id = 'avatars' AND auth.role() = 'authenticated' AND (storage.foldername(name))[1] = 'user-avatars' AND (storage.foldername(name))[2] = (select auth.uid()::text));

DROP POLICY "Users delete own avatars" ON storage.objects;
CREATE POLICY "Users delete own avatars" ON storage.objects FOR DELETE TO public USING (bucket_id = 'avatars' AND auth.role() = 'authenticated' AND (storage.foldername(name))[1] = 'user-avatars' AND (storage.foldername(name))[2] = (select auth.uid()::text));