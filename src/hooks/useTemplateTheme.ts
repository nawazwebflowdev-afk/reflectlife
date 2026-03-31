import { useEffect, useState, useCallback } from "react";
import { supabase } from "@/integrations/supabase/client";

interface ColorPalette {
  primary: string;
  secondary: string;
  accent: string;
  background: string;
  foreground: string;
}

interface TemplateTheme {
  backgroundUrl: string | null;
  templateName: string | null;
  colorPalette: ColorPalette | null;
  fontFamily: string | null;
  fontHeading: string | null;
  layoutStyle: string;
  accentColor: string;
  isLoading: boolean;
}

const DEFAULT_THEME: TemplateTheme = {
  backgroundUrl: null,
  templateName: null,
  colorPalette: null,
  fontFamily: null,
  fontHeading: null,
  layoutStyle: "classic",
  accentColor: "hsl(var(--primary))",
  isLoading: true,
};

// Google Fonts loader — injects a <link> once per font
const loadedFonts = new Set<string>();
const loadGoogleFont = (font: string) => {
  if (!font || loadedFonts.has(font)) return;
  loadedFonts.add(font);
  const link = document.createElement("link");
  link.rel = "stylesheet";
  link.href = `https://fonts.googleapis.com/css2?family=${encodeURIComponent(font)}:wght@400;600;700&display=swap`;
  document.head.appendChild(link);
};

export const useTemplateTheme = (templateIdOverride?: string | null) => {
  const [theme, setTheme] = useState<TemplateTheme>(DEFAULT_THEME);

  const applyThemeToDOM = useCallback((t: TemplateTheme) => {
    const root = document.documentElement;

    if (t.colorPalette) {
      root.style.setProperty("--template-primary", t.colorPalette.primary);
      root.style.setProperty("--template-secondary", t.colorPalette.secondary);
      root.style.setProperty("--template-accent", t.colorPalette.accent);
      root.style.setProperty("--template-background", t.colorPalette.background);
      root.style.setProperty("--template-foreground", t.colorPalette.foreground);
    } else {
      root.style.removeProperty("--template-primary");
      root.style.removeProperty("--template-secondary");
      root.style.removeProperty("--template-accent");
      root.style.removeProperty("--template-background");
      root.style.removeProperty("--template-foreground");
    }

    if (t.fontFamily) {
      loadGoogleFont(t.fontFamily);
      root.style.setProperty("--template-font-body", `"${t.fontFamily}", serif`);
    } else {
      root.style.removeProperty("--template-font-body");
    }

    if (t.fontHeading) {
      loadGoogleFont(t.fontHeading);
      root.style.setProperty("--template-font-heading", `"${t.fontHeading}", serif`);
    } else {
      root.style.removeProperty("--template-font-heading");
    }

    root.setAttribute("data-template-layout", t.layoutStyle);
  }, []);

  useEffect(() => {
    fetchTemplateTheme();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [templateIdOverride]);

  const fetchTemplateTheme = async () => {
    try {
      let templateId = templateIdOverride;

      if (!templateId) {
        const { data: { session } } = await supabase.auth.getSession();
        if (!session?.user) {
          setTheme({ ...DEFAULT_THEME, isLoading: false });
          return;
        }

        const { data: profile } = await supabase
          .from("profiles")
          .select("template_id")
          .eq("id", session.user.id)
          .single();

        templateId = profile?.template_id ?? null;
      }

      if (!templateId) {
        setTheme({ ...DEFAULT_THEME, isLoading: false });
        return;
      }

      const { data: template } = await supabase
        .from("site_templates")
        .select("name, preview_url, color_palette, font_family, font_heading, layout_style")
        .eq("id", templateId)
        .single();

      if (template) {
        const palette = (template as any).color_palette as ColorPalette | null;
        const newTheme: TemplateTheme = {
          backgroundUrl: template.preview_url,
          templateName: template.name,
          colorPalette: palette && typeof palette === "object" && palette.primary ? palette : null,
          fontFamily: (template as any).font_family || null,
          fontHeading: (template as any).font_heading || null,
          layoutStyle: (template as any).layout_style || "classic",
          isLoading: false,
        };
        setTheme(newTheme);
        applyThemeToDOM(newTheme);
      } else {
        setTheme({ ...DEFAULT_THEME, isLoading: false });
      }
    } catch (error) {
      console.error("Error fetching template theme:", error);
      setTheme({ ...DEFAULT_THEME, isLoading: false });
    }
  };

  // Cleanup on unmount
  useEffect(() => {
    return () => {
      const root = document.documentElement;
      root.style.removeProperty("--template-primary");
      root.style.removeProperty("--template-secondary");
      root.style.removeProperty("--template-accent");
      root.style.removeProperty("--template-background");
      root.style.removeProperty("--template-foreground");
      root.style.removeProperty("--template-font-body");
      root.style.removeProperty("--template-font-heading");
      root.removeAttribute("data-template-layout");
    };
  }, []);

  return theme;
};
