import { Helmet } from "react-helmet-async";
import { useLocation } from "react-router-dom";
import { useTranslation } from "react-i18next";
import { pageMeta } from "@/i18n/pageMeta";

const SITE = "https://reflectlife.net";

/** hreflang alternates for every page: English/Ukrainian share the base URL, Spanish uses /es, German /de. */
const LanguageAlternates = () => {
  const { pathname } = useLocation(); // already without the /es basename
  const { i18n } = useTranslation();
  const isImprint = ["/imprint", "/impressum", "/aviso-legal"].includes(pathname);
  const base = pathname === "/" ? "" : pathname;
  const en = isImprint ? `${SITE}/imprint` : `${SITE}${base || "/"}`;
  const es = isImprint ? `${SITE}/es/aviso-legal` : `${SITE}/es${base}`;
  const de = isImprint ? `${SITE}/de/impressum` : `${SITE}/de${base}`;
  const lang = i18n.language.startsWith("es") ? "es" : i18n.language.startsWith("de") ? "de" : i18n.language.startsWith("uk") ? "uk" : "en";
  const meta = pageMeta(pathname, lang);
  const self = lang === "es" ? es : lang === "de" ? de : en;
  return (
    <Helmet htmlAttributes={{ lang }}>
      <title>{meta.title}</title>
      <meta name="description" content={meta.description} />
      <meta property="og:title" content={meta.title} />
      <meta property="og:description" content={meta.description} />
      <meta property="og:url" content={self} />
      <meta name="twitter:title" content={meta.title} />
      <meta name="twitter:description" content={meta.description} />
      <link rel="alternate" hrefLang="en" href={en} />
      <link rel="alternate" hrefLang="uk" href={en} />
      <link rel="alternate" hrefLang="es" href={es} />
      <link rel="alternate" hrefLang="es-MX" href={es} />
      <link rel="alternate" hrefLang="de" href={de} />
      <link rel="alternate" hrefLang="x-default" href={en} />
      <link rel="canonical" href={self} />
      <meta property="og:locale" content={lang === "es" ? "es_MX" : lang === "de" ? "de_DE" : lang === "uk" ? "uk_UA" : "en_GB"} />
    </Helmet>
  );
};

export default LanguageAlternates;
