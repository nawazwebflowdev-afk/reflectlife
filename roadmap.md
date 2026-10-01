# Roadmap

## In progress
- Stripe Connect donations: Express recipient accounts with destination charges; guest Checkout; recipient-account currency; presets 10/25/50/100 and custom minimum 5; admin-configured 7% all-inclusive Reflectlife fee, 0% for Defender memorials; optional fee coverage. Remaining specification is pending because the latest message ended mid-sentence.
- Ukrainian memorial experience: native Ukrainian sharing and landing page; remembrance-date emails; Defender of Ukraine memorial type; Cyrillic-safe Latin slugs.
- Guest candles: free for 7 days, no login, optional 40-character name, no message/links, 3 per device/IP per memorial/day, invisible captcha, owner moderation/off switch, prior-candle archive, conversion tracking, and post-lighting inline actions. Defender memorials receive all candle types free.
- Memory Wall reminder: add a "Once" (one-time) frequency option to the reminder popup,
  with recipients reachable by email or SMS/phone, E.164 + email validation, and a
  one-time scheduled dispatch that fires exactly once at the chosen date and time.

## Done
- Reminder popup: interactive date picker calendar, custom message field,
  phonebook import + manual phone recipients (pill list), stored in the backend and
  dispatched via SMS/WhatsApp at the scheduled time.

## Memorial donations (new)
- [x] "Donate in Memory" button left of Reminder on the memory wall
- [x] Donation modal (designed in-house), private 2.5% / company 3.0% fees, Stripe one-time + monthly
- [x] Tables memorial_campaigns + memorial_donations
- [x] Terms & Conditions page at /terms with donation chapter (drafted — replace with official wording if supplied)
- [ ] Charity/organizer payout dashboard + Stripe Connect payouts (not started — awaiting payout model decision)
