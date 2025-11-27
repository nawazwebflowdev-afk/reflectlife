import { useEffect } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useQueryClient } from '@tanstack/react-query';

/**
 * Preload user profile data immediately after authentication
 * to prevent UI flicker and ensure fast page loads
 */
export const useProfilePreload = (userId: string | undefined) => {
  const queryClient = useQueryClient();

  useEffect(() => {
    if (!userId) return;

    const preloadProfile = async () => {
      const { data, error } = await supabase
        .from('profiles')
        .select('id, first_name, last_name, full_name, avatar_url, bio, country, color_theme, template_id')
        .eq('id', userId)
        .maybeSingle();

      if (data && !error) {
        queryClient.setQueryData(['user-profile', userId], data);
      }
    };

    preloadProfile();
  }, [userId, queryClient]);
};
