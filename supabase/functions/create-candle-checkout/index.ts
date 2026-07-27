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
    const supabaseUrl = Deno.env.get('SUPABASE_URL')!;
    const supabaseAnonKey = Deno.env.get('SUPABASE_ANON_KEY')!;
    const supabaseServiceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;
    const stripeSecretKey = Deno.env.get('STRIPE_SECRET_KEY')!;

    if (!stripeSecretKey) {
      return json({ error: 'Payment system misconfigured.' }, 500);
    }

    const body = await req.json().catch(() => ({}));
    const memorial_id: string | undefined = body?.memorial_id;
    const plan: CandlePlan | undefined = body?.plan;
    const contributor_name = sanitizeName(body?.contributor_name);
    const anonymous = Boolean(body?.anonymous);
    const message = sanitizeMessage(body?.message);

    if (!memorial_id || !plan || (plan !== 'monthly' && plan !== 'yearly')) {
      return json({ error: 'Invalid request' }, 400);
    }

    // Optional auth — guests allowed
    let userId: string | null = null;
    let userEmail: string | null = null;
    const authHeader = req.headers.get('Authorization');
    if (authHeader?.startsWith('Bearer ')) {
      const supabaseAuth = createClient(supabaseUrl, supabaseAnonKey, {
        global: { headers: { Authorization: authHeader } },
      });
      const { data } = await supabaseAuth.auth.getUser();
      if (data?.user) {
        userId = data.user.id;
        userEmail = data.user.email ?? null;
      }
    }

    if (!userId) return json({ error: 'Please sign in to light a candle.' }, 401);

    const supabase = createClient(supabaseUrl, supabaseServiceKey);
    const { data: memorial, error: memErr } = await supabase
      .from('memorials')
      .select('id, name')
      .eq('id', memorial_id)
      .maybeSingle();
    if (memErr || !memorial) return json({ error: 'Memorial not found' }, 404);

    const stripe = new Stripe(stripeSecretKey, { apiVersion: '2025-08-27.basil' });
    const planDef = CANDLE_PLANS[plan];
    const origin = req.headers.get('origin') || Deno.env.get('SITE_URL') || 'https://reflectlife.lovable.app';

    const session = await stripe.checkout.sessions.create({
      mode: 'payment',
      line_items: [{ price: planDef.price_id!, quantity: 1 }],
      customer_email: userEmail ?? undefined,
      success_url: `${origin}/candle-success?session_id={CHECKOUT_SESSION_ID}&memorial_id=${memorial_id}`,
      cancel_url: `${origin}/memorial/${memorial_id}`,
      metadata: {
        kind: 'candle',
        memorial_id,
        plan,
        duration_seconds: String(planDef.duration_seconds),
        amount: String(planDef.amount),
        user_id: userId ?? '',
        contributor_name: contributor_name ?? '',
        anonymous: anonymous ? 'true' : 'false',
        message: message ?? '',
      },
    });

    return json({ url: session.url });
  } catch (err) {
    console.error('create-candle-checkout error:', err);
    return json({ error: 'Could not start checkout. Please try again.' }, 500);
  }
});

function json(body: unknown, status = 200) {
  return new Response(JSON.stringify(body), {
    status,
    headers: { ...corsHeaders, 'Content-Type': 'application/json' },
  });
}
