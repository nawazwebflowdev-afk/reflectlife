import { useState, useEffect } from "react";
import { supabase } from "@/integrations/supabase/client";

export const useTemplateBackground = () => {
  const [backgroundUrl, setBackgroundUrl] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetchTemplateBackground();
  }, []);

  const fetchTemplateBackground = async () => {
    try {
      const { data: { user } } = await supabase.auth.getUser();
      
      if (!user) {
        setLoading(false);
        return;
      }

      // Query user's template purchases
      const { data: purchases, error } = await supabase
        .from('template_purchases')
        .select(`
          template_id,
          site_templates:template_id (
            preview_url
          )
        `)
        .eq('buyer_id', user.id)
        .eq('payment_status', 'succeeded')
        .order('created_at', { ascending: false })
        .limit(1);

      if (error) {
        console.error('Error fetching template purchases:', error);
        setLoading(false);
        return;
      }

      if (purchases && purchases.length > 0 && purchases[0].site_templates) {
        const template = purchases[0].site_templates as any;
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
