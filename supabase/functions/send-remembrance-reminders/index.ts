// Runs every minute via pg_cron. Finds remembrance schedules whose next
// reminder moment is due (±60s window), sends an email to the memorial owner
// and accepted collaborators via Resend, and logs the event to prevent
// duplicate sends.
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.45.0";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

type Frequency = "daily" | "weekly" | "monthly" | "yearly";
type Timing = "2_minutes_before" | "1_day_before";

interface Schedule {
  id: string;
  memorial_id: string;
  time_utc: string; // HH:MM:SS
  frequency: Frequency;
  anchor_date: string; // YYYY-MM-DD
  has_end_date: boolean;
  end_date: string | null;
  reminder_enabled: boolean;
  reminder_timing: Timing;
  time_local: string;
  timezone: string;
  custom_message: string | null;
}

interface PhoneRecipient {
  phone: string;
  display_name: string | null;
  channel: string; // "sms" | "whatsapp"
}

function nextEventAt(s: Schedule, from: Date): Date | null {
  const [hh, mm] = s.time_utc.split(":").map(Number);
  const anchor = new Date(`${s.anchor_date}T00:00:00Z`);
  const endCap = s.has_end_date && s.end_date
    ? new Date(`${s.end_date}T23:59:59Z`)
    : null;

  const build = (y: number, m: number, d: number) =>
    new Date(Date.UTC(y, m, d, hh, mm, 0));

  let candidate: Date;
  if (s.frequency === "daily") {
    candidate = build(from.getUTCFullYear(), from.getUTCMonth(), from.getUTCDate());
    if (candidate < from) candidate = new Date(candidate.getTime() + 86400000);
  } else if (s.frequency === "weekly") {
    const anchorDow = anchor.getUTCDay();
    const fromDow = from.getUTCDay();
    let delta = (anchorDow - fromDow + 7) % 7;
    candidate = build(from.getUTCFullYear(), from.getUTCMonth(), from.getUTCDate() + delta);
    if (candidate < from) candidate = new Date(candidate.getTime() + 7 * 86400000);
  } else if (s.frequency === "monthly") {
    const day = anchor.getUTCDate();
    let y = from.getUTCFullYear();
    let m = from.getUTCMonth();
    candidate = build(y, m, day);
    if (candidate < from) {
      m += 1;
      if (m > 11) { m = 0; y += 1; }
      candidate = build(y, m, day);
    }
  } else { // yearly
    const day = anchor.getUTCDate();
    const month = anchor.getUTCMonth();
    let y = from.getUTCFullYear();
    candidate = build(y, month, day);
    if (candidate < from) candidate = build(y + 1, month, day);
  }
  if (candidate < anchor) return anchor > from ? anchor : null;
  if (endCap && candidate > endCap) return null;
  return candidate;
}

function reminderOffsetMs(t: Timing): number {
  return t === "1_day_before" ? 86400000 : 2 * 60000;
}

async function sendEmail(to: string[], memorial: { name: string; id: string }, when: Date, tz: string, customMessage: string | null) {
  const LOVABLE_API_KEY = Deno.env.get("LOVABLE_API_KEY");
  const RESEND_API_KEY = Deno.env.get("RESEND_API_KEY");
  if (!LOVABLE_API_KEY || !RESEND_API_KEY) throw new Error("Email credentials missing");
  const localTime = new Intl.DateTimeFormat("en-GB", {
    dateStyle: "full", timeStyle: "short", timeZone: tz || "UTC",
  }).format(when);
  const url = `https://reflectlife.net/memorial/${memorial.id}`;
  const html = `
    <div style="font-family:Georgia,serif;max-width:560px;margin:0 auto;padding:32px;background:#faf7f2;color:#3a2a3a;">
      <h1 style="color:#4A324A;margin:0 0 12px;">A moment to remember</h1>
      <p style="font-size:16px;line-height:1.6;">${customMessage ? escapeHtml(customMessage) : `This is a gentle reminder to pause and remember <strong>${memorial.name}</strong>.`}</p>
      <p style="font-size:15px;color:#6b5a6b;">Scheduled for <strong>${localTime}</strong>.</p>
      <p style="margin:24px 0;"><a href="${url}" style="background:#4A324A;color:#fff;padding:12px 24px;border-radius:999px;text-decoration:none;">Visit the memorial</a></p>
      <p style="font-size:12px;color:#9a8a9a;">Sent with love from Reflectlife.</p>
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
      to,
      subject: `Time to remember ${memorial.name}`,
      html,
    }),
  });
  if (!resp.ok) {
    const body = await resp.text();
    console.error("Resend failed", resp.status, body);
  }
}

function escapeHtml(v: string): string {
  return v.replace(/[&<>"']/g, (c) =>
    ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" }[c] as string));
}

// Sends SMS / WhatsApp reminders through the Twilio connector gateway.
// Returns the number of messages accepted by Twilio.
async function sendPhoneMessages(
  recipients: PhoneRecipient[],
  memorial: { name: string; id: string },
  customMessage: string | null,
): Promise<number> {
  const LOVABLE_API_KEY = Deno.env.get("LOVABLE_API_KEY");
  const TWILIO_API_KEY = Deno.env.get("TWILIO_API_KEY");
  const TWILIO_SMS_FROM = Deno.env.get("TWILIO_SMS_FROM");
  const TWILIO_WHATSAPP_FROM = Deno.env.get("TWILIO_WHATSAPP_FROM");
  if (!LOVABLE_API_KEY || !TWILIO_API_KEY) {
    console.error("Twilio is not connected - skipping SMS/WhatsApp reminders");
    return 0;
  }

  const url = `https://reflectlife.net/memorial/${memorial.id}`;
  const body = `${customMessage?.trim() || `A gentle reminder to pause and remember ${memorial.name}.`}\n${url}`;

  let sent = 0;
  for (const r of recipients) {
    const isWhatsApp = r.channel === "whatsapp";
    const from = isWhatsApp ? TWILIO_WHATSAPP_FROM : TWILIO_SMS_FROM;
    if (!from) {
      console.error(`Missing sender number for channel ${r.channel}`);
      continue;
    }
    const params = new URLSearchParams({
      To: isWhatsApp ? `whatsapp:${r.phone}` : r.phone,
      From: isWhatsApp && !from.startsWith("whatsapp:") ? `whatsapp:${from}` : from,
      Body: body.slice(0, 1500),
    });
    const resp = await fetch("https://connector-gateway.lovable.dev/twilio/Messages.json", {
      method: "POST",
      headers: {
        Authorization: `Bearer ${LOVABLE_API_KEY}`,
        "X-Connection-Api-Key": TWILIO_API_KEY,
        "Content-Type": "application/x-www-form-urlencoded",
      },
      body: params,
    });
    if (!resp.ok) {
      console.error(`Twilio request failed [${resp.status}]: ${await resp.text()}`);
      continue;
    }
    sent++;
  }
  return sent;
}

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response("ok", { headers: corsHeaders });
  try {
    const supabase = createClient(
      Deno.env.get("SUPABASE_URL")!,
      Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!,
    );
    const now = new Date();
    const { data: schedules, error } = await supabase
      .from("memorial_remembrances")
      .select("*")
      .eq("reminder_enabled", true);
    if (error) throw error;

    let processed = 0;
    for (const s of (schedules ?? []) as Schedule[]) {
      const evt = nextEventAt(s, now);
      if (!evt) continue;
      const reminderAt = new Date(evt.getTime() - reminderOffsetMs(s.reminder_timing));
      const diff = Math.abs(reminderAt.getTime() - now.getTime());
      if (diff > 60_000) continue; // only fire within a 1-minute window

      // Dedupe
      const { data: existing } = await supabase
        .from("remembrance_notifications")
        .select("id")
        .eq("remembrance_id", s.id)
        .eq("event_at", evt.toISOString())
        .maybeSingle();
      if (existing) continue;

      // Collect recipients
      const { data: mem } = await supabase
        .from("memorials")
        .select("id,name,user_id")
        .eq("id", s.memorial_id)
        .single();
      if (!mem) continue;

      const { data: access } = await supabase
        .from("memorial_access")
        .select("user_id")
        .eq("memorial_id", s.memorial_id)
        .eq("status", "accepted");
      const userIds = new Set<string>([mem.user_id, ...(access ?? []).map((a: any) => a.user_id).filter(Boolean)]);
      const { data: profiles } = await supabase
        .from("profiles")
        .select("id,email")
        .in("id", Array.from(userIds));
      const emails = (profiles ?? []).map((p: any) => p.email).filter((e: string | null) => !!e) as string[];
      const { data: phoneRecipients } = await supabase
        .from("remembrance_phone_recipients")
        .select("phone,display_name,channel")
        .eq("remembrance_id", s.id);
      const phones = (phoneRecipients ?? []) as PhoneRecipient[];

      if (emails.length === 0 && phones.length === 0) continue;

      if (emails.length > 0) {
        await sendEmail(emails, { name: mem.name, id: mem.id }, evt, s.timezone, s.custom_message ?? null);
      }
      let smsSent = 0;
      if (phones.length > 0) {
        smsSent = await sendPhoneMessages(phones, { name: mem.name, id: mem.id }, s.custom_message ?? null);
      }
      await supabase.from("remembrance_notifications").insert({
        remembrance_id: s.id,
        event_at: evt.toISOString(),
        recipients_count: emails.length + smsSent,
      });
      processed++;
    }


    return new Response(JSON.stringify({ ok: true, processed }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  } catch (e) {
    console.error(e);
    return new Response(JSON.stringify({ error: (e as Error).message }), {
      status: 500,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});
