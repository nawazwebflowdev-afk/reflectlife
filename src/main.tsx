import { createRoot } from "react-dom/client";
import i18n from "./i18n";
import { isSpanishPath, pathForLang } from "./i18n/langPath";
import App from "./App.tsx";
import "./index.css";

// Keep the URL and language in sync: Spanish visitors always see /es URLs.
const { pathname, search, hash } = window.location;
if (i18n.language === "es" && !isSpanishPath(pathname) && !pathname.startsWith("/.lovable")) {
  window.location.replace(pathForLang(pathname, "es") + search + hash);
} else {
  createRoot(document.getElementById("root")!).render(<App />);
}
