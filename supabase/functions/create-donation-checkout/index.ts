import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.76.1';
import Stripe from 'https://esm.sh/stripe@18.5.0';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version',
};

// GoFundMe-style platform fees: personal 3.1% + 0.30, certified charity 2.9% + 0.30
const FEE_RATES = { personal: 0.031, charity: 0.029 } as const;
const FEE_FIXED = 0.3;

const MIN_AMOUNT = 1;
const MAX_AMOUNT = 50000;

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') return new Response(null, { headers: corsHeaders });

  try {
    const supabaseUrl = Deno.env.get('SUPABASE_URL')!;
    const supabaseAnonKey = Deno.env.get('SUPABASE_ANON_KEY')!;
    const supabaseServiceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;
    const stripeSecretKey = Deno.env.get('STRIPE_SECRET_KEY');
    if (!stripeSecretKey) return json({ error: 'Payment system misconfigured.' }, 500);

    const body = await req.json().catch(() => ({}));
    const campaign_id: string | undefined = typeof body?.campaign_id === 'string' ? body.campaign_id : undefined;
    const amount = Number(body?.amount);
    const donor_type: 'private' | 'company' = body?.donor_type === 'company' ? 'company' : 'private';
    const recurring = Boolean(body?.recurring);
    const is_anonymous = Boolean(body?.is_anonymous);
    const notify_organizer = Boolean(body?.notify_organizer);
    const donor_name = String(body?.donor_name ?? '').trim().slice(0, 120);
    const condolence_message = String(body?.condolence_message ?? '').trim().slice(0, 500) || null;
    const bodyEmail = String(body?.donor_email ?? '').trim().toLowerCase().slice(0, 255);
    const accepted_terms = Boolean(body?.accepted_terms);
    const requestedCurrency = String(body?.currency ?? '').toUpperCase();
    const donationCurrency = requestedCurrency === 'USD' ? 'USD' : requestedCurrency === 'EUR' ? 'EUR' : null;

    if (!campaign_id || !Number.isFinite(amount) || amount < MIN_AMOUNT || amount > MAX_AMOUNT) {
      return json({ error: 'Please enter a valid donation amount.' }, 400);
    }
    if (!accepted_terms) return json({ error: 'You must accept the donation terms.' }, 400);

    // Optional auth — guests may donate one-time
    let userId: string | null = null;
    let userEmail: string | null = null;
    const authHeader = req.headers.get('Authorization');
    if (authHeader?.startsWith('Bearer ')) {
      const supabaseAuth = createClient(supabaseUrl, supabaseAnonKey, { global: { headers: { Authorization: authHeader } } });
      const { data } = await supabaseAuth.auth.getUser();
      if (data?.user) { userId = data.user.id; userEmail = data.user.email ?? null; }
    }
    if (recurring && !userId) return json({ error: 'Please sign in to set up a monthly donation.' }, 401);

    const donor_email = userEmail ?? bodyEmail;
    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(donor_email)) return json({ error: 'A valid email address is required.' }, 400);

    const supabase = createClient(supabaseUrl, supabaseServiceKey);
    const { data: campaign, error: cErr } = await supabase
      .from('memorial_campaigns')
      .select('id, status, currency, beneficiary_name, fundraiser_type, memory_wall_id, memorials(name)')
      .eq('id', campaign_id)
      .maybeSingle();
    if (cErr || !campaign) return json({ error: 'Fundraiser not found.' }, 404);
    if (campaign.status !== 'active') return json({ error: 'This fundraiser is not accepting donations.' }, 400);

    const currencyCode = donationCurrency ?? (campaign.currency || 'EUR').toUpperCase();
    const currency = currencyCode.toLowerCase();
    const memorialName = (campaign as any).memorials?.name ?? campaign.beneficiary_name;
    const grossCents = Math.round(amount * 100);
    const fundraiserType = (campaign as any).fundraiser_type === 'charity' ? 'charity' : 'personal';
    const feeRate = FEE_RATES[fundraiserType];
    const fee = Math.round(grossCents * feeRate) / 100 + FEE_FIXED;


    // Pending donation row (fees recomputed by DB trigger)
    const { data: donation, error: dErr } = await supabase
      .from('memorial_donations')
      .insert({
        campaign_id,
        donor_user_id: userId,
        donor_type,
        gross_amount: amount,
        currency: currencyCode,
        donor_name: is_anonymous ? 'Anonymous' : (donor_name || 'Supporter'),
        donor_email,
        condolence_message,
        is_anonymous,
        is_recurring: recurring,
        payment_status: 'pending',
      })
      .select('id')
      .single();
    if (dErr || !donation) {
      console.error('donation insert error', dErr);
      return json({ error: 'Could not start your donation.' }, 500);
    }

    const stripe = new Stripe(stripeSecretKey, { apiVersion: '2025-08-27.basil' });
    const origin = req.headers.get('origin') || Deno.env.get('SITE_URL') || 'https://reflectlife.net';
    const metadata = {
      kind: 'donation',
      donation_id: donation.id,
      campaign_id,
      memorial_id: campaign.memory_wall_id,
      donor_type,
      user_id: userId ?? '',
      notify_organizer: notify_organizer ? 'true' : 'false',
      platform_fee: fee.toFixed(2),
    };

    const session = await stripe.checkout.sessions.create({
      mode: recurring ? 'subscription' : 'payment',
      customer_email: donor_email,
      line_items: [{
        quantity: 1,
        price_data: {
          currency,
          unit_amount: grossCents,
          product_data: {
            name: `Donation in memory of ${memorialName}`,
            description: `Beneficiary: ${campaign.beneficiary_name}`,
          },
          ...(recurring ? { recurring: { interval: 'month' } } : {}),
        },
      }],
      metadata,
      ...(recurring ? { subscription_data: { metadata } } : { payment_intent_data: { metadata } }),
      success_url: `${origin}/donation-success?session_id={CHECKOUT_SESSION_ID}&memorial_id=${campaign.memory_wall_id}`,
      cancel_url: `${origin}/memorial/${campaign.memory_wall_id}`,
    });

    await supabase.from('memorial_donations').update({ stripe_session_id: session.id }).eq('id', donation.id);

    return json({ url: session.url });
  } catch (err) {
    console.error('create-donation-checkout error:', err);
    return json({ error: 'Could not start checkout.' }, 500);
  }
});

function json(body: unknown, status = 200) {
  return new Response(JSON.stringify(body), { status, headers: { ...corsHeaders, 'Content-Type': 'application/json' } });
}
