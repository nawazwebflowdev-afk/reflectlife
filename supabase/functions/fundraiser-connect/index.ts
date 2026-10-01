// Owner-only actions for a memorial's Stripe Connect Express recipient account.
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.76.1';
import { Resend } from 'https://esm.sh/resend@2.0.0';
import { corsHeaders, json, serviceClient, donationStripe, syncTestMode, safeOrigin, langPrefix } from '../_shared/donations.ts';

const BUSINESS_TYPE: Record<string, 'individual' | 'company' | 'non_profit'> = { private: 'individual', company: 'company', charity: 'non_profit' };
const esc = (s: string) => s.replace(/[&<>"']/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]!));

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') return new Response(null, { headers: corsHeaders });
  try {
    const auth = req.headers.get('Authorization') ?? '';
    const userClient = createClient(Deno.env.get('SUPABASE_URL')!, Deno.env.get('SUPABASE_ANON_KEY')!, { global: { headers: { Authorization: auth } } });
    const { data: { user } } = await userClient.auth.getUser(auth.replace('Bearer ', ''));
    if (!user) return json({ error: 'Please sign in.' }, 401);

    const body = await req.json().catch(() => ({}));
    const action = String(body.action ?? '');
    const memorialId = String(body.memorialId ?? '');
    if (!/^[0-9a-f-]{36}$/i.test(memorialId)) return json({ error: 'Invalid memorial.' }, 400);

    const service = serviceClient();
    const { data: memorial } = await service.from('memorials').select('id,name,slug,user_id').eq('id', memorialId).maybeSingle();
    if (!memorial || memorial.user_id !== user.id) return json({ error: 'Only the memorial owner can do this.' }, 403);
    const { data: f } = await service.from('memorial_fundraisers').select('*').eq('memorial_id', memorialId).maybeSingle();
    if (!f) return json({ error: 'Save the donation settings first.' }, 400);

    const stripe = donationStripe();
    await syncTestMode(service);
    const origin = safeOrigin(req.headers.get('origin'));
    const pre = langPrefix(body.lang);
    const back = `${origin}${pre}/memorial/${memorial.slug || memorial.id}#donations`;

    const refresh = async (accountId: string) => {
      const acct = await stripe.accounts.retrieve(accountId);
      const update = { charges_enabled: !!acct.charges_enabled, payouts_enabled: !!acct.payouts_enabled, currency: acct.default_currency ?? null, country: acct.country ?? f.country };
      await service.from('memorial_fundraisers').update(update).eq('id', f.id);
      return update;
    };

    if (action === 'status') {
      if (!f.stripe_account_id) return json({ connected: false });
      return json({ connected: true, ...(await refresh(f.stripe_account_id)) });
    }

    if (action === 'onboard' || action === 'email_link') {
      let accountId = f.stripe_account_id as string | null;
      if (!accountId) {
        const country = String(f.country ?? '').toUpperCase();
        if (!/^[A-Z]{2}$/.test(country)) return json({ error: 'Choose the recipient country first.' }, 400);
        try {
          const acct = await stripe.accounts.create({
            type: 'express',
            country,
            email: f.recipient_email ?? undefined,
            business_type: BUSINESS_TYPE[f.recipient_type] ?? 'individual',
            capabilities: { card_payments: { requested: true }, transfers: { requested: true } },
            business_profile: { product_description: `Memorial donations for ${memorial.name} on Reflectlife`, url: `https://reflectlife.net/memorial/${memorial.slug || memorial.id}` },
            metadata: { memorial_id: memorial.id, fundraiser_id: f.id },
          });
          accountId = acct.id;
        } catch (e) {
          // Typically: country not supported by Stripe — owner should use an external fundraising link.
          return json({ error: (e as Error).message, unsupported_country: true }, 400);
        }
        await service.from('memorial_fundraisers').update({ stripe_account_id: accountId }).eq('id', f.id);
      }
      const link = await stripe.accountLinks.create({ account: accountId, refresh_url: back, return_url: back, type: 'account_onboarding' });

      if (action === 'onboard') return json({ url: link.url });

      const to = String(body.email ?? '').trim();
      if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(to) || to.length > 254) return json({ error: 'Please enter a valid email address.' }, 400);
      const resend = new Resend(Deno.env.get('RESEND_API_KEY'));
      const name = esc(memorial.name);
      await resend.emails.send({
        from: 'Reflectlife <noreply@reflectlife.net>',
        to: [to],
        subject: `Set up donations in memory of ${memorial.name}`,
        html: `<div style="font-family:Arial,sans-serif;line-height:1.6;max-width:560px"><h2>Donations in memory of ${name}</h2><p>You have been asked to receive donations made in memory of ${name} on Reflectlife. Stripe pays the money directly to your bank account.</p><p><a href="${link.url}" style="background:#7c5c3b;color:#fff;padding:10px 18px;border-radius:6px;text-decoration:none">Set up payouts with Stripe</a></p><p style="color:#666;font-size:13px">This link expires after a short time. If it has expired, ask the memorial owner to send a new one.</p></div>`,
      });
      return json({ sent: true });
    }

    if (action === 'dashboard') {
      if (!f.stripe_account_id) return json({ error: 'No Stripe account yet.' }, 400);
      const login = await stripe.accounts.createLoginLink(f.stripe_account_id);
      return json({ url: login.url });
    }

    return json({ error: 'Unknown action.' }, 400);
  } catch (e) {
    console.error('fundraiser-connect', e);
    return json({ error: (e as Error).message }, 500);
  }
});
