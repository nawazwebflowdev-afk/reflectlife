import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.76.1';
import Stripe from 'https://esm.sh/stripe@18.5.0';
import { CANDLE_PLANS, sanitizeMessage, sanitizeName, type CandlePlan } from '../_shared/candle-plans.ts';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version',
};

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') return new Response(null, { headers: corsHeaders });

  try {
    const stripeSecretKey = Deno.env.get('STRIPE_SECRET_KEY')!;
    const supabaseUrl = Deno.env.get('SUPABASE_URL')!;
    const supabaseServiceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;

    const body = await req.json().catch(() => ({}));
    const sessionId: string | undefined = body?.session_id;
    if (!sessionId) return json({ error: 'Missing session_id' }, 400);

    const stripe = new Stripe(stripeSecretKey, { apiVersion: '2025-08-27.basil' });
    const session = await stripe.checkout.sessions.retrieve(sessionId);
    if (session.payment_status !== 'paid' || session.metadata?.kind !== 'candle') {
      return json({ status: 'pending' });
    }

    const md = session.metadata!;
    const plan = md.plan as CandlePlan;
    const planDef = CANDLE_PLANS[plan];
    if (!planDef) return json({ error: 'Invalid plan' }, 400);

    if (!md.user_id) return json({ error: 'Missing candle owner' }, 400);

    const supabase = createClient(supabaseUrl, supabaseServiceKey);
    const { data, error } = await supabase.rpc('light_user_candle', {
      _memorial_id: md.memorial_id,
      _user_id: md.user_id,
      _plan: plan,
      _duration_seconds: planDef.duration_seconds,
      _amount: planDef.amount,
      _contributor_name: sanitizeName(md.contributor_name),
      _anonymous: md.anonymous === 'true',
      _message: sanitizeMessage(md.message),
      _stripe_session_id: session.id,
    });
    if (error) {
      console.error('apply_candle_contribution error:', error);
      return json({ error: 'Could not activate candle.' }, 500);
    }
    return json({ status: 'ok', candle: data });
  } catch (err) {
    console.error('confirm-candle-payment error:', err);
    return json({ error: 'Confirmation failed.' }, 500);
  }
});

function json(body: unknown, status = 200) {
  return new Response(JSON.stringify(body), {
    status,
    headers: { ...corsHeaders, 'Content-Type': 'application/json' },
  });
}
