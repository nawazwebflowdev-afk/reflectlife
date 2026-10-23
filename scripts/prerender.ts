// Static prerender: after `vite build`, writes per-route index.html files whose #root already
// contains the page's real text (H1, headings, paragraphs) plus per-route <title>, meta
// description, canonical and hreflang links — so crawlers see real HTML without executing JS.
// When the SPA boots, React replaces #root and src/main.tsx removes the static canonical/
// alternate links (Helmet re-adds them dynamically), so nothing is duplicated.
// Text is read from the same i18n resources the app renders, so it cannot drift from the pages.

import { readFileSync, writeFileSync, mkdirSync } from "fs";
import { resolve, dirname } from "path";
import { fileURLToPath } from "url";
import en from "../src/i18n/en";
import es from "../src/i18n/es";
import de from "../src/i18n/de";
import { pageMeta } from "../src/i18n/pageMeta";

const SITE = "https://reflectlife.net";
const ROOT = resolve(dirname(fileURLToPath(import.meta.url)), "..");

const auto = (lang: string): Record<string, string> =>
  JSON.parse(readFileSync(resolve(ROOT, `src/i18n/auto/${lang}.json`), "utf8"));

const esc = (s: string) =>
  s.replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;");
const escAttr = (s: string) => esc(s).replace(/"/g, "&quot;");

type Res = typeof en;
const resources: Record<string, Res> = { en, es, de };
const autos: Record<string, Record<string, string>> = {
  en: auto("en"),
  es: auto("es"),
  de: auto("de"),
};

interface Crumb {
  path: string; // base path without language prefix, "" for home
  label: (r: Res, a: Record<string, string>) => string;
}

const NAV: Crumb[] = [
  { path: "", label: (r) => r.nav.home },
  { path: "memorials", label: (r, a) => a["a86506f38a"] },
  { path: "examples", label: (r) => r.examples.title },
  { path: "pricing", label: (r) => r.pricing.title },
  { path: "about", label: (r) => r.about.title },
  { path: "qa", label: (r) => r.footer.qa },
];

const prefix = (lang: string, base: string) =>
  (lang === "en" ? "" : `/${lang}`) + (base ? `/${base}` : "");

/** Real page text per route, rendered as semantic HTML into #root. */
function bodyHtml(lang: string, base: string): string {
  const r = resources[lang];
  const a = autos[lang];
  switch (base) {
    case "":
      return `
  <h1>${esc(r.landing.heroTitle)}</h1>
  <p>${esc(r.landing.heroSubtitle)}</p>
  <h2>${esc(r.landing.howItWorksTitle)}</h2>
  <p>${esc(r.landing.howItWorksDesc)}</p>
  <h2>${esc(a["0bfb9d7153"])}</h2><p>${esc(a["1c75545e20"])}</p>
  <h2>${esc(a["8cce2bbe38"])}</h2><p>${esc(a["8c3e837e1a"])}</p>
  <h2>${esc(a["1586899420"])}</h2><p>${esc(a["70bb4ce3ea"])}</p>
  <h2>${esc(a["f2d98ec797"])}</h2><p>${esc(a["713df6bec9"])}</p>
  <h2>${esc(r.landing.memorialWallTitle)}</h2>
  <p>${esc(r.landing.memorialWallDesc)}</p>`;
    case "memorials":
      return `
  <h1>${esc(a["a86506f38a"])}</h1>
  <p>${esc(a["7dc46766c3"])}</p>`;
    case "examples":
      return `
  <h1>${esc(r.examples.title)}</h1>
  <p>${esc(r.examples.subtitle)}</p>
  <h2>${esc(r.examples.candleTitle)}</h2><p>${esc(r.examples.candleText)}</p>
  <h2>${esc(r.examples.galleryTitle)}</h2><p>${esc(r.examples.galleryText)}</p>
  <h2>${esc(r.examples.timelineTitle)}</h2><p>${esc(r.examples.timelineText)}</p>
  <h2>${esc(r.examples.treeTitle)}</h2><p>${esc(r.examples.treeText)}</p>`;
    case "pricing":
      return `
  <h1>${esc(r.pricing.title)}</h1>
  <p>${esc(r.pricing.subtitle)}</p>
  <h2>${esc(r.pricing.memorialTitle)} — ${esc(r.pricing.memorialPrice)}</h2><p>${esc(r.pricing.memorialDesc)}</p>
  <h2>${esc(r.pricing.candlesTitle)}</h2><p>${esc(r.pricing.candlesDesc)}</p>
  <ul><li>${esc(r.pricing.candleFree)}</li><li>${esc(r.pricing.candleMonthly)}</li><li>${esc(r.pricing.candleYearly)}</li></ul>
  <h2>${esc(r.pricing.templatesTitle)} — ${esc(r.pricing.templatesPrice)}</h2><p>${esc(r.pricing.templatesDesc)}</p>
  <h2>${esc(r.pricing.donationsTitle)}</h2><p>${esc(r.pricing.donationsDesc)}</p>
  <p>${esc(r.pricing.note)}</p>`;
    case "about":
      return `
  <h1>${esc(r.about.title)}</h1>
  <p>${esc(r.about.intro1)}</p>
  <p>${esc(r.about.intro2)}</p>
  <p>${esc(r.about.feature1)}</p>
  <p>${esc(r.about.feature2)}</p>
  <p>${esc(r.about.feature3)}</p>
  <p>${esc(r.about.feature4)}</p>
  <p>${esc(r.about.control)}</p>
  <p>${esc(r.about.connection)}</p>
  <p>${esc(r.about.purpose)}</p>
  <p>${esc(r.about.closing1)}</p>
  <p>${esc(r.about.closing2)}</p>`;
    case "qa": {
      const items = Array.from({ length: 10 }, (_, i) => {
        const n = i + 1;
        return `  <h2>${esc(r.qa[`q${n}` as keyof typeof r.qa])}</h2><p>${esc(
          r.qa[`a${n}` as keyof typeof r.qa],
        )}</p>`;
      }).join("\n");
      return `
  <h1>${esc(r.qa.title)}</h1>
  <p>${esc(r.qa.subtitle)}</p>
${items}`;
    }
    default:
      return "";
  }
}

function prerender(lang: string, base: string, template: string) {
  const r = resources[lang];
  const a = autos[lang];
  const meta = pageMeta(base ? `/${base}` : "/", lang);
  const self = `${SITE}${prefix(lang, base) || "/"}`;

  const alternates = ["en", "es", "de"]
    .map(
      (l) =>
        `    <link rel="alternate" hreflang="${l}" href="${SITE}${prefix(l, base) || "/"}" />`,
    )
    .concat(`    <link rel="alternate" hreflang="x-default" href="${SITE}${prefix("en", base) || "/"}" />`)
    .join("\n");

  const nav = NAV.map(
    (c) => `      <li><a href="${prefix(lang, c.path) || "/"}">${esc(c.label(r, a))}</a></li>`,
  ).join("\n");

  const staticRoot = `<div id="root"><header><nav><ul>
${nav}
    </ul></nav></header><main>${bodyHtml(lang, base)}
  </main><footer><p>${esc(r.footer.madeWith)} ${esc(r.footer.allRights)}</p></footer></div>`;

  let html = template;
  html = html.replace(/<html lang="[^"]*"/, `<html lang="${lang}"`);
  html = html.replace(/<title>[^<]*<\/title>/, `<title>${esc(meta.title)}</title>`);
  html = html.replace(
    /(<meta name="description" content=")[^"]*(")/,
    `$1${escAttr(meta.description)}$2`,
  );
  html = html.replace(/(<meta property="og:title" content=")[^"]*(")/, `$1${escAttr(meta.title)}$2`);
  html = html.replace(
    /(<meta property="og:description" content=")[^"]*(")/,
    `$1${escAttr(meta.description)}$2`,
  );
  html = html.replace(/(<meta property="og:url" content=")[^"]*(")/, `$1${escAttr(self)}$2`);
  html = html.replace(/(<meta name="twitter:title" content=")[^"]*(")/, `$1${escAttr(meta.title)}$2`);
  html = html.replace(
    /(<meta name="twitter:description" content=")[^"]*(")/,
    `$1${escAttr(meta.description)}$2`,
  );
  html = html.replace(
    "</head>",
    `    <link rel="canonical" href="${escAttr(self)}" />\n${alternates}\n  </head>`,
  );
  html = html.replace('<div id="root"></div>', staticRoot);

  const out = resolve(ROOT, "dist", lang === "en" ? "" : lang, base, "index.html");
  mkdirSync(dirname(out), { recursive: true });
  writeFileSync(out, html);
  return out;
}

const template = readFileSync(resolve(ROOT, "dist/index.html"), "utf8");
const bases = ["", "memorials", "examples", "pricing", "about", "qa"];
let count = 0;
for (const lang of ["en", "es", "de"]) {
  for (const base of bases) {
    prerender(lang, base, template);
    count++;
  }
}
console.log(`prerendered ${count} pages`);
