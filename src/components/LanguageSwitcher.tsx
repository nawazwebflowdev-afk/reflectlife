import { useTranslation } from "react-i18next";
import { Globe } from "lucide-react";
import { Button } from "@/components/ui/button";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { supabase } from "@/integrations/supabase/client";
import { useEffect } from "react";
import { isSpanishPath, pathForLang } from "@/i18n/langPath";

import { tr } from "@/i18n/tr";
const languages = [
  { code: "en", label: tr("a.649df08a44"), flag: "🇬🇧" },
  { code: "uk", label: "Українська", flag: "🇺🇦" },
  { code: "es", label: tr("a.2001ca082b"), flag: "🇲🇽" },
];

// Full reload so every text (including text prepared at load time) switches language.
const goTo = (lng: string) => {
  const { pathname, search, hash } = window.location;
  window.location.assign(pathForLang(pathname, lng) + search + hash);
};

const LanguageSwitcher = () => {
  const { i18n } = useTranslation();

  // On mount, try to load language from profile for logged-in users
  useEffect(() => {
    const loadProfileLanguage = async () => {
      const { data: { session } } = await supabase.auth.getSession();
      if (session?.user) {
        const { data } = await supabase
          .from("profiles")
          .select("preferred_language")
          .eq("id", session.user.id)
          .single();
        // An explicit /es URL wins over the saved profile language.
        if (data?.preferred_language && data.preferred_language !== i18n.language && !isSpanishPath(window.location.pathname)) {
          localStorage.setItem("reflectlife-lang", data.preferred_language);
          if (data.preferred_language === "es") goTo("es"); else i18n.changeLanguage(data.preferred_language);
        }
      }
    };
    loadProfileLanguage();
  }, []);

  const changeLanguage = async (lng: string) => {
    localStorage.setItem("reflectlife-lang", lng);

    // Save to profile if logged in
    const { data: { session } } = await supabase.auth.getSession();
    if (session?.user) {
      await supabase
        .from("profiles")
        .update({ preferred_language: lng })
        .eq("id", session.user.id);
    }
    goTo(lng);
  };

  const currentLang = languages.find((l) => i18n.language.startsWith(l.code)) || languages[0];

  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <Button variant="ghost" size="sm" className="gap-1.5 px-2">
          <Globe className="h-4 w-4" />
          <span className="text-sm">{currentLang.flag}</span>
        </Button>
      </DropdownMenuTrigger>
      <DropdownMenuContent align="end" className="min-w-[140px]">
        {languages.map((lang) => (
          <DropdownMenuItem
            key={lang.code}
            onClick={() => changeLanguage(lang.code)}
            className={i18n.language.startsWith(lang.code) ? "bg-accent" : ""}
          >
            <span className="mr-2">{lang.flag}</span>
            {lang.label}
          </DropdownMenuItem>
        ))}
      </DropdownMenuContent>
    </DropdownMenu>
  );
};

export default LanguageSwitcher;
