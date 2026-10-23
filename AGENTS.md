# Project architecture rules

- Memorial URLs accept either a UUID or a unique Latin slug so existing links remain valid while new links are readable.
- Guest candle writes go only through Edge Functions; client database access is read-only except owner hide controls.
- Memorial milestone emails use a dedicated idempotent delivery ledger because recurring date notifications must never duplicate.
- UI text goes through `tr("a.<hash>")` (src/i18n/tr.ts) or `t()` keys; English source strings live in src/i18n/auto/en.json with matching es.json, because all languages must stay complete.
- Prefixed languages are served under their URL prefix via BrowserRouter basename, and switching language reloads the page, because text prepared at load time must re-evaluate.
- Dates are formatted through src/lib/dateFormat.ts so they follow the active language.
- Prefixed languages (currently es, de) are listed once in src/i18n/langPath.ts; routing, hreflang and redirects derive from it.
- Memorial donations use Stripe Connect Express destination charges with a separate donations Stripe key, and are recorded only by the signed `fundraiser-webhook`, because Reflectlife must never hold or self-report donated money.
- Keep the homepage route eager and lazy-load all other pages plus below-fold homepage features, because the first mobile download must remain small.
- Info Board content (info_items/info_pages) is editable only by admin-role users and media is stored under the admin's own folder in the existing public uploads bucket, because new public buckets are blocked for this workspace.
- The Info Board (info_items) is the only editorial content section; legacy /stories URLs redirect to /info, because one content system avoids duplicate admin and SEO surfaces.
- Public marketing routes (home, /memorials, /examples, /pricing, /about, /qa in en/es/de) are prerendered by scripts/prerender.ts (runs in the build script after vite build) into dist/<route>/index.html with real text from the i18n resources, per-route title/description/canonical/hreflang and lang attribute, because crawlers must see real HTML without JS. src/main.tsx removes the static canonical/alternate links on boot so Helmet (LanguageAlternates) owns them at runtime; pageMeta.ts holds per-route titles/descriptions and must be extended for every new public route.
