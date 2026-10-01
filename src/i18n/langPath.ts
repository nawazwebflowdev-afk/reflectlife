/** Languages served under their own URL prefix (e.g. /es, /de). English and Ukrainian use the base URL. */
export const PREFIXED_LANGS = ["es", "de"] as const;
export type PrefixedLang = (typeof PREFIXED_LANGS)[number];

/** Language encoded in the URL prefix, if any. */
export const langFromPath = (pathname: string): PrefixedLang | undefined =>
  PREFIXED_LANGS.find((l) => pathname === `/${l}` || pathname.startsWith(`/${l}/`));

export const isPrefixedPath = (pathname: string) => !!langFromPath(pathname);
export const isSpanishPath = (pathname: string) => langFromPath(pathname) === "es";

/** Path without any language prefix. */
export const stripLangPrefix = (pathname: string) => {
  const l = langFromPath(pathname);
  return l ? pathname.slice(l.length + 1) || "/" : pathname;
};

/** Path for a given language (only prefixed languages change the URL). */
export const pathForLang = (pathname: string, lng: string) => {
  const base = stripLangPrefix(pathname);
  const short = lng.slice(0, 2);
  if (!(PREFIXED_LANGS as readonly string[]).includes(short)) return base;
  return base === "/" ? `/${short}` : `/${short}${base}`;
};

/** BCP-47 locale for Intl/date formatting. */
export const localeFor = (lng: string) =>
  lng?.startsWith("es") ? "es-MX" : lng?.startsWith("de") ? "de-DE" : lng?.startsWith("uk") ? "uk-UA" : "en-GB";
