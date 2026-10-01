# Roadmap

## In progress
- Per-route titles/descriptions via react-helmet-async — done.
- SEO part 1: audit+fixes, prerender check, robots disallows + AI bots, DB-driven sitemap (static x4 langs, blog, opted-in memorials), H1/title<60/desc<155/canonical/hreflang per page, memorial title format, short Latin URLs + 301s, 4-language 404.
- SEO part 2: owner "Let people find this memorial on Google" (default off, noindex), JSON-LD (Org, WebSite, Article, Breadcrumb, FAQ, ProfilePage/Person), WebP ≤1600px uploads, lazy images w/ dimensions, alt text, CWV/preload/splitting/caching + PageSpeed before/after, memorial footer → guides, homepage 4 newest articles.
- SEO part 3: Impressum/Legal notice (placeholder details), About in 4 langs, "What is Reflectlife" + 8 FAQ, blog "Things to know" /[lang]/blog, use-case landing template + 8 pages, seasonal URLs without year.
- JSON-LD Organization + WebSite on home page — done.
- Sitemap: add /examples and /pricing (pages do not exist yet) — done.
- Stripe Connect donations (full spec received, parts 1–3): Express + destination charges, 7% admin setting (defender 0%), owner switch-on, recipient types, onboarding link by email, waiting state, external link fallback, test mode badge, guest Checkout 10/25/50/100/custom min 5, cover-fees, name/message/anonymous, thank-you page, webhook-only recording, memorial section, optional totals, donor list, charity note, report link, owner dashboard + CSV, admin page + pause, 4 languages.
- German (de) translation: done; deploy German reminder email.
- Guest candles: production lighting awaits the public reCAPTCHA site key; all other requested behavior is implemented.
- Memory Wall reminder: add a "Once" (one-time) frequency option to the reminder popup,
  with recipients reachable by email or SMS/phone, E.164 + email validation, and a
  one-time scheduled dispatch that fires exactly once at the chosen date and time.

## Done
- Donations parts 1–3 (Stripe Connect, checkout, webhook, memorial section, owner/admin dashboards, 4 languages) — awaiting Stripe keys from user.
- Ukrainian memorial experience: native Ukrainian sharing and landing page; remembrance-date emails; Defender of Ukraine memorial type; Cyrillic-safe Latin slugs.
- Guest candles: seven-day guest candles, optional 40-character name, atomic daily device/network limit, invisible captcha integration, owner moderation/off switch, prior-candle archive, conversion tracking, and post-lighting actions. Defender memorials receive all candle durations free.
- Reminder popup: interactive date picker calendar, custom message field,
  phonebook import + manual phone recipients (pill list), stored in the backend and
  dispatched via SMS/WhatsApp at the scheduled time.

## Memorial donations (new)
- [x] "Donate in Memory" button left of Reminder on the memory wall
- [x] Donation modal (designed in-house), private 2.5% / company 3.0% fees, Stripe one-time + monthly
- [x] Tables memorial_campaigns + memorial_donations
- [x] Terms & Conditions page at /terms with donation chapter (drafted — replace with official wording if supplied)
- [ ] Charity/organizer payout dashboard + Stripe Connect payouts (not started — awaiting payout model decision)

- DONE (owner view untested: needs owner sign-in in preview) Memorial layout: remove Remembrance dates card, merge 9th/40th/anniversary checkboxes + email-me into Set Time to Remember dialog, show next upcoming reminder; Donations card in its place.

## New batch (Oct 1)
- [x] Invite family step after memorial creation + in settings, tracked
- [x] Owner emails: new memory awaiting approval (instant), weekly summary, opt-out
- [x] Privacy: Public / Link-only / Private; Download my data ZIP; Delete account
- [x] Analytics: Plausible + 6 events
- [x] Ofrenda (Día de Muertos) memorial theme
- Co-managers (max 5, roles, activity list, notifications)
- Legacy contact (accept by email, 12-month inactivity reminders, admin-approved handover, ownership transfer with email confirmation; Stripe never transferred)
- Funeral home accounts (admin approval, create+hand over memorials, discreet credit line, dashboard, QR card, no donation data)
- Printed memory book (builder, preview, paid PDF EUR9 / softcover EUR39 via Stripe Checkout, print-on-demand API, 300dpi warnings, status emails)
