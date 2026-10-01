import { format as dfFormat, formatDistanceToNow as dfDistance } from "date-fns";
import { es, uk, enGB } from "date-fns/locale";
import i18n from "@/i18n";
import { localeFor } from "@/i18n/langPath";

const lang = () => (i18n.language || "en").slice(0, 2);
const dfLocale = () => (lang() === "es" ? es : lang() === "uk" ? uk : enGB);

// Spanish long dates read "1 de noviembre de 2026".
const ES_PATTERNS: Record<string, string> = {
  PPP: "d 'de' MMMM 'de' yyyy",
  "MMMM d, yyyy": "d 'de' MMMM 'de' yyyy",
  "d MMMM yyyy": "d 'de' MMMM 'de' yyyy",
  "EEEE d MMMM yyyy": "EEEE d 'de' MMMM 'de' yyyy",
  "EEEE, d MMMM": "EEEE, d 'de' MMMM",
  "MMM d": "d MMM",
  "MMM yyyy": "MMM yyyy",
};

/** date-fns format that follows the active site language. */
export const format = (date: Date | number, pattern: string, options: Parameters<typeof dfFormat>[2] = {}) =>
  dfFormat(date, lang() === "es" ? ES_PATTERNS[pattern] ?? pattern : pattern, { locale: dfLocale(), ...options });

export const formatDistanceToNow = (date: Date | number, options: Parameters<typeof dfDistance>[1] = {}) =>
  dfDistance(date, { locale: dfLocale(), ...options });

/** Long, language-aware date, e.g. "1 de noviembre de 2026" / "1 November 2026". */
export const formatDate = (value: string | number | Date | null | undefined) => {
  if (value === null || value === undefined || value === "") return "";
  const d = value instanceof Date ? value : new Date(value);
  if (Number.isNaN(d.getTime())) return "";
  return new Intl.DateTimeFormat(localeFor(i18n.language), { day: "numeric", month: "long", year: "numeric" }).format(d);
};

export const appLocale = () => localeFor(i18n.language);
