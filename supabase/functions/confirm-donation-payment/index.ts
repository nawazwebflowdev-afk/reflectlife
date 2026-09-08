import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.76.1';
import Stripe from 'https://esm.sh/stripe@18.5.0';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version',
};

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') return new Response(null, { headers: corsHeaders });
  try {
    const stripe = new Stripe(Deno.env.get('STRIPE_SECRET_KEY')!, { apiVersion: '2025-08-27.basil' });
    const supabase = createClient(Deno.env.get('SUPABASE_URL')!, Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!);

    const body = await req.json().catch(() => ({}));
    const sessionId = typeof body?.session_id === 'string' ? body.session_id : null;
    if (!sessionId || !sessionId.startsWith('cs_')) return json({ error: 'Missing session_id' }, 400);

    const session = await stripe.checkout.sessions.retrieve(sessionId);
    if (session.metadata?.kind !== 'donation') return json({ error: 'Invalid session' }, 400);
    if (session.payment_status !== 'paid') return json({ status: 'pending' });

    const paymentIntent = typeof session.payment_intent === 'string' ? session.payment_intent : session.payment_intent?.id ?? null;
    const { data, error } = await supabase
      .from('memorial_donations')
      .update({ payment_status: 'succeeded', stripe_payment_intent_id: paymentIntent })
      .eq('id', session.metadata.donation_id)
      .eq('stripe_session_id', session.id)
      .select('id, gross_amount, net_payout_amount, platform_fee_amount, campaign_id')
      .maybeSingle();
    if (error) { console.error(error); return json({ error: 'Could not confirm donation.' }, 500); }
    return json({ status: 'ok', donation: data });
  } catch (err) {
    console.error('confirm-donation-payment error:', err);
    return json({ error: 'Confirmation failed.' }, 500);
  }
});

function json(body: unknown, status = 200) {
  return new Response(JSON.stringify(body), { status, headers: { ...corsHeaders, 'Content-Type': 'application/json' } });
}
