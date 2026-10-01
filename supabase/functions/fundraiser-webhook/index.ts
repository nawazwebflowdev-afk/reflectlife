// Verified Stripe webhook for donations. The only place donations are recorded.
// Handles checkout.session.completed, charge.refunded (platform events) and account.updated (Connect events).
import Stripe from 'https://esm.sh/stripe@18.5.0';
import { json, serviceClient } from '../_shared/donations.ts';

const crypto = Stripe.createSubtleCryptoProvider();

Deno.serve(async (req) => {
  if (req.method !== 'POST') return json({ error: 'Method not allowed' }, 405);
  const sig = req.headers.get('stripe-signature');
  if (!sig) return json({ error: 'Missing signature' }, 400);
  const raw = await req.text();

  // Two endpoints in Stripe (account events + connected-account events) each have their own secret.
  const secrets = [Deno.env.get('STRIPE_DONATIONS_WEBHOOK_SECRET'), Deno.env.get('STRIPE_CONNECT_WEBHOOK_SECRET')].filter(Boolean) as string[];
  const stripe = new Stripe(Deno.env.get('STRIPE_DONATIONS_SECRET_KEY') ?? 'sk_unset', { apiVersion: '2025-08-27.basil', httpClient: Stripe.createFetchHttpClient() });
  let event: Stripe.Event | null = null;
  for (const s of secrets) {
    try { event = await stripe.webhooks.constructEventAsync(raw, sig, s, undefined, crypto); break; } catch { /* try next */ }
  }
  if (!event) return json({ error: 'Invalid signature' }, 400);

  const service = serviceClient();
  try {
    if (event.type === 'checkout.session.completed') {
      const s = event.data.object as Stripe.Checkout.Session;
      const md = s.metadata ?? {};
      if (md.kind !== 'fundraiser_donation' || s.payment_status !== 'paid') return json({ ignored: true });
      const { data: f } = await service.from('memorial_fundraisers').select('id,memorial_id').eq('id', md.fundraiser_id).maybeSingle();
      if (!f || f.memorial_id !== md.memorial_id) return json({ ignored: true });
      const amount = s.amount_total ?? 0;
      const fee = Math.min(Math.max(parseInt(md.fee_cents ?? '0', 10) || 0, 0), amount);
      let chargeId: string | null = null;
      if (typeof s.payment_intent === 'string') {
        const pi = await stripe.paymentIntents.retrieve(s.payment_intent).catch(() => null);
        chargeId = typeof pi?.latest_charge === 'string' ? pi.latest_charge : null;
      }
      await service.from('fundraiser_donations').upsert({
        fundraiser_id: f.id,
        memorial_id: f.memorial_id,
        stripe_session_id: s.id,
        stripe_payment_intent_id: typeof s.payment_intent === 'string' ? s.payment_intent : null,
        stripe_charge_id: chargeId,
        currency: (s.currency ?? 'eur').toLowerCase(),
        amount_cents: amount,
        fee_cents: fee,
        net_cents: amount - fee,
        covered_fees: md.covered_fees === 'true',
        anonymous: md.anonymous === 'true',
        donor_name: (md.donor_name || s.customer_details?.name || '').slice(0, 60) || null,
        message: (md.message || '').slice(0, 300) || null,
        livemode: event.livemode,
      }, { onConflict: 'stripe_session_id', ignoreDuplicates: true });
    } else if (event.type === 'charge.refunded') {
      const c = event.data.object as Stripe.Charge;
      const pi = typeof c.payment_intent === 'string' ? c.payment_intent : null;
      if (pi) {
        const full = c.amount_refunded >= c.amount;
        await service.from('fundraiser_donations').update({ refunded_cents: c.amount_refunded, status: full ? 'refunded' : 'partially_refunded' }).eq('stripe_payment_intent_id', pi);
      }
    } else if (event.type === 'account.updated') {
      const a = event.data.object as Stripe.Account;
      await service.from('memorial_fundraisers').update({
        charges_enabled: !!a.charges_enabled, payouts_enabled: !!a.payouts_enabled, currency: a.default_currency ?? null, country: a.country ?? null,
      }).eq('stripe_account_id', a.id);
    }
    return json({ received: true });
  } catch (e) {
    console.error('fundraiser-webhook', event.type, e);
    return json({ error: 'Webhook handling failed' }, 500);
  }
});
