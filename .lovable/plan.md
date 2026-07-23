# Shared Memorial Candle System — Plan

One candle per memorial. Any visitor can light it (Free 24h, Monthly €4.99 / 30d, Yearly €49.99 / 365d) or extend it while it's already burning. New durations stack onto the current expiry. Every visitor viewing the page sees the flame ignite, the countdown update, and new dedications appear in real time via Supabase Realtime.

## User experience

**On a cold candle**
- Uploaded `Candle.png` shown with a black wick, no flame, no glow.
- Caption: *"Light a candle in memory of this loved one."*
- Three plan cards: Free (24h) · Monthly €4.99 (30d) · Yearly €49.99 (365d, "Best Value" badge).
- Optional inputs: display name (defaults to signed-in name, guests type theirs), an *"Add anonymously"* toggle, a 100-char dedication.
- Big CTA: **Light This Candle**.

**On a burning candle**
- Same illustration + realistic animated flame, warm halo, tiny embers, gentle sway. Pure CSS keyframes on `transform`/`opacity`/`filter` for 60fps; a rAF loop retunes CSS vars for organic flicker. `prefers-reduced-motion` → static flame, no embers. Animation pauses on `visibilitychange`.
- Caption: *"This candle is currently burning in loving memory."*
- Live countdown (`23d 14h 07m`), contributor count (*"kept alive by 12 people"*), most recent dedication.
- **Extend the Candle** button opens the same plan picker; the chosen duration is *added* to `expires_at`.
- Small scrolling list of the last 5 dedications with contributor name (or *"Anonymous"*) and relative time.

**When the candle expires**
- Flame fades, halo disappears, wick shown with a wisp of smoke SVG for a second.
- Message: *"The candle has gone out. Light it again in loving memory."* Cards reappear.

Fully responsive: cards stack, CTA becomes full-width, candle scales with viewport.

## Data model

The existing `memorial_candles` table (id, memorial_id, session_id, user_id, created_at) is a legacy per-tribute log and doesn't model lifecycle. I'll **redesign it**: preserve the table name (per your spec) via a migration that drops legacy columns, adds the lifecycle columns, and creates `candle_contributions`. Zero legacy data is currently referenced by product code (checked), so the reshape is safe.

`public.memorial_candles` (one active row per memorial):
- `memorial_id` (FK memorials, **unique** — one candle per memorial)
- `status` — `inactive` | `active` | `expired`
- `started_at`, `expires_at` (nullable while inactive)
- `current_plan` — last plan applied (`free` | `monthly` | `yearly`)
- standard `id`, `created_at`, `updated_at` (trigger)

`public.candle_contributions` (append-only history):
- `memorial_candle_id` (FK memorial_candles)
- `user_id` (nullable, FK auth.users)
- `contributor_name` (text, nullable)
- `anonymous` (bool, default false)
- `plan` (`free` | `monthly` | `yearly`)
- `amount` (numeric, EUR — 0 for free)
- `message` (text, ≤100 chars, nullable)
- `stripe_session_id` (text, unique when set, nullable)
- `created_at`

**RLS**
- `memorial_candles`: `SELECT` open to anon + authenticated (candles are public — memorial visitors see them). Writes only via `service_role` (edge functions) — the frontend never writes directly.
- `candle_contributions`: `SELECT` open (last dedications are shown to visitors). Writes only via `service_role`.
- All lifecycle transitions happen inside SECURITY DEFINER RPCs / edge functions, so RLS stays tight and the "any visitor can contribute" behavior is safe.

**SQL helpers (SECURITY DEFINER, `search_path=public`)**
- `apply_candle_contribution(memorial_id, plan, duration_seconds, amount, contributor_name, anonymous, message, user_id, stripe_session_id)` — upserts the `memorial_candles` row, computes new `expires_at` (stacking when already active, else `now()+duration`), inserts the contribution, returns the updated candle. Idempotent on `stripe_session_id`.
- `expire_stale_candles()` — flips active rows past `expires_at` to `expired`.

Realtime is enabled on both tables with `alter publication supabase_realtime add table`; RLS ensures subscribers only receive rows they're allowed to read (public in this case).

## Stripe

Two one-off prices created via `stripe--create_stripe_product_and_price`:
- `Memorial Candle — 30 days` (€4.99)
- `Memorial Candle — 365 days` (€49.99)

Their `price_id`s are hardcoded server-side.

New edge functions (all `verify_jwt = false`, auth handled in code where relevant):

- `create-candle-checkout` — accepts `{ memorial_id, plan: 'monthly'|'yearly', contributor_name?, anonymous?, message? }`. **Allows guests** (no auth required — anyone can contribute). Validates memorial exists and is not deleted. Creates Stripe Checkout `mode: payment`. Metadata carries all contribution fields + `kind: 'candle'`. `success_url = /candle-success?session_id={CHECKOUT_SESSION_ID}&memorial_id=<id>`.
- `confirm-candle-payment` — called from the success page with `session_id`. Retrieves the session, verifies `payment_status === 'paid'`, then calls the `apply_candle_contribution` RPC. Idempotent.
- `light-free-candle` — accepts the same payload with `plan: 'free'`. Rate-limited server-side per IP (≤3/hour, in-memory soft limit) to discourage spam; also enforces `message` length ≤100 and sanitizes. Calls the RPC directly.
- `stripe-webhook` (existing) — extended to branch on `metadata.kind === 'candle'` and call the same RPC. This is the source of truth: even if the user closes the tab, the webhook lights the candle.

Free lighting never touches Stripe.

## Frontend

New files:
- `src/components/candle/CandleSection.tsx` — orchestrator on the memorial page. Fetches the candle + last 5 contributions, subscribes to two Realtime channels (`candles:memorial=<id>` and `contribs:candle=<id>`), keeps state in sync, drives the countdown.
- `src/components/candle/CandleDisplay.tsx` — the illustration + wick + optional flame layers.
- `src/components/candle/CandleFlame.tsx` — pure-CSS animated flame + glow + ember spans. Reads `prefers-reduced-motion` and `document.hidden`.
- `src/components/candle/CandlePlanPicker.tsx` — three plan cards + name/anon/message inputs + CTA. Same component used for "light" and "extend" flows (button label changes).
- `src/components/candle/DedicationList.tsx` — recent messages with names/anon.
- `src/hooks/useCountdown.ts` — ticks each second while active.
- `src/pages/CandleSuccess.tsx` — hits `confirm-candle-payment`, shows a warm confirmation, then routes back to `/memorial/:memorialId`.
- `src/assets/candle.png.asset.json` — uploaded via `lovable-assets` from `Candle.png`.

Modified:
- `src/pages/Memorial.tsx` — mount `<CandleSection memorialId={id} />` under the hero.
- `src/App.tsx` — add `/candle-success` route.
- `src/index.css` — flame/glow/ember/smoke keyframes gated behind `prefers-reduced-motion: no-preference`.
- `supabase/config.toml` — register `create-candle-checkout`, `confirm-candle-payment`, `light-free-candle` with `verify_jwt = false`.
- `supabase/functions/stripe-webhook/index.ts` — candle branch.

## Realtime & concurrency

- `apply_candle_contribution` runs inside a single transaction with a row lock on the candle row (`SELECT … FOR UPDATE`) so simultaneous extensions from multiple visitors stack correctly instead of racing.
- The webhook is idempotent on `stripe_session_id` (unique constraint on `candle_contributions.stripe_session_id`), so retries won't double-extend.
- Frontend never mutates directly — the ignition you see in the browser is triggered by the Realtime `UPDATE` from `apply_candle_contribution`.

## Guest contributor UX

- Guests can enter a display name or check *"Contribute anonymously"*.
- Signed-in users get their name prefilled but can override or go anonymous.
- Messages hard-capped at 100 chars client-side and server-side; HTML stripped server-side before insert.

## Out of scope

- Notifications to the memorial owner (can be layered on later via a trigger).
- Localizing plan cards into UK — copy will use the existing i18n keys plus new keys added to `en.ts` / `uk.ts`.
- Refunds / partial refunds for candles.

Approve and I'll build it end-to-end.