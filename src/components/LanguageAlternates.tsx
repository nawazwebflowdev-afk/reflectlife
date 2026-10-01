import { Helmet } from "react-helmet-async";
import { useLocation } from "react-router-dom";
import { useTranslation } from "react-i18next";

const SITE = "https://reflectlife.net";

/** hreflang alternates for every page: English/Ukrainian share the base URL, Spanish uses /es. */
const LanguageAlternates = () => {
  const { pathname } = useLocation(); // already without the /es basename
  const { i18n } = useTranslation();
  const base = pathname === "/" ? "" : pathname;
  const en = `${SITE}${base || "/"}`;
  const es = `${SITE}/es${base}`;
  const lang = i18n.language.startsWith("es") ? "es" : i18n.language.startsWith("uk") ? "uk" : "en";
  return (
    <Helmet htmlAttributes={{ lang }}>
      <link rel="alternate" hrefLang="en" href={en} />
      <link rel="alternate" hrefLang="uk" href={en} />
      <link rel="alternate" hrefLang="es" href={es} />
      <link rel="alternate" hrefLang="es-MX" href={es} />
      <link rel="alternate" hrefLang="x-default" href={en} />
      <link rel="canonical" href={lang === "es" ? es : en} />
      <meta property="og:locale" content={lang === "es" ? "es_MX" : lang === "uk" ? "uk_UA" : "en_GB"} />
    </Helmet>
  );
};

export default LanguageAlternates;
