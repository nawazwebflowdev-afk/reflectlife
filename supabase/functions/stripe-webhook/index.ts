import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.76.1';
import Stripe from 'https://esm.sh/stripe@18.5.0';

const stripe = new Stripe(Deno.env.get('STRIPE_SECRET_KEY')!, {
  apiVersion: '2025-08-27.basil',
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

    if (event.type === 'checkout.session.completed') {
      const session = event.data.object as Stripe.Checkout.Session;
      
      console.log('Processing checkout session:', session.id);
      console.log('Payment status:', session.payment_status);
      console.log('Metadata:', JSON.stringify(session.metadata));

      // Only process if payment is actually completed
      if (session.payment_status !== 'paid') {
        console.log('Payment not yet paid, skipping. Status:', session.payment_status);
        return new Response(JSON.stringify({ received: true, skipped: 'not_paid' }), {
          headers: { 'Content-Type': 'application/json' },
        });
      }

      const { buyer_id, template_id, creator_id, platform_fee } = session.metadata || {};

      if (!buyer_id || !template_id) {
        console.error('Missing required metadata:', { buyer_id, template_id });
        return new Response(JSON.stringify({ received: true, error: 'missing_metadata' }), {
          headers: { 'Content-Type': 'application/json' },
        });
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
        return new Response(JSON.stringify({ received: true, error: 'template_not_found' }), {
          headers: { 'Content-Type': 'application/json' },
        });
      }

      // Idempotency check: Stripe may retry the same event
      const { data: existingPurchases, error: existingPurchaseError } = await supabase
        .from('template_purchases')
        .select('id, payment_status')
        .eq('stripe_session_id', session.id)
        .limit(1);

      if (existingPurchaseError) {
        console.error('Error checking existing purchase:', existingPurchaseError);
      }

      const existingPurchase = existingPurchases?.[0];

      if (!existingPurchase) {
        // Insert purchase record
        const { error: purchaseError } = await supabase
          .from('template_purchases')
          .insert({
            buyer_id,
            template_id,
            amount: template.price,
            payment_status: 'success',
            stripe_session_id: session.id,
          });

        if (purchaseError) {
          console.error('Error creating purchase record:', purchaseError);
        } else {
          console.log('Purchase record created successfully');
        }
      } else if (existingPurchase.payment_status !== 'success') {
        // Update existing record to success
        const { error: updateError } = await supabase
          .from('template_purchases')
          .update({ payment_status: 'success' })
          .eq('id', existingPurchase.id);

        if (updateError) {
          console.error('Error updating purchase status:', updateError);
        } else {
          console.log('Existing purchase updated to success');
        }
      } else {
        console.log('Purchase already recorded as success, skipping');
      }

      // Update buyer's profile with selected template
      const { error: profileError } = await supabase
        .from('profiles')
        .update({ template_id })
        .eq('id', buyer_id);

      if (profileError) {
        console.error('Error updating profile:', profileError);
      } else {
        console.log('Profile template_id updated for buyer:', buyer_id);
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
        } else {
          console.log('Creator balance updated:', { creator_id, newBalance });
        }
      }

      console.log('Webhook processing completed successfully for session:', session.id);
    }

    return new Response(JSON.stringify({ received: true }), {
      headers: { 'Content-Type': 'application/json' },
    });
  } catch (error) {
    console.error('Webhook error:', error);
    return new Response(
      JSON.stringify({ error: 'Webhook processing failed.' }),
      { status: 400, headers: { 'Content-Type': 'application/json' } }
    );
  }
});
