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
  createRoot(document.getElementById("root")!).render(<App />);
}
