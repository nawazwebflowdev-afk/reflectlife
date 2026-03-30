import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.76.1';
import Stripe from 'https://esm.sh/stripe@18.5.0';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version',
};

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const supabaseUrl = Deno.env.get('SUPABASE_URL');
    const supabaseAnonKey = Deno.env.get('SUPABASE_ANON_KEY');
    const supabaseServiceRoleKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY');
    const stripeSecretKey = Deno.env.get('STRIPE_SECRET_KEY');

    if (!supabaseUrl || !supabaseAnonKey || !supabaseServiceRoleKey || !stripeSecretKey) {
      return new Response(
        JSON.stringify({ error: 'Missing required environment configuration' }),
        { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    const authHeader = req.headers.get('Authorization');
    if (!authHeader?.startsWith('Bearer ')) {
      return new Response(JSON.stringify({ error: 'Unauthorized' }), {
        status: 401,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    const supabaseAuth = createClient(supabaseUrl, supabaseAnonKey, {
      global: {
        headers: {
          Authorization: authHeader,
        },
      },
    });

    const {
      data: { user },
      error: userError,
    } = await supabaseAuth.auth.getUser();

    if (userError || !user) {
      return new Response(JSON.stringify({ error: 'Unauthorized' }), {
        status: 401,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    const payload = await req.json().catch(() => ({}));
    const sessionId = payload?.session_id;

    if (!sessionId || typeof sessionId !== 'string') {
      return new Response(JSON.stringify({ error: 'session_id is required' }), {
        status: 400,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    const stripe = new Stripe(stripeSecretKey, {
      apiVersion: '2025-08-27.basil',
    });

    const session = await stripe.checkout.sessions.retrieve(sessionId);

    if (!session) {
      return new Response(JSON.stringify({ error: 'Checkout session not found' }), {
        status: 404,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    if (session.payment_status !== 'paid') {
      return new Response(
        JSON.stringify({
          error: 'Payment has not been completed yet',
          payment_status: session.payment_status,
        }),
        {
          status: 400,
          headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        }
      );
    }

    const metadata = session.metadata || {};
    const buyerId = metadata.buyer_id;
    const templateId = metadata.template_id;

    if (!buyerId || !templateId) {
      return new Response(JSON.stringify({ error: 'Missing checkout metadata' }), {
        status: 400,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    if (buyerId !== user.id) {
      return new Response(JSON.stringify({ error: 'Forbidden' }), {
        status: 403,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    const supabaseAdmin = createClient(supabaseUrl, supabaseServiceRoleKey);

    const { data: template, error: templateError } = await supabaseAdmin
      .from('site_templates')
      .select('id, name, price')
      .eq('id', templateId)
      .single();

    if (templateError || !template) {
      return new Response(JSON.stringify({ error: 'Template not found' }), {
        status: 404,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    const { data: existingPurchase, error: existingPurchaseError } = await supabaseAdmin
      .from('template_purchases')
      .select('id, payment_status')
      .eq('stripe_session_id', sessionId)
      .maybeSingle();

    if (existingPurchaseError && existingPurchaseError.code !== 'PGRST116') {
      return new Response(JSON.stringify({ error: 'Failed to check existing purchase' }), {
        status: 500,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    if (!existingPurchase) {
      const { error: insertError } = await supabaseAdmin.from('template_purchases').insert({
        buyer_id: buyerId,
        template_id: templateId,
        amount: template.price,
        payment_status: 'success',
        stripe_session_id: sessionId,
      });

      if (insertError) {
        return new Response(JSON.stringify({ error: `Failed to save purchase: ${insertError.message}` }), {
          status: 500,
          headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        });
      }
    } else if (existingPurchase.payment_status !== 'success') {
      const { error: updatePurchaseError } = await supabaseAdmin
        .from('template_purchases')
        .update({ payment_status: 'success', template_id: templateId, amount: template.price })
        .eq('id', existingPurchase.id);

      if (updatePurchaseError) {
        return new Response(JSON.stringify({ error: `Failed to update purchase: ${updatePurchaseError.message}` }), {
          status: 500,
          headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        });
      }
    }

    const { error: profileError } = await supabaseAdmin
      .from('profiles')
      .update({ template_id: templateId })
      .eq('id', buyerId);

    if (profileError) {
      return new Response(JSON.stringify({ error: `Failed to update profile template: ${profileError.message}` }), {
        status: 500,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    return new Response(
      JSON.stringify({
        success: true,
        template_id: templateId,
        template_name: template.name,
      }),
      {
        status: 200,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      }
    );
  } catch (error) {
    console.error('confirm-template-purchase error:', error);
    return new Response(
      JSON.stringify({
        error: error instanceof Error ? error.message : 'Failed to confirm purchase',
      }),
      {
        status: 500,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      }
    );
  }
});