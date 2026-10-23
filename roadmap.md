# Roadmap

## SEO: statisches Prerendering (2026-10-23)
- [x] Neue Seiten /examples und /pricing (Inhalt, Routen, Footer-Links, Sitemap)
- [x] Prerender-Skript scripts/prerender.ts: 18 statische HTML-Seiten mit echtem Text (/, /de, /es, /memorials, /examples, /pricing, /about, /qa je en/es/de)
- [x] Pro Seite: eigener <title>, meta description, H1, canonical auf https://reflectlife.net (pageMeta.ts um /examples, /pricing, /qa ergänzt)
- [x] lang="de" / lang="es" in statischen Dateien und zur Laufzeit
- [x] hreflang uk korrigiert (LanguageAlternates: uk nur noch auf /uk/pamiat als Selbstverweis); Sitemap um /examples + /pricing und lastmod 2026-10-23 für die geänderten Seiten ergänzt
- [ ] Nach dem Publish prüfen: Liefert das Hosting /de/pricing (ohne Slash) als statische Datei aus?

## Security: ausgewählte Scan-Befunde (2026-10-23, läuft)
- [ ] 20 ausgewählte Findings beheben: RLS-Leseregeln (10), Storage-Regeln (9), dompurify-Update (1)

## Offen aus früheren Aufgaben
- [ ] Veröffentlichen (Publish) steht noch aus — alle SEO-Änderungen werden erst dann live sichtbar
- [ ] Admin-UI /admin/info-board durch Sylvia im Browser prüfen (Sandbox kann keine Anmeldung)
- [ ] 55 bereits bestehende Sicherheitshinweise prüfen (wartet auf Freigabe)
- [ ] Co-Manager, Legacy-Kontakt, Bestatter-B2B, gedruckte Erinnerungsbücher (nicht umgesetzt)
