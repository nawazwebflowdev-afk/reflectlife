// Shared helpers for owner notification emails (Resend, 4 languages).
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.45.0";

export const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version",
};

export const service = () =>
  createClient(Deno.env.get("SUPABASE_URL") ?? "", Deno.env.get("SUPABASE_SERVICE_ROLE_KEY") ?? "");

export const esc = (v: string) =>
  v.replace(/[&<>"']/g, (c) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" }[c] as string));

export type Lang = "en" | "uk" | "es" | "de";
export const lang = (v?: string | null): Lang => (v === "uk" || v === "es" || v === "de" ? v : "en");
export const prefix = (l: Lang) => (l === "es" ? "/es" : l === "de" ? "/de" : "");

export async function sendMail(to: string, subject: string, html: string) {
  const key = Deno.env.get("RESEND_API_KEY");
  if (!key) throw new Error("RESEND_API_KEY missing");
  const r = await fetch("https://api.resend.com/emails", {
    method: "POST",
    headers: { Authorization: `Bearer ${key}`, "Content-Type": "application/json" },
    body: JSON.stringify({ from: "Reflectlife <noreply@reflectlife.net>", to: [to], subject, html }),
  });
  if (!r.ok) throw new Error(`Resend ${r.status}: ${await r.text()}`);
}

/** Wraps content in the calm Reflectlife email layout with a footer link to switch emails off. */
export function layout(body: string, l: Lang) {
  const off = { en: "Turn these emails off", uk: "Вимкнути ці листи", es: "Desactivar estos correos", de: "Diese E-Mails abbestellen" }[l];
  return `<div style="font-family:Georgia,serif;max-width:560px;margin:auto;color:#3b2f2a;line-height:1.6">${body}<hr style="border:none;border-top:1px solid #eee;margin:24px 0"/><p style="font-size:12px;color:#888"><a href="https://reflectlife.net${prefix(l)}/settings" style="color:#888">${off}</a> · Reflectlife</p></div>`;
}

/** Recipients for a memorial's owner notifications, respecting each person's opt-out. */
export async function ownerRecipients(db: ReturnType<typeof service>, ownerIds: string[], kind: "new_memory_email" | "weekly_summary_email") {
  if (!ownerIds.length) return [];
  const [{ data: profiles }, { data: settings }] = await Promise.all([
    db.from("profiles").select("id,email,preferred_language").in("id", ownerIds),
    db.from("owner_notification_settings").select(`user_id,${kind}`).in("user_id", ownerIds),
  ]);
  const off = new Set((settings ?? []).filter((s: any) => s[kind] === false).map((s: any) => s.user_id));
  return (profiles ?? []).filter((p: any) => p.email && !off.has(p.id)).map((p: any) => ({ id: p.id, email: p.email as string, lang: lang(p.preferred_language) }));
}
