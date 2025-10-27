import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";

interface TemplateTheme {
  backgroundUrl: string | null;
  templateName: string | null;
  accentColor: string;
  isLoading: boolean;
}

export const useTemplateTheme = () => {
  const [theme, setTheme] = useState<TemplateTheme>({
    backgroundUrl: null,
    templateName: null,
    accentColor: "hsl(var(--primary))",
    isLoading: true,
  });

  useEffect(() => {
    fetchTemplateTheme();
  }, []);

  const fetchTemplateTheme = async () => {
    try {
      // Get current user
      const { data: { session } } = await supabase.auth.getSession();
      if (!session?.user) {
        setTheme(prev => ({ ...prev, isLoading: false }));
        return;
      }

      // Fetch user's profile
      const { data: profile } = await supabase
        .from("profiles")
        .select("template_id")
        .eq("id", session.user.id)
        .single();

      if (!profile?.template_id) {
        setTheme(prev => ({ ...prev, isLoading: false }));
        return;
      }

      // Fetch template details
      const { data: template } = await supabase
        .from("site_templates")
        .select("name, preview_url")
        .eq("id", profile.template_id)
        .single();

      if (template) {
        // Generate accent color from template name (simplified approach)
        const accentColor = generateAccentFromName(template.name);
        
        setTheme({
          backgroundUrl: template.preview_url,
          templateName: template.name,
          accentColor,
          isLoading: false,
        });
      } else {
        setTheme(prev => ({ ...prev, isLoading: false }));
      }
    } catch (error) {
      console.error("Error fetching template theme:", error);
      setTheme(prev => ({ ...prev, isLoading: false }));
    }
  };

  return theme;
};

// Generate a soft accent color based on template name
const generateAccentFromName = (name: string): string => {
  const colors = {
    "England": "hsl(220, 70%, 50%)", // Blue
    "Mexico": "hsl(340, 75%, 55%)", // Pink/Magenta
    "India": "hsl(30, 80%, 50%)", // Orange
    "Australia": "hsl(180, 60%, 45%)", // Teal
    "Israel": "hsl(200, 70%, 50%)", // Sky Blue
    "Morocco": "hsl(260, 70%, 55%)", // Purple
    "Tanzania": "hsl(350, 70%, 50%)", // Red
    "Thailand": "hsl(45, 80%, 55%)", // Gold
    "Ukraine": "hsl(210, 80%, 60%)", // Bright Blue
    "USA": "hsl(220, 80%, 55%)", // Patriotic Blue
  };

  // Find matching color or return default
  for (const [country, color] of Object.entries(colors)) {
    if (name.includes(country)) {
      return color;
    }
  }

  return "hsl(var(--primary))";
};
