import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.76.1';
import Stripe from 'https://esm.sh/stripe@18.5.0';

export const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers':
    'authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version',
};

export const json = (body: unknown, status = 200) =>
  new Response(JSON.stringify(body), { status, headers: { ...corsHeaders, 'Content-Type': 'application/json' } });

export const serviceClient = () =>
  createClient(Deno.env.get('SUPABASE_URL')!, Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!, { auth: { persistSession: false } });

/** Donations use their own Stripe key so they can run in test mode independently of other payments. */
export const donationStripeKey = () => Deno.env.get('STRIPE_DONATIONS_SECRET_KEY') ?? '';

export const donationStripe = () => {
  const key = donationStripeKey();
  if (!key) throw new Error('Donations are not configured yet (missing STRIPE_DONATIONS_SECRET_KEY).');
  return new Stripe(key, { apiVersion: '2025-08-27.basil', httpClient: Stripe.createFetchHttpClient() });
};

/** Keep the public "TEST MODE" badge in sync with the configured key. */
export const syncTestMode = async (service: ReturnType<typeof serviceClient>) => {
  const key = donationStripeKey();
  if (!key) return;
  await service.from('platform_settings').upsert({ key: 'donations_test_mode', value: key.startsWith('sk_test') || key.startsWith('rk_test'), updated_at: new Date().toISOString() });
};

export const feePercentFor = async (service: ReturnType<typeof serviceClient>, memorialType: string | null) => {
  if (memorialType === 'defender_of_ukraine') return 0;
  const { data } = await service.from('platform_settings').select('value').eq('key', 'donation_fee_percent').maybeSingle();
  const n = Number(data?.value ?? 7);
  return Number.isFinite(n) && n >= 0 && n < 50 ? n : 7;
};

export const SITE = 'https://reflectlife.net';

/** Only allow redirects back to our own sites. */
export const safeOrigin = (origin: string | null) => {
  const allowed = [/^https:\/\/(www\.)?reflectlife\.net$/, /^https:\/\/[a-z0-9-]+\.lovable\.app$/, /^http:\/\/localhost:\d+$/];
  return origin && allowed.some((r) => r.test(origin)) ? origin : SITE;
};

export const langPrefix = (lang: unknown) => (lang === 'es' || lang === 'de' ? `/${lang}` : '');
