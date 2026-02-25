import { useState, useEffect } from "react";
import { supabase } from "@/integrations/supabase/client";

interface Template {
  id: string;
  name: string;
  preview_url: string | null;
}

type PageType = "tree" | "timeline";

const columnMap: Record<PageType, string> = {
  tree: "tree_template_id",
  timeline: "timeline_template_id",
};

export const usePageTemplate = (page: PageType) => {
  const [backgroundUrl, setBackgroundUrl] = useState<string | null>(null);
  const [activeTemplateId, setActiveTemplateId] = useState<string | null>(null);
  const [purchasedTemplates, setPurchasedTemplates] = useState<Template[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetchData();

    const { data: { subscription } } = supabase.auth.onAuthStateChange(() => {
      fetchData();
    });

    return () => subscription.unsubscribe();
  }, [page]);

  const fetchData = async () => {
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) { setLoading(false); return; }

      const col = columnMap[page];

      // Fetch profile's page-specific template and fallback global template
      const { data: profile } = await supabase
        .from("profiles")
        .select("*")
        .eq("id", user.id)
        .maybeSingle();

      // Fetch purchased templates
      const { data: purchases } = await supabase
        .from("template_purchases")
        .select(`template_id, site_templates:template_id (id, name, preview_url)`)
        .eq("buyer_id", user.id)
        .eq("payment_status", "succeeded");

      // Also fetch free templates
      const { data: freeTemplates } = await supabase
        .from("site_templates")
        .select("id, name, preview_url")
        .eq("is_free", true);

      const purchased: Template[] = (purchases as any[] || [])
        .flatMap((p: any) => {
          const t = p?.site_templates;
          if (!t) return [];
          return Array.isArray(t) ? t : [t];
        })
        .filter(Boolean)
        .map((t: any) => ({ id: String(t.id), name: String(t.name), preview_url: t.preview_url ?? null }));

      const free: Template[] = (freeTemplates || []).map((t: any) => ({
        id: String(t.id), name: String(t.name), preview_url: t.preview_url ?? null,
      }));

      // Merge without duplicates
      const allTemplates = [...purchased];
      free.forEach(ft => {
        if (!allTemplates.find(t => t.id === ft.id)) allTemplates.push(ft);
      });

      setPurchasedTemplates(allTemplates);

      // Determine active template: page-specific > global > none
      const profileAny = profile as any;
      const pageTemplateId = profileAny?.[col] || null;
      const templateId = pageTemplateId || profileAny?.template_id || null;
      setActiveTemplateId(pageTemplateId);

      if (templateId) {
        const tmpl = allTemplates.find(t => t.id === templateId);
        if (tmpl?.preview_url) {
          setBackgroundUrl(tmpl.preview_url);
        } else {
          // Fetch directly if not in purchased list
          const { data: template } = await supabase
            .from("site_templates")
            .select("preview_url")
            .eq("id", templateId)
            .maybeSingle();
          if (template?.preview_url) setBackgroundUrl(template.preview_url);
        }
      }
    } catch (error) {
      console.error("Error fetching page template:", error);
    } finally {
      setLoading(false);
    }
  };

  const setPageTemplate = async (templateId: string | null) => {
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return;

      const col = columnMap[page];
      const { error } = await supabase
        .from("profiles")
        .update({ [col]: templateId } as any)
        .eq("id", user.id);

      if (error) throw error;

      setActiveTemplateId(templateId);
      if (templateId) {
        const tmpl = purchasedTemplates.find(t => t.id === templateId);
        setBackgroundUrl(tmpl?.preview_url || null);
      } else {
        setBackgroundUrl(null);
      }
    } catch (error) {
      console.error("Error setting page template:", error);
      throw error;
    }
  };

  return { backgroundUrl, activeTemplateId, purchasedTemplates, loading, setPageTemplate };
};
