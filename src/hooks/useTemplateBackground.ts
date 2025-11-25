import { useState, useEffect } from "react";
import { supabase } from "@/integrations/supabase/client";

export const useTemplateBackground = () => {
  const [backgroundUrl, setBackgroundUrl] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetchTemplateBackground();

    // Listen for auth state changes
    const { data: { subscription } } = supabase.auth.onAuthStateChange(() => {
      fetchTemplateBackground();
    });

    return () => {
      subscription.unsubscribe();
    };
  }, []);

  const fetchTemplateBackground = async () => {
    try {
      const { data: { user } } = await supabase.auth.getUser();
      
      if (!user) {
        setLoading(false);
        return;
      }

      // Fetch user's active template from profile
      const { data: profile } = await supabase
        .from('profiles')
        .select('template_id')
        .eq('id', user.id)
        .maybeSingle();

      if (!profile?.template_id) {
        setLoading(false);
        return;
      }

      // Fetch the active template details
      const { data: template } = await supabase
        .from('site_templates')
        .select('preview_url')
        .eq('id', profile.template_id)
        .maybeSingle();

      if (template?.preview_url) {
        setBackgroundUrl(template.preview_url);
      }
    } catch (error) {
      console.error('Error in fetchTemplateBackground:', error);
    } finally {
      setLoading(false);
    }
  };

  return { backgroundUrl, loading };
};
