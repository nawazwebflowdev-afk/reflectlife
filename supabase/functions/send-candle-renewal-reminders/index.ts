// Runs every few minutes via pg_cron. Finds active candles expiring within the
// next hour and emails exactly one renewal reminder to the person who lit them.
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.45.0";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

const SITE_URL = "https://reflectlife.net";

function firstName(profile: { full_name: string | null; first_name: string | null } | null) {
  const n = profile?.first_name || profile?.full_name || "";
  return n.trim().split(" ")[0] || "friend";
}

async function sendReminder(to: string, name: string, memorialName: string, link: string) {
  const LOVABLE_API_KEY = Deno.env.get("LOVABLE_API_KEY");
  const RESEND_API_KEY = Deno.env.get("RESEND_API_KEY");
  if (!LOVABLE_API_KEY || !RESEND_API_KEY) throw new Error("Email credentials missing");

  const html = `
    <div style="font-family:Georgia,serif;max-width:560px;margin:0 auto;padding:32px;background:#faf7f2;color:#3a2a3a;">
      <h1 style="color:#4A324A;margin:0 0 12px;font-size:22px;">Your candle will soon go out</h1>
      <p style="font-size:16px;line-height:1.6;">Hello ${name},</p>
      <p style="font-size:16px;line-height:1.6;">The candle you lit in memory of <strong>${memorialName}</strong> will go out in approximately 1 hour.</p>
      <p style="font-size:16px;line-height:1.6;">If you would like to keep your candle burning as a symbol of remembrance, you can relight or extend it using the link below.</p>
      <p style="margin:24px 0;"><a href="${link}" style="background:#4A324A;color:#fff;padding:12px 24px;border-radius:999px;text-decoration:none;">Relight My Candle</a></p>
      <p style="font-size:13px;color:#6b5a6b;word-break:break-all;">${link}</p>
      <p style="font-size:16px;line-height:1.6;">Thank you for helping keep their memory alive.</p>
      <p style="font-size:16px;line-height:1.6;">With love,<br/>The Reflectlife Team</p>
    </div>`;

  const resp = await fetch("https://connector-gateway.lovable.dev/resend/emails", {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      Authorization: `Bearer ${LOVABLE_API_KEY}`,
      "X-Connection-Api-Key": RESEND_API_KEY,
    },
    body: JSON.stringify({
      from: "Reflectlife <noreply@reflectlife.net>",
      to: [to],
      subject: "Your ReflectLife Memorial Candle Will Soon Go Out",
      html,
    }),
  });
  if (!resp.ok) {
    console.error("Resend failed", resp.status, await resp.text());
    return false;
  }
  return true;
}

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response("ok", { headers: corsHeaders });
  try {
    const supabase = createClient(
      Deno.env.get("SUPABASE_URL")!,
      Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!,
    );

    await supabase.rpc("expire_stale_candles");

    const now = new Date();
    const inAnHour = new Date(now.getTime() + 60 * 60 * 1000).toISOString();

    const { data: candles, error } = await supabase
      .from("memorial_candles")
      .select("id, memorial_id, user_id, plan, expires_at")
      .eq("status", "active")
      .eq("renewal_email_sent", false)
      .not("user_id", "is", null)
      .lte("expires_at", inAnHour)
      .gt("expires_at", now.toISOString())
      .limit(200);
    if (error) throw error;

    let sent = 0;
    for (const c of candles ?? []) {
      const [{ data: profile }, { data: memorial }] = await Promise.all([
        supabase.from("profiles").select("email, full_name, first_name").eq("id", c.user_id).maybeSingle(),
        supabase.from("memorials").select("id, name").eq("id", c.memorial_id).maybeSingle(),
      ]);
      if (!profile?.email || !memorial) continue;

      const link = `${SITE_URL}/memorial/${memorial.id}?relight=1&plan=${c.plan ?? "free"}#candles-of-remembrance`;
      const ok = await sendReminder(profile.email, firstName(profile as any), memorial.name, link);
      if (!ok) continue;

      await supabase
        .from("memorial_candles")
        .update({ renewal_email_sent: true, renewal_email_sent_at: new Date().toISOString() })
        .eq("id", c.id);
      sent++;
    }

    return new Response(JSON.stringify({ ok: true, sent }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  } catch (e) {
    console.error(e);
    return new Response(JSON.stringify({ error: "Reminder job failed" }), {
      status: 500,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});
