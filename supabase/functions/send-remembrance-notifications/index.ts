// Remembrance Calendar delivery worker.
// Runs every 5 minutes via pg_cron. Finds remembrance occurrences that are due
// in each recipient's own time zone, sends an email (Resend via the Lovable
// gateway) plus an in-app notification, and records the delivery so a reminder
// is never sent twice.
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.45.0";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

const SITE = "https://reflectlife.net";

type Unit = "day" | "week" | "month" | "year";

interface Remembrance {
  id: string;
  creator_id: string;
  event_type: string;
  event_date: string;
  time_local: string;
  timezone: string;
  recurrence: string;
  recurrence_interval: number;
  recurrence_unit: Unit;
  end_date: string | null;
  message: string | null;
  is_active: boolean;
}

interface Recipient {
  id: string;
  remembrance_id: string;
  user_id: string | null;
  invited_email: string | null;
  invited_phone: string | null;
  display_name: string | null;
  timezone: string | null;
  status: string;
}

function ymd(d: Date): string {
  return `${d.getUTCFullYear()}-${`${d.getUTCMonth() + 1}`.padStart(2, "0")}-${`${d.getUTCDate()}`.padStart(2, "0")}`;
}

/** Offset of a timezone from UTC, in minutes, at a given instant. */
function tzOffsetMinutes(tz: string, at: Date): number {
  try {
    const dtf = new Intl.DateTimeFormat("en-US", {
      timeZone: tz,
      hour12: false,
      year: "numeric",
      month: "2-digit",
      day: "2-digit",
      hour: "2-digit",
      minute: "2-digit",
      second: "2-digit",
    });
    const parts = Object.fromEntries(dtf.formatToParts(at).map((p) => [p.type, p.value]));
    const asUTC = Date.UTC(
      Number(parts.year),
      Number(parts.month) - 1,
      Number(parts.day),
      Number(parts.hour) === 24 ? 0 : Number(parts.hour),
      Number(parts.minute),
      Number(parts.second),
    );
    return (asUTC - at.getTime()) / 60000;
  } catch {
    return 0;
  }
}

/** Converts a wall-clock date/time in `tz` to a UTC instant. */
function wallClockToUtc(dateKey: string, time: string, tz: string): Date {
  const [y, m, d] = dateKey.split("-").map(Number);
  const [hh, mm] = time.split(":").map(Number);
  const guess = Date.UTC(y, m - 1, d, hh || 0, mm || 0);
  const offset = tzOffsetMinutes(tz, new Date(guess));
  return new Date(guess - offset * 60000);
}

function isOccurrenceOn(r: Remembrance, dateKey: string): boolean {
  const start = new Date(`${r.event_date}T00:00:00Z`);
  const target = new Date(`${dateKey}T00:00:00Z`);
  if (target < start) return false;
  if (r.end_date && target > new Date(`${r.end_date}T00:00:00Z`)) return false;

  const dayDiff = Math.round((target.getTime() - start.getTime()) / 86400000);
  const unit: Unit = r.recurrence === "custom" ? r.recurrence_unit : (
    r.recurrence === "daily" ? "day" : r.recurrence === "weekly" ? "week" : r.recurrence === "monthly" ? "month" : "year"
  );
  const step = r.recurrence === "custom" ? Math.max(1, r.recurrence_interval || 1) : 1;

  switch (r.recurrence) {
    case "once":
      return dayDiff === 0;
    case "daily":
      return true;
    case "weekly":
      return dayDiff % 7 === 0;
    case "monthly":
      return target.getUTCDate() === start.getUTCDate();
    case "yearly":
      return target.getUTCDate() === start.getUTCDate() && target.getUTCMonth() === start.getUTCMonth();
    case "custom": {
      if (unit === "day") return dayDiff % step === 0;
      if (unit === "week") return dayDiff % (7 * step) === 0;
      if (unit === "month") {
        if (target.getUTCDate() !== start.getUTCDate()) return false;
        const months =
          (target.getUTCFullYear() - start.getUTCFullYear()) * 12 + (target.getUTCMonth() - start.getUTCMonth());
        return months >= 0 && months % step === 0;
      }
      if (target.getUTCDate() !== start.getUTCDate() || target.getUTCMonth() !== start.getUTCMonth()) return false;
      return (target.getUTCFullYear() - start.getUTCFullYear()) % step === 0;
    }
    default:
      return false;
  }
}

function joinNames(names: string[]): string {
  if (names.length === 0) return "someone dear";
  if (names.length === 1) return names[0];
  return `${names.slice(0, -1).join(", ")} and ${names[names.length - 1]}`;
}

async function sendEmail(to: string, subject: string, html: string) {
  const LOVABLE_API_KEY = Deno.env.get("LOVABLE_API_KEY");
  const RESEND_API_KEY = Deno.env.get("RESEND_API_KEY");
  if (!LOVABLE_API_KEY || !RESEND_API_KEY) throw new Error("Email credentials missing");
  const res = await fetch("https://connector-gateway.lovable.dev/resend/emails", {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      Authorization: `Bearer ${LOVABLE_API_KEY}`,
      "X-Connection-Api-Key": RESEND_API_KEY,
    },
    body: JSON.stringify({
      from: "Reflectlife <noreply@reflectlife.net>",
      to: [to],
      subject,
      html,
    }),
  });
  if (!res.ok) {
    const body = await res.text();
    throw new Error(`Resend failed [${res.status}]: ${body}`);
  }
}

function emailHtml(names: string, message: string | null, url: string, when: string) {
  return `
    <div style="font-family:Georgia,serif;max-width:560px;margin:0 auto;padding:32px;background:#faf7f2;color:#3a2a3a;">
      <p style="font-size:13px;letter-spacing:.08em;text-transform:uppercase;color:#8a7a8a;margin:0 0 8px;">Reflectlife Remembrance</p>
      <h1 style="color:#4A324A;margin:0 0 16px;font-size:26px;">Today we remember ${names}</h1>
      ${message ? `<p style="font-size:16px;line-height:1.7;font-style:italic;">“${message}”</p>` : ""}
      <p style="font-size:14px;color:#6b5a6b;">${when}</p>
      <p style="margin:28px 0;"><a href="${url}" style="background:#4A324A;color:#fff;padding:14px 28px;border-radius:999px;text-decoration:none;">Open this remembrance</a></p>
      <p style="font-size:13px;color:#6b5a6b;">You can light a candle, leave a gentle response, or simply take a quiet moment.</p>
      <p style="font-size:12px;color:#9a8a9a;">Sent with love from Reflectlife.</p>
    </div>`;
}

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response("ok", { headers: corsHeaders });

  const supabase = createClient(
    Deno.env.get("SUPABASE_URL")!,
    Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!,
    { auth: { persistSession: false } },
  );

  const now = new Date();
  const windowMs = 6 * 60 * 1000; // cron runs every 5 minutes
  let sent = 0;
  const errors: string[] = [];

  try {
    const { data: remembrances, error } = await supabase
      .from("remembrances")
      .select("*")
      .eq("is_active", true);
    if (error) throw error;

    for (const r of (remembrances ?? []) as Remembrance[]) {
      const { data: recips } = await supabase
        .from("remembrance_recipients")
        .select("*")
        .eq("remembrance_id", r.id)
        .eq("status", "active");
      const { data: subjects } = await supabase
        .from("remembrance_subjects")
        .select("subject_name")
        .eq("remembrance_id", r.id);
      const names = joinNames(((subjects ?? []) as { subject_name: string }[]).map((s) => s.subject_name));
      const time = r.time_local.slice(0, 5);

      for (const rec of (recips ?? []) as Recipient[]) {
        const tz = rec.timezone || r.timezone || "UTC";
        // Check today and the neighbouring days so timezone shifts are covered.
        const candidates = [-1, 0, 1].map((delta) => {
          const d = new Date(now.getTime() + delta * 86400000);
          return ymd(d);
        });

        for (const dateKey of candidates) {
          if (!isOccurrenceOn(r, dateKey)) continue;
          const scheduled = wallClockToUtc(dateKey, time, tz);
          const diff = now.getTime() - scheduled.getTime();
          if (diff < 0 || diff > windowMs) continue;

          const { data: existing } = await supabase
            .from("remembrance_deliveries")
            .select("id")
            .eq("remembrance_id", r.id)
            .eq("recipient_id", rec.id)
            .eq("scheduled_for", scheduled.toISOString())
            .maybeSingle();
          if (existing) continue;

          const { data: delivery, error: insErr } = await supabase
            .from("remembrance_deliveries")
            .insert({
              remembrance_id: r.id,
              recipient_id: rec.id,
              scheduled_for: scheduled.toISOString(),
              status: "pending",
            })
            .select("id")
            .maybeSingle();
          if (insErr || !delivery) continue; // another worker already claimed it

          let email = rec.invited_email;
          if (!email && rec.user_id) {
            const { data: profile } = await supabase
              .from("profiles")
              .select("email")
              .eq("id", rec.user_id)
              .maybeSingle();
            email = profile?.email ?? null;
          }

          const url = `${SITE}/remembrance/${r.id}`;
          const when = new Intl.DateTimeFormat("en-GB", {
            dateStyle: "full",
            timeStyle: "short",
            timeZone: tz,
          }).format(scheduled);

          try {
            if (rec.user_id) {
              await supabase.from("notifications").insert({
                user_id: rec.user_id,
                actor_id: r.creator_id,
                type: "remembrance",
                remembrance_id: r.id,
              });
            }
            if (email) {
              await sendEmail(email, `Today we remember ${names}`, emailHtml(names, r.message, url, when));
            }
            await supabase
              .from("remembrance_deliveries")
              .update({ status: email ? "sent" : "no_email", delivered_at: new Date().toISOString() })
              .eq("id", delivery.id);
            sent++;
          } catch (e) {
            const msg = e instanceof Error ? e.message : "unknown error";
            errors.push(`${r.id}/${rec.id}: ${msg}`);
            await supabase
              .from("remembrance_deliveries")
              .update({ status: "failed", error: msg })
              .eq("id", delivery.id);
          }
        }
      }
    }

    return new Response(JSON.stringify({ sent, errors }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
      status: 200,
    });
  } catch (e) {
    const msg = e instanceof Error ? e.message : "unknown error";
    console.error("send-remembrance-notifications failed:", msg);
    return new Response(JSON.stringify({ error: msg }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
      status: 500,
    });
  }
});
