import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.76.1';
import { z } from 'https://esm.sh/zod@3.23.8';

const corsHeaders = { 'Access-Control-Allow-Origin': '*', 'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version' };
const Schema = z.object({ memorial_id: z.string().uuid(), contributor_name: z.string().trim().max(40).optional().nullable(), device_id: z.string().min(16).max(100), captcha_token: z.string().min(1).max(4096) });
const json = (body: unknown, status = 200) => new Response(JSON.stringify(body), { status, headers: { ...corsHeaders, 'Content-Type': 'application/json' } });
async function hash(value: string) { const bytes = await crypto.subtle.digest('SHA-256', new TextEncoder().encode(value)); return [...new Uint8Array(bytes)].map(b => b.toString(16).padStart(2,'0')).join(''); }
async function verifyCaptcha(token: string, ip: string) {
  const secret = Deno.env.get('RECAPTCHA_SECRET_KEY');
  if (!secret) return false;
  const body = new URLSearchParams({ secret, response: token, remoteip: ip });
  const res = await fetch('https://www.google.com/recaptcha/api/siteverify', { method: 'POST', headers: { 'Content-Type': 'application/x-www-form-urlencoded' }, body });
  const data = await res.json();
  return data.success === true && (typeof data.score !== 'number' || data.score >= 0.4);
}
Deno.serve(async req => {
  if (req.method === 'OPTIONS') return new Response('ok', { headers: corsHeaders });
  if (req.method !== 'POST') return json({ error: 'Method not allowed' }, 405);
  try {
    const parsed = Schema.safeParse(await req.json());
    if (!parsed.success) return json({ error: 'Invalid candle details.' }, 400);
    const ip = req.headers.get('cf-connecting-ip') || req.headers.get('x-forwarded-for')?.split(',')[0]?.trim() || 'unknown';
    if (!(await verifyCaptcha(parsed.data.captcha_token, ip))) return json({ error: 'Verification failed. Please try again.' }, 400);
    const service = createClient(Deno.env.get('SUPABASE_URL') ?? '', Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? '');
    const { data: memorial } = await service.from('memorials').select('id,name,is_public,privacy_level,guest_candles_enabled').eq('id', parsed.data.memorial_id).maybeSingle();
    if (!memorial || !memorial.is_public || memorial.privacy_level !== 'public') return json({ error: 'Memorial not found.' }, 404);
    if (!memorial.guest_candles_enabled) return json({ error: 'Guest candles are not available for this memorial.' }, 403);
    const [deviceHash, ipHash] = await Promise.all([hash(parsed.data.device_id), hash(ip)]);
    const today = new Date().toISOString().slice(0,10);
    const { data: claimed, error: claimError } = await service.rpc('claim_guest_candle_rate_limit', {
      _memorial_id: memorial.id,
      _device_hash: deviceHash,
      _ip_hash: ipHash,
      _rate_date: today,
    });
    if (claimError) return json({ error: 'Could not light the candle.' }, 500);
    if (!claimed) return json({ error: 'Three candles have already been lit from this device or network today.' }, 429);
    const name = parsed.data.contributor_name?.replace(/[<>]/g, '').trim() || null;
    const { data: candle, error } = await service.from('memorial_guest_candles').insert({ memorial_id: memorial.id, contributor_name: name, device_hash: deviceHash, ip_hash: ipHash }).select('id,contributor_name,lit_at,burns_until').single();
    if (error) return json({ error: 'Could not light the candle.' }, 500);
    return json({ candle, memorial_name: memorial.name });
  } catch (error) { console.error('light-guest-candle', error); return json({ error: 'Could not light the candle.' }, 500); }
});
