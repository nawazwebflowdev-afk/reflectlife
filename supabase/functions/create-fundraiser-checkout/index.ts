// Guest donation checkout: Stripe Checkout destination charge to the memorial's Express account.
// Nothing is recorded here — donations are only written by the verified webhook.
import { corsHeaders, json, serviceClient, donationStripe, syncTestMode, feePercentFor, safeOrigin, langPrefix } from '../_shared/donations.ts';

const MIN = 5;
const MAX = 25000;

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') return new Response(null, { headers: corsHeaders });
  try {
    const b = await req.json().catch(() => ({}));
    const memorialId = String(b.memorialId ?? '');
    if (!/^[0-9a-f-]{36}$/i.test(memorialId)) return json({ error: 'Invalid memorial.' }, 400);
    const amount = Number(b.amount);
    if (!Number.isFinite(amount) || amount < MIN || amount > MAX) return json({ error: `Please choose an amount between ${MIN} and ${MAX}.` }, 400);
    const coverFees = b.coverFees === true;
    const anonymous = b.anonymous === true;
    const donorName = typeof b.donorName === 'string' ? b.donorName.trim().slice(0, 60) : '';
    const message = typeof b.message === 'string' ? b.message.trim().slice(0, 300) : '';

    const service = serviceClient();
    const { data: m } = await service.from('memorials').select('id,name,slug,is_public,memorial_type').eq('id', memorialId).maybeSingle();
    if (!m) return json({ error: 'Memorial not found.' }, 404);
    const { data: f } = await service.from('memorial_fundraisers').select('*').eq('memorial_id', memorialId).maybeSingle();
    if (!f || !f.enabled || f.admin_paused) return json({ error: 'Donations are not open for this memorial.' }, 400);
    if (!f.stripe_account_id || !f.charges_enabled || !f.payouts_enabled) return json({ error: 'Donations are waiting for Stripe verification.' }, 400);

    const stripe = donationStripe();
    await syncTestMode(service);
    const currency = (f.currency || 'eur').toLowerCase();
    const feePct = await feePercentFor(service, m.memorial_type);
    const f01 = feePct / 100;

    const baseCents = Math.round(amount * 100);
    // Gross-up so the recipient receives the full amount: amount / (1 - fee), rounded up to the cent.
    const chargeCents = coverFees && f01 > 0 ? Math.ceil(baseCents / (1 - f01)) : baseCents;
    const feeCents = Math.round(chargeCents * f01);

    const origin = safeOrigin(req.headers.get('origin'));
    const pre = langPrefix(b.lang);
    const slug = m.slug || m.id;
    const locale = b.lang === 'uk' ? 'auto' : b.lang === 'es' ? 'es' : b.lang === 'de' ? 'de' : 'en';

    const session = await stripe.checkout.sessions.create({
      mode: 'payment',
      locale: locale as 'auto',
      line_items: [{
        quantity: 1,
        price_data: {
          currency,
          unit_amount: chargeCents,
          product_data: { name: `Donation in memory of ${m.name}`, description: f.recipient_name ? `Goes to ${f.recipient_name}` : undefined },
        },
      }],
      payment_intent_data: {
        transfer_data: { destination: f.stripe_account_id },
        ...(feeCents > 0 ? { application_fee_amount: feeCents } : {}),
        description: `Donation in memory of ${m.name}`,
        metadata: { kind: 'fundraiser_donation', fundraiser_id: f.id, memorial_id: m.id },
      },
      metadata: {
        kind: 'fundraiser_donation',
        fundraiser_id: f.id,
        memorial_id: m.id,
        fee_cents: String(feeCents),
        covered_fees: String(coverFees),
        anonymous: String(anonymous),
        donor_name: donorName,
        message,
      },
      success_url: `${origin}${pre}/donation-thanks?memorial=${encodeURIComponent(slug)}`,
      cancel_url: `${origin}${pre}/memorial/${encodeURIComponent(slug)}#donations`,
    });
    return json({ url: session.url });
  } catch (e) {
    console.error('create-fundraiser-checkout', e);
    return json({ error: (e as Error).message }, 500);
  }
});
