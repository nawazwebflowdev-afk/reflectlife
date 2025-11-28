import { useEffect } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useQueryClient } from '@tanstack/react-query';

/**
 * Preload all critical user data immediately after authentication
 * Prevents UI flicker and ensures instant page loads
 */
export const useProfilePreload = (userId: string | undefined) => {
  const queryClient = useQueryClient();

  useEffect(() => {
    if (!userId) return;

    const preloadUserData = async () => {
      // Preload profile, creator status, and basic stats in parallel
      const [profileResult, creatorResult, statsResults] = await Promise.all([
        supabase
          .from('profiles')
          .select('id, full_name, first_name, last_name, avatar_url, bio, country, color_theme, template_id, email')
          .eq('id', userId)
          .maybeSingle(),
        
        supabase
          .from('template_creators')
          .select('id, approved')
          .eq('user_id', userId)
          .maybeSingle(),
        
        Promise.all([
          supabase.from('memorial_posts').select('id', { count: 'exact', head: true }).eq('user_id', userId),
          supabase.from('template_purchases').select('id', { count: 'exact', head: true }).eq('buyer_id', userId).eq('payment_status', 'succeeded'),
        ])
      ]);

      // Cache profile data
      if (profileResult.data && !profileResult.error) {
        queryClient.setQueryData(['user-profile', userId], profileResult.data);
      }

      // Cache full user data
      if (profileResult.data || creatorResult.data) {
        const [memoriesResult, templatesResult] = statsResults;
        queryClient.setQueryData(['user-data', userId], {
          profile: profileResult.data,
          stats: {
            totalMemories: memoriesResult.count || 0,
            templatesPurchased: templatesResult.count || 0,
            likesReceived: 0, // Will be calculated on demand
          },
          creatorProfile: creatorResult.data,
          isCreator: creatorResult.data?.approved || false,
        });
      }
    };

    preloadUserData();
  }, [userId, queryClient]);
};
