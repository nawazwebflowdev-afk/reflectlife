# Roadmap

## In progress
- Stripe Connect donations (full spec received, parts 1–3): Express + destination charges, 7% admin setting (defender 0%), owner switch-on, recipient types, onboarding link by email, waiting state, external link fallback, test mode badge, guest Checkout 10/25/50/100/custom min 5, cover-fees, name/message/anonymous, thank-you page, webhook-only recording, memorial section, optional totals, donor list, charity note, report link, owner dashboard + CSV, admin page + pause, 4 languages.
- German (de) translation: done; deploy German reminder email.
- Guest candles: production lighting awaits the public reCAPTCHA site key; all other requested behavior is implemented.
- Memory Wall reminder: add a "Once" (one-time) frequency option to the reminder popup,
  with recipients reachable by email or SMS/phone, E.164 + email validation, and a
  one-time scheduled dispatch that fires exactly once at the chosen date and time.

## Done
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
