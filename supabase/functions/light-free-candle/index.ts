import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.76.1';
import { CANDLE_PLANS, sanitizeMessage, sanitizeName } from '../_shared/candle-plans.ts';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version',
};

// Very lightweight in-memory rate limit per IP (best-effort, per-instance)
const bucket = new Map<string, { count: number; reset: number }>();
function rateLimit(ip: string, max = 5, windowMs = 60 * 60 * 1000): boolean {
  const now = Date.now();
  const entry = bucket.get(ip);
  if (!entry || entry.reset < now) {
    bucket.set(ip, { count: 1, reset: now + windowMs });
    return true;
  }
  if (entry.count >= max) return false;
  entry.count += 1;
  return true;
}

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') return new Response(null, { headers: corsHeaders });

  try {
    const supabaseUrl = Deno.env.get('SUPABASE_URL')!;
    const supabaseAnonKey = Deno.env.get('SUPABASE_ANON_KEY')!;
    const supabaseServiceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;

    const ip = req.headers.get('x-forwarded-for')?.split(',')[0].trim() || 'unknown';
    if (!rateLimit(ip)) {
      return json({ error: 'Please wait a while before lighting another candle.' }, 429);
    }

    const body = await req.json().catch(() => ({}));
    const memorial_id: string | undefined = body?.memorial_id;
    const contributor_name = sanitizeName(body?.contributor_name);
    const anonymous = Boolean(body?.anonymous);
    const message = sanitizeMessage(body?.message);
    if (!memorial_id) return json({ error: 'Invalid request' }, 400);

    let userId: string | null = null;
    const authHeader = req.headers.get('Authorization');
    if (authHeader?.startsWith('Bearer ')) {
      const supabaseAuth = createClient(supabaseUrl, supabaseAnonKey, {
        global: { headers: { Authorization: authHeader } },
      });
      const { data } = await supabaseAuth.auth.getUser();
      if (data?.user) userId = data.user.id;
    }
    if (!userId) return json({ error: 'Please sign in to light a candle.' }, 401);

    const supabase = createClient(supabaseUrl, supabaseServiceKey);
    const { data: memorial } = await supabase
      .from('memorials')
      .select('id')
      .eq('id', memorial_id)
      .maybeSingle();
    if (!memorial) return json({ error: 'Memorial not found' }, 404);

    const planDef = CANDLE_PLANS.free;
    const { data, error } = await supabase.rpc('light_user_candle', {
      _memorial_id: memorial_id,
      _user_id: userId,
      _plan: 'free',
      _duration_seconds: planDef.duration_seconds,
      _amount: 0,
      _contributor_name: contributor_name,
      _anonymous: anonymous,
      _message: message,
      _stripe_session_id: null,
    });
    if (error) {
      console.error('apply_candle_contribution error:', error);
      return json({ error: 'Could not light the candle.' }, 500);
    }
    return json({ candle: data });
  } catch (err) {
    console.error('light-free-candle error:', err);
    return json({ error: 'Could not light the candle.' }, 500);
  }
});

function json(body: unknown, status = 200) {
  return new Response(JSON.stringify(body), {
    status,
    headers: { ...corsHeaders, 'Content-Type': 'application/json' },
  });
}
