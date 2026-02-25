import { useState, useEffect } from "react";
import { supabase } from "@/integrations/supabase/client";

interface Template {
  id: string;
  name: string;
  preview_url: string | null;
}

interface UseActiveTemplateReturn {
  activeTemplate: Template | null;
  purchasedTemplates: Template[];
  loading: boolean;
  setActiveTemplate: (templateId: string) => Promise<void>;
}

export const useActiveTemplate = (): UseActiveTemplateReturn => {
  const [activeTemplate, setActiveTemplateState] = useState<Template | null>(null);
  const [purchasedTemplates, setPurchasedTemplates] = useState<Template[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetchTemplateData();

    // Listen for auth state changes
    const { data: { subscription } } = supabase.auth.onAuthStateChange(() => {
      fetchTemplateData();
    });

    return () => {
      subscription.unsubscribe();
    };
  }, []);

  const fetchTemplateData = async () => {
    try {
      const { data: { user } } = await supabase.auth.getUser();
      
      if (!user) {
        setLoading(false);
        return;
      }

      // Fetch user's profile to get active template
      const { data: profile } = await supabase
        .from('profiles')
        .select('template_id')
        .eq('id', user.id)
        .maybeSingle();

      // Fetch all purchased templates
      const { data: purchases } = await supabase
        .from('template_purchases')
        .select(`
          template_id,
          site_templates:template_id (
            id,
            name,
            preview_url
          )
        `)
        .eq('buyer_id', user.id)
        .eq('payment_status', 'succeeded')
        .order('created_at', { ascending: false });

      if (purchases && purchases.length > 0) {
        const templates: Template[] = (purchases as any[])
          .flatMap((p: any) => {
            const t = p?.site_templates;
            if (!t) return [];
            return Array.isArray(t) ? t : [t];
          })
          .filter(Boolean)
          .map((t: any) => ({
            id: String(t.id),
            name: String(t.name),
            preview_url: (t.preview_url ?? null) as string | null,
          }));

        setPurchasedTemplates(templates);

        // Set active template from profile or default to most recent purchase
        if (profile?.template_id) {
          const active = templates.find(t => t.id === profile.template_id);
          setActiveTemplateState(active || templates[0] || null);
        } else {
          setActiveTemplateState(templates[0] || null);
        }
      }
    } catch (error) {
      console.error('Error fetching template data:', error);
    } finally {
      setLoading(false);
    }
  };

  const setActiveTemplate = async (templateId: string) => {
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return;

      const { error } = await supabase
        .from('profiles')
        .update({ template_id: templateId })
        .eq('id', user.id);

      if (error) throw error;

      // Update local state
      const newActive = purchasedTemplates.find(t => t.id === templateId);
      if (newActive) {
        setActiveTemplateState(newActive);
      }
    } catch (error) {
      console.error('Error setting active template:', error);
      throw error;
    }
  };

  return {
    activeTemplate,
    purchasedTemplates,
    loading,
    setActiveTemplate,
  };
};
