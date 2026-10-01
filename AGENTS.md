# Project architecture rules

- Memorial URLs accept either a UUID or a unique Latin slug so existing links remain valid while new links are readable.
- Guest candle writes go only through Edge Functions; client database access is read-only except owner hide controls.
- Memorial milestone emails use a dedicated idempotent delivery ledger because recurring date notifications must never duplicate.
- UI text goes through `tr("a.<hash>")` (src/i18n/tr.ts) or `t()` keys; English source strings live in src/i18n/auto/en.json with matching es.json, because all languages must stay complete.
- Prefixed languages are served under their URL prefix via BrowserRouter basename, and switching language reloads the page, because text prepared at load time must re-evaluate.
- Dates are formatted through src/lib/dateFormat.ts so they follow the active language.
- Prefixed languages (currently es, de) are listed once in src/i18n/langPath.ts; routing, hreflang and redirects derive from it.
