// "Report this fundraiser": stores the report and emails the Reflectlife admin.
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.76.1';
import { Resend } from 'https://esm.sh/resend@2.0.0';
import { corsHeaders, json, serviceClient } from '../_shared/donations.ts';

const ADMIN = 'sypera.sylvia@gmail.com';
const esc = (s: string) => s.replace(/[&<>"']/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]!));

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') return new Response(null, { headers: corsHeaders });
  try {
    const b = await req.json().catch(() => ({}));
    const memorialId = String(b.memorialId ?? '');
    const reason = typeof b.reason === 'string' ? b.reason.trim().slice(0, 1000) : '';
    const email = typeof b.email === 'string' ? b.email.trim().slice(0, 254) : '';
    if (!/^[0-9a-f-]{36}$/i.test(memorialId)) return json({ error: 'Invalid memorial.' }, 400);
    if (reason.length < 5) return json({ error: 'Please describe the problem.' }, 400);
    if (email && !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) return json({ error: 'Please enter a valid email address.' }, 400);

    let userId: string | null = null;
    const auth = req.headers.get('Authorization');
    if (auth) {
      const c = createClient(Deno.env.get('SUPABASE_URL')!, Deno.env.get('SUPABASE_ANON_KEY')!);
      const { data } = await c.auth.getUser(auth.replace('Bearer ', ''));
      userId = data.user?.id ?? null;
    }
    const service = serviceClient();
    const { data: m } = await service.from('memorials').select('id,name,slug').eq('id', memorialId).maybeSingle();
    if (!m) return json({ error: 'Memorial not found.' }, 404);

    // Light abuse guard: max 5 reports per memorial per hour.
    const since = new Date(Date.now() - 3600_000).toISOString();
    const { count } = await service.from('fundraiser_reports').select('id', { count: 'exact', head: true }).eq('memorial_id', memorialId).gte('created_at', since);
    if ((count ?? 0) >= 5) return json({ error: 'Thank you — this fundraiser has already been reported recently.' }, 429);

    await service.from('fundraiser_reports').insert({ memorial_id: memorialId, reason, reporter_email: email || null, reporter_user_id: userId });
    const resend = new Resend(Deno.env.get('RESEND_API_KEY'));
    await resend.emails.send({
      from: 'Reflectlife <noreply@reflectlife.net>',
      to: [ADMIN],
      reply_to: email || undefined,
      subject: `Fundraiser reported: ${m.name}`,
      html: `<p>A fundraiser was reported.</p><p><b>Memorial:</b> <a href="https://reflectlife.net/memorial/${m.slug || m.id}">${esc(m.name)}</a></p><p><b>Reporter:</b> ${esc(email || 'not given')}</p><p><b>Reason:</b><br>${esc(reason).replace(/\n/g, '<br>')}</p><p><a href="https://reflectlife.net/admin/fundraisers">Open the admin page</a></p>`,
    }).catch((e) => console.error('report email', e));
    return json({ ok: true });
  } catch (e) {
    console.error('report-fundraiser', e);
    return json({ error: (e as Error).message }, 500);
  }
});
