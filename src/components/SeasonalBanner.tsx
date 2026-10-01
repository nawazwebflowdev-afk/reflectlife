import { Link } from "react-router-dom";
import { useTranslation } from "react-i18next";
import { Flame } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { useEffect, useState } from "react";

/** German remembrance season (Allerheiligen, Volkstrauertag, Totensonntag): 25 Oct – 22 Nov. */
const inGermanSeason = (d = new Date()) => {
  const m = d.getMonth() + 1, day = d.getDate();
  return (m === 10 && day >= 25) || (m === 11 && day <= 22);
};

const SeasonalBanner = () => {
  const { i18n } = useTranslation();
  const [signedIn, setSignedIn] = useState(false);
  useEffect(() => {
    supabase.auth.getSession().then(({ data }) => setSignedIn(!!data.session));
  }, []);
  if (!i18n.language.startsWith("de") || !inGermanSeason()) return null;
  return (
    <Link
      to={signedIn ? "/memorials" : "/signup"}
      className="flex items-center justify-center gap-2 bg-secondary px-4 py-2 text-sm font-medium text-secondary-foreground hover:bg-secondary/80"
    >
      <Flame className="h-4 w-4 text-primary" />
      <span>Erinnerungen, die bleiben.</span>
      <span className="underline underline-offset-4">Gedenkseite erstellen</span>
    </Link>
  );
};

export default SeasonalBanner;
