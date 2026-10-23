import { createRoot } from "react-dom/client";
import i18n from "./i18n";
import { langFromPath, pathForLang } from "./i18n/langPath";
import App from "./App.tsx";
import "./index.css";

// Keep the URL and language in sync: Spanish/German visitors always see their prefixed URLs.
const { pathname, search, hash } = window.location;
const lang = i18n.language.slice(0, 2);
const wanted = pathForLang(pathname, lang);
if ((lang === "es" || lang === "de") && langFromPath(pathname) !== lang && !pathname.startsWith("/.lovable")) {
  window.location.replace(wanted + search + hash);
} else {
  // Prerendered pages ship static canonical/hreflang links for no-JS crawlers; Helmet re-adds
  // them dynamically, so remove the static copies to avoid duplicates once JS runs.
  document
    .querySelectorAll('link[rel="canonical"], link[rel="alternate"]')
    .forEach((el) => el.remove());
  createRoot(document.getElementById("root")!).render(<App />);
}
