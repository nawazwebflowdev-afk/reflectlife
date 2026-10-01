# Ukrainian Memorial Experience and Guest Candles

## Goal
Make Reflectlife feel native for Ukrainian families in Ukraine and abroad, while adding a respectful, abuse-resistant guest candle experience. Preserve the existing English experience and current paid candles outside Defender memorials.

## Ukrainian experience
- Add `/uk/pamiat` with original Ukrainian copy, three clear creation steps, selected public examples, and guidance for sharing with family in Ukraine and abroad.
- Add Ukrainian labels and messages for memorial actions, candle states, sharing, reminders, emails, and Defender memorials through the existing language system.
- Keep Cyrillic intact in names, stories, emails, and visible content. Add a deterministic Ukrainian-to-Latin slug generator (for example `Олена Коваленко` → `olena-kovalenko`) with collision-safe suffixes; old ID links continue working.
- Telegram and Viber remain alongside WhatsApp, Facebook, X, and copy link. Shared memorial links use Ukrainian wording when the page language is Ukrainian. Static social cards continue using the safe branded fallback until server-rendered per-memorial metadata is available.

## Guest candle experience
- Anyone can light a free guest candle without signing in. It burns for seven days, then appears in a compact “Lit earlier” history with the optional name and lighting date.
- Guest input is limited to an optional 40-character plain-text name. No dedication, URL, or rich-text field is accepted.
- Enforce three guest candles per device/IP, per memorial, per calendar day in the backend. Store only an irreversible hash of the device/IP key used for enforcement.
- Add invisible Cloudflare Turnstile verification. The public site key is used by the memorial page; the secret key is stored only for the candle function.
- After lighting, show an inline confirmation: “Your candle is lit for [name].” with “Share this memorial” and “Add a memory” actions; adding a memory requires sign-in.
- Add owner controls to disable future guest candles and hide individual candles. Hidden candles stay available to the owner but are removed from public lists.
- Keep monthly/yearly candles and make them visually brighter than guest candles, with the note “Keep a candle burning for a month or a year.”
- Track guest-candle conversion when a guest who lit a candle proceeds to sign up and completes registration.
- On Defender memorials, monthly and yearly candle durations are free; no Stripe checkout is used.

## Remembrance dates
- For memorials with a date of death, add an owner-only, opt-in remembrance-date panel. Every option is off by default.
- Offer the 9th day, 40th day, first anniversary, and all following anniversaries.
- The owner selects their email and invited family members who have explicitly opted in. No invitation recipient is subscribed automatically.
- Extend the scheduled email worker with idempotent delivery records so each milestone is sent once.
- Ukrainian emails use natural Ukrainian wording and link to the memorial with “Додати спогад” and “Запалити свічку”; English recipients receive English wording.

## Defender of Ukraine memorials
- Add optional type `defender_of_ukraine`, service unit, place of service, and date of death to memorial creation/editing.
- Show a restrained “Захисник України” or “Захисниця України” badge, based on the owner’s selected label rather than inferred gender.
- Creation and management remain restricted to the memorial owner/family through current authentication and owner policies.
- Hide template charges, premium prompts, and advertising on Defender pages. All candle durations are free.
- Donation visibility is not changed until the owner’s preference for Defender donations is known.

## Data and security
- Extend `memorials` with memorial type, Defender label/details, guest-candle enabled flag, and unique slug.
- Extend candle records with guest/device hash, visibility, and archived/history state; add a private rate-limit ledger and conversion events.
- Add remembrance milestone preference, recipient opt-in, and delivery tables with explicit grants and owner-scoped RLS.
- All public writes go through validated Edge Functions. Validate UUIDs, names, dates, allowed enum values, captcha tokens, rate limits, and ownership server-side.
- Public reads expose only public, non-hidden candles and public memorial fields. Email addresses, device hashes, IP hashes, opt-ins, and conversion details remain private.

## Interface changes
- Update memorial creation/editing with the Defender type and service fields, guest-candle switch, and remembrance-date controls.
- Update the memorial page with the Defender badge, Ukrainian-first primary candle action, active candle row, paid/free highlighting, prior-candle list, owner hide actions, and localized share copy.
- Add readable slug routing while retaining `/memorial/:id` compatibility.

## Stripe Connect donation work recorded separately
The latest donation specification arrived incomplete, ending after “If ticked, gross up the charge so the recipient receives”. The known requirements are recorded: Express accounts, destination charges, admin-configured 7% fee, 0% Reflectlife fee for Defender memorials, guest Checkout, connected-account currency, 10/25/50/100 presets, custom minimum 5, and optional fee coverage. No payment-flow implementation will be started from a partial money specification; the remaining text can be folded into this plan without another discovery round.

## Verification
- Test English and Ukrainian pages on desktop and mobile, including Cyrillic names, generated Latin slugs, and all share targets.
- Test guest candle success, four-candle rejection, seven-day archive behavior, owner disable/hide controls, Defender free durations, and signup conversion attribution.
- Test milestone creation, family opt-in, duplicate prevention, anniversary recurrence, and Ukrainian/English email rendering.
- Run the project checks and verify the central flows against the live preview and deployed functions.

## Assumptions
- Existing memorial ID links remain valid permanently.
- “Every following anniversary” has no end date until the owner disables it.
- Defender donations remain unchanged pending the missing donation specification and a decision on whether Defender pages should display donations.
