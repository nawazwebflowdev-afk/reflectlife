import i18n from "i18next";
import { initReactI18next } from "react-i18next";
import LanguageDetector from "i18next-browser-languagedetector";
import en from "./en";
import uk from "./uk";
import es from "./es";
import autoEn from "./auto/en.json";
import autoEs from "./auto/es.json";
import { isSpanishPath } from "./langPath";

// Spanish lives under the /es URL prefix; the URL always wins over stored preference.
const pathDetector = {
  name: "pathPrefix",
  lookup: () => (typeof window !== "undefined" && isSpanishPath(window.location.pathname) ? "es" : undefined),
};
const detector = new LanguageDetector();
detector.addDetector(pathDetector);

i18n
  .use(detector)
  .use(initReactI18next)
  .init({
    resources: {
      en: { translation: { ...en, a: autoEn } },
      uk: { translation: { ...uk } },
      es: { translation: { ...es, a: autoEs } },
    },
    fallbackLng: "en",
    supportedLngs: ["en", "uk", "es"],
    interpolation: { escapeValue: false },
    detection: {
      order: ["pathPrefix", "localStorage", "navigator"],
      lookupLocalStorage: "reflectlife-lang",
      caches: ["localStorage"],
    },
  });

if (typeof document !== "undefined") document.documentElement.lang = i18n.language;

export default i18n;
