export const SPANISH_PREFIX = "/es";

export const isSpanishPath = (pathname: string) => pathname === "/es" || pathname.startsWith("/es/");

/** Path without the /es prefix. */
export const stripLangPrefix = (pathname: string) =>
  isSpanishPath(pathname) ? pathname.slice(3) || "/" : pathname;

/** Path for a given language (only Spanish uses a URL prefix). */
export const pathForLang = (pathname: string, lng: string) => {
  const base = stripLangPrefix(pathname);
  return lng === "es" ? (base === "/" ? "/es" : `/es${base}`) : base;
};

/** BCP-47 locale for Intl/date formatting. */
export const localeFor = (lng: string) => (lng?.startsWith("es") ? "es-MX" : lng?.startsWith("uk") ? "uk-UA" : "en-GB");
