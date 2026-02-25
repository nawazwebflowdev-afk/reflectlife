import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.76.1';
import Stripe from 'https://esm.sh/stripe@14.21.0';

const stripe = new Stripe(Deno.env.get('STRIPE_SECRET_KEY')!, {
  apiVersion: '2023-10-16',
});

const supabaseUrl = Deno.env.get('SUPABASE_URL')!;
const supabaseServiceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;

Deno.serve(async (req) => {
  const signature = req.headers.get('stripe-signature');
  const webhookSecret = Deno.env.get('STRIPE_WEBHOOK_SECRET');

  if (!signature || !webhookSecret) {
    console.error('Missing signature or webhook secret');
    return new Response('Webhook signature verification failed', { status: 400 });
  }

  try {
    const body = await req.text();
    const event = stripe.webhooks.constructEvent(body, signature, webhookSecret);

    console.log('Webhook event received:', event.type);

    // Handle premium subscription checkout
    if (event.type === 'checkout.session.completed' && event.data.object.mode === 'subscription') {
      const session = event.data.object as Stripe.Checkout.Session;
      
      console.log('Processing premium subscription checkout:', session.id);
      
      const { user_id } = session.metadata || {};
      
      if (!user_id) {
        console.error('Missing user_id in metadata');
        return new Response('Missing user_id', { status: 400 });
      }

      const supabase = createClient(supabaseUrl, supabaseServiceKey);

      // Update user profile to premium
      const { error: profileError } = await supabase
        .from('profiles')
        .update({ is_premium: true })
        .eq('id', user_id);

      if (profileError) {
        console.error('Error updating profile to premium:', profileError);
        return new Response('Error updating profile', { status: 500 });
      }

      // Create or update subscription record
      const { error: subError } = await supabase
        .from('premium_subscriptions')
        .upsert({
          user_id,
          stripe_customer_id: session.customer as string,
          stripe_subscription_id: session.subscription as string,
          status: 'active',
          current_period_end: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000).toISOString(), // 30 days from now
        });

      if (subError) {
        console.error('Error creating subscription record:', subError);
        return new Response('Error creating subscription', { status: 500 });
      }

      console.log('Premium subscription activated successfully');
      
      return new Response(JSON.stringify({ received: true }), {
        headers: { 'Content-Type': 'application/json' },
      });
    }

    // Handle template purchase checkout
    if (event.type === 'checkout.session.completed' && event.data.object.mode === 'payment') {
      const session = event.data.object as Stripe.Checkout.Session;
      
      console.log('Processing checkout session:', session.id);
      console.log('Metadata:', session.metadata);

      const { buyer_id, template_id, creator_id, platform_fee } = session.metadata || {};

      if (!buyer_id || !template_id) {
        console.error('Missing required metadata:', { buyer_id, template_id });
        return new Response('Missing required metadata', { status: 400 });
      }

      const supabase = createClient(supabaseUrl, supabaseServiceKey);

      // Fetch template to get price
      const { data: template, error: templateError } = await supabase
        .from('site_templates')
        .select('price')
        .eq('id', template_id)
        .single();

      if (templateError || !template) {
        console.error('Template not found:', templateError);
        return new Response('Template not found', { status: 404 });
      }

      // Insert purchase record
      const { error: purchaseError } = await supabase
        .from('template_purchases')
        .insert({
          buyer_id,
          template_id,
          creator_id: creator_id || null,
          amount: template.price,
          payment_status: 'completed',
          stripe_payment_intent_id: session.payment_intent as string,
          currency: 'EUR',
        });

      if (purchaseError) {
        console.error('Error creating purchase record:', purchaseError);
        return new Response('Error creating purchase record', { status: 500 });
      }

      // Update buyer's profile with selected template
      const { error: profileError } = await supabase
        .from('profiles')
        .update({ template_id })
        .eq('id', buyer_id);

      if (profileError) {
        console.error('Error updating profile:', profileError);
      }

      // If there's a creator, update their balance
      if (creator_id && platform_fee) {
        const creatorAmount = template.price - parseFloat(platform_fee) / 100;
        
        const { data: currentProfile } = await supabase
          .from('profiles')
          .select('earnings_balance')
          .eq('id', creator_id)
          .single();

        const currentBalance = currentProfile?.earnings_balance || 0;
        const newBalance = Number(currentBalance) + creatorAmount;

        const { error: balanceError } = await supabase
          .from('profiles')
          .update({ earnings_balance: newBalance })
          .eq('id', creator_id);

        if (balanceError) {
          console.error('Error updating creator balance:', balanceError);
        }
      }

      console.log('Purchase completed successfully');
    }

    return new Response(JSON.stringify({ received: true }), {
      headers: { 'Content-Type': 'application/json' },
    });
  } catch (error) {
    console.error('Webhook error:', error);
    return new Response(
      JSON.stringify({ error: 'Webhook processing failed' }),
      { status: 400, headers: { 'Content-Type': 'application/json' } }
    );
  }
});
