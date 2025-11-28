import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';

interface UserData {
  profile: {
    id: string;
    full_name: string | null;
    first_name: string | null;
    last_name: string | null;
    avatar_url: string | null;
    bio: string | null;
    country: string | null;
    color_theme: string | null;
    template_id: string | null;
    email: string | null;
  } | null;
  stats: {
    totalMemories: number;
    templatesPurchased: number;
    likesReceived: number;
  };
  creatorProfile: {
    approved: boolean;
    id: string;
  } | null;
  isCreator: boolean;
}

/**
 * Centralized hook for fetching all user-related data
 * Optimized with parallel queries and proper caching
 */
export const useUserData = (userId: string | undefined) => {
  return useQuery<UserData>({
    queryKey: ['user-data', userId],
    queryFn: async (): Promise<UserData> => {
      if (!userId) {
        return {
          profile: null,
          stats: { totalMemories: 0, templatesPurchased: 0, likesReceived: 0 },
          creatorProfile: null,
          isCreator: false,
        };
      }

      // Parallel execution for optimal performance
      const [profileResult, creatorResult, memoriesResult, templatesResult, userPostsResult] = 
        await Promise.all([
          // Profile data
          supabase
            .from('profiles')
            .select('id, full_name, first_name, last_name, avatar_url, bio, country, color_theme, template_id, email')
            .eq('id', userId)
            .maybeSingle(),
          
          // Creator status
          supabase
            .from('template_creators')
            .select('id, approved')
            .eq('user_id', userId)
            .maybeSingle(),
          
          // Memory count
          supabase
            .from('memorial_posts')
            .select('id', { count: 'exact', head: true })
            .eq('user_id', userId),
          
          // Template purchases count
          supabase
            .from('template_purchases')
            .select('id', { count: 'exact', head: true })
            .eq('buyer_id', userId)
            .eq('payment_status', 'succeeded'),
          
          // User posts for likes calculation
          supabase
            .from('memorial_posts')
            .select('id')
            .eq('user_id', userId)
        ]);

      // Calculate likes received
      let likesReceived = 0;
      if (userPostsResult.data && userPostsResult.data.length > 0) {
        const postIds = userPostsResult.data.map(p => p.id);
        const { count } = await supabase
          .from('memorial_likes')
          .select('id', { count: 'exact', head: true })
          .in('post_id', postIds);
        likesReceived = count || 0;
      }

      return {
        profile: profileResult.data,
        stats: {
          totalMemories: memoriesResult.count || 0,
          templatesPurchased: templatesResult.count || 0,
          likesReceived,
        },
        creatorProfile: creatorResult.data,
        isCreator: creatorResult.data?.approved || false,
      };
    },
    enabled: !!userId,
    staleTime: 1000 * 60 * 5, // 5 minutes
    gcTime: 1000 * 60 * 30, // 30 minutes
  });
};
