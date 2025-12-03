import { useEffect } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useQueryClient } from '@tanstack/react-query';

const PROFILE_CACHE_KEY = 'reflectlife_profile_cache';
const CACHE_EXPIRY_MS = 1000 * 60 * 30; // 30 minutes

interface CachedProfile {
  data: any;
  timestamp: number;
  userId: string;
}

/**
 * Get cached profile from localStorage for instant loads
 */
const getCachedProfile = (userId: string): any | null => {
  try {
    const cached = localStorage.getItem(PROFILE_CACHE_KEY);
    if (!cached) return null;
    
    const parsed: CachedProfile = JSON.parse(cached);
    if (parsed.userId !== userId) return null;
    if (Date.now() - parsed.timestamp > CACHE_EXPIRY_MS) {
      localStorage.removeItem(PROFILE_CACHE_KEY);
      return null;
    }
    
    return parsed.data;
  } catch {
    return null;
  }
};

/**
 * Cache profile to localStorage for fast subsequent loads
 */
const setCachedProfile = (userId: string, data: any): void => {
  try {
    const cached: CachedProfile = {
      data,
      timestamp: Date.now(),
      userId,
    };
    localStorage.setItem(PROFILE_CACHE_KEY, JSON.stringify(cached));
  } catch {
    // Ignore storage errors
  }
};

/**
 * Preload all critical user data immediately after authentication
 * Uses localStorage cache for instant initial loads
 */
export const useProfilePreload = (userId: string | undefined) => {
  const queryClient = useQueryClient();

  useEffect(() => {
    if (!userId) return;

    // Immediately load from localStorage cache
    const cachedData = getCachedProfile(userId);
    if (cachedData) {
      queryClient.setQueryData(['user-profile', userId], cachedData.profile);
      queryClient.setQueryData(['user-data', userId], cachedData);
    }

    const preloadUserData = async () => {
      try {
        // Preload profile, creator status, and basic stats in parallel
        const [profileResult, creatorResult, statsResults] = await Promise.all([
          supabase
            .from('profiles')
            .select('id, full_name, first_name, last_name, avatar_url, bio, country, color_theme, template_id, email, is_premium')
            .eq('id', userId)
            .maybeSingle(),
          
          supabase
            .from('template_creators')
            .select('id, approved')
            .eq('user_id', userId)
            .maybeSingle(),
          
          Promise.all([
          supabase.from('memorial_posts').select('id', { count: 'exact', head: true }).eq('user_id', userId),
          supabase.from('template_purchases').select('id', { count: 'exact', head: true }).eq('buyer_id', userId).or('payment_status.eq.completed,payment_status.eq.succeeded'),
          ])
        ]);

        // Cache profile data
        if (profileResult.data && !profileResult.error) {
          queryClient.setQueryData(['user-profile', userId], profileResult.data);
        }

        // Cache full user data
        if (profileResult.data || creatorResult.data) {
          const [memoriesResult, templatesResult] = statsResults;
          const userData = {
            profile: profileResult.data,
            stats: {
              totalMemories: memoriesResult.count || 0,
              templatesPurchased: templatesResult.count || 0,
              likesReceived: 0,
            },
            creatorProfile: creatorResult.data,
            isCreator: creatorResult.data?.approved || false,
          };
          
          queryClient.setQueryData(['user-data', userId], userData);
          
          // Persist to localStorage for instant future loads
          setCachedProfile(userId, userData);
        }
      } catch (error) {
        console.error('Profile preload error:', error);
      }
    };

    preloadUserData();
  }, [userId, queryClient]);
};

/**
 * Clear profile cache on logout
 */
export const clearProfileCache = (): void => {
  try {
    localStorage.removeItem(PROFILE_CACHE_KEY);
  } catch {
    // Ignore
  }
};
