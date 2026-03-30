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
    const supabaseUrl = Deno.env.get('SUPABASE_URL')!;
    const supabaseAnonKey = Deno.env.get('SUPABASE_ANON_KEY')!;
    const supabaseServiceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;
    const stripeSecretKey = Deno.env.get('STRIPE_SECRET_KEY')!;

    if (!stripeSecretKey || (!stripeSecretKey.startsWith('sk_live_') && !stripeSecretKey.startsWith('sk_test_'))) {
      return new Response(
        JSON.stringify({ error: 'Payment system misconfigured. Please contact support.' }),
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
      global: { headers: { Authorization: authHeader } },
    });

    const { data: { user }, error: userError } = await supabaseAuth.auth.getUser();
    if (userError || !user) {
      return new Response(JSON.stringify({ error: 'Unauthorized' }), {
        status: 401,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    const supabase = createClient(supabaseUrl, supabaseServiceKey);
    const stripe = new Stripe(stripeSecretKey, {
      apiVersion: '2025-08-27.basil',
    });

    const body = await req.json().catch(() => ({}));
    const buyerId = body?.buyer_id;
    const templateId = body?.template_id;

    if (!buyerId || !templateId || buyerId !== user.id) {
      return new Response(JSON.stringify({ error: 'Forbidden' }), {
        status: 403,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    const { data: template, error: templateError } = await supabase
      .from('site_templates')
      .select('id, name, country, preview_url, price, is_free, creator_id')
      .eq('id', templateId)
      .single();

    if (templateError || !template) {
      return new Response(
        JSON.stringify({ error: 'Template not found' }),
        { status: 404, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    if (template.is_free) {
      return new Response(
        JSON.stringify({ error: 'This template is free' }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    const customerEmail = user.email;
    if (!customerEmail) {
      return new Response(
        JSON.stringify({ error: 'No email is available for this account.' }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    const platformFeePercent = parseFloat(Deno.env.get('PLATFORM_FEE_PERCENT') || '10');
    const platformFeeAmount = Math.round(Number(template.price) * 100 * (platformFeePercent / 100));

    const customers = await stripe.customers.list({ email: customerEmail, limit: 1 });
    const customerId = customers.data[0]?.id;

    const appUrl = req.headers.get('origin') || Deno.env.get('SITE_URL') || 'https://reflectlife.lovable.app';

    const normalizeStripeImageUrl = (rawUrl: unknown): string | null => {
      if (typeof rawUrl !== 'string' || !rawUrl.trim()) return null;

      try {
        const url = new URL(rawUrl, appUrl);
        if (url.protocol !== 'http:' && url.protocol !== 'https:') return null;
        return url.href;
      } catch {
        return null;
      }
    };

    const previewImageUrl = normalizeStripeImageUrl(template.preview_url);

    const session = await stripe.checkout.sessions.create({
      customer: customerId,
      customer_email: customerId ? undefined : customerEmail,
      line_items: [
        {
          price_data: {
            currency: 'eur',
            product_data: {
              name: template.name,
              description: `Memorial template from ${template.country}`,
              ...(previewImageUrl ? { images: [previewImageUrl] } : {}),
            },
            unit_amount: Math.round(Number(template.price) * 100),
          },
          quantity: 1,
        },
      ],
      mode: 'payment',
      success_url: `${appUrl}/success?session_id={CHECKOUT_SESSION_ID}`,
      cancel_url: `${appUrl}/cancel`,
      metadata: {
        buyer_id: buyerId,
        template_id: template.id,
        platform_fee: platformFeeAmount.toString(),
        creator_id: template.creator_id || '',
      },
    });

    return new Response(
      JSON.stringify({ url: session.url }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  } catch (error) {
    console.error('Error creating checkout session:', error);
    return new Response(
      JSON.stringify({ error: error instanceof Error ? error.message : 'Payment processing failed. Please try again later.' }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  }
});