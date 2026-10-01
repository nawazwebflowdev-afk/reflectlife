// Weekly (pg_cron, Mondays) summary per memorial owner of new candles, memories and
// donations in the last 7 days. No email when nothing happened. One email per owner per week.
import { corsHeaders, esc, layout, ownerRecipients, prefix, sendMail, service } from "../_shared/ownerMail.ts";

const L = {
  en: { subject: "Your week on Reflectlife", h: "This week on your memorials", c: "candles", m: "memories", d: "donations" },
  uk: { subject: "Ваш тиждень на Reflectlife", h: "Цього тижня на ваших сторінках пам'яті", c: "свічок", m: "спогадів", d: "пожертв" },
  es: { subject: "Tu semana en Reflectlife", h: "Esta semana en tus memoriales", c: "velas", m: "recuerdos", d: "donaciones" },
  de: { subject: "Deine Woche auf Reflectlife", h: "Diese Woche auf deinen Gedenkseiten", c: "Kerzen", m: "Erinnerungen", d: "Spenden" },
} as const;

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response("ok", { headers: corsHeaders });
  const db = service();
  const since = new Date(Date.now() - 7 * 864e5).toISOString();
  const week = new Date().toISOString().slice(0, 10);
  const [cand, guest, trib, don] = await Promise.all([
    db.from("memorial_candles").select("memorial_id").gte("created_at", since),
    db.from("memorial_guest_candles").select("memorial_id").gte("lit_at", since),
    db.from("tributes").select("memorial_id").gte("created_at", since),
    db.from("fundraiser_donations").select("memorial_id").eq("status", "succeeded").gte("created_at", since),
  ]);
  const stats = new Map<string, { c: number; m: number; d: number }>();
  const bump = (rows: any[] | null, k: "c" | "m" | "d") => (rows ?? []).forEach((r) => {
    if (!r.memorial_id) return;
    const s = stats.get(r.memorial_id) ?? { c: 0, m: 0, d: 0 }; s[k]++; stats.set(r.memorial_id, s);
  });
  bump(cand.data, "c"); bump(guest.data, "c"); bump(trib.data, "m"); bump(don.data, "d");
  if (!stats.size) return new Response(JSON.stringify({ sent: 0 }), { headers: corsHeaders });

  const { data: mems } = await db.from("memorials").select("id,name,slug,user_id").in("id", [...stats.keys()]);
  const byOwner = new Map<string, any[]>();
  (mems ?? []).forEach((m) => byOwner.set(m.user_id, [...(byOwner.get(m.user_id) ?? []), m]));
  const recipients = await ownerRecipients(db, [...byOwner.keys()], "weekly_summary_email");
  let sent = 0;
  for (const r of recipients) {
    const { error: claim } = await db.from("owner_email_log").insert({ kind: "weekly", ref_id: `${r.id}:${week}` });
    if (claim) continue;
    const t = L[r.lang];
    const rows = (byOwner.get(r.id) ?? []).map((m) => {
      const s = stats.get(m.id)!;
      const url = `https://reflectlife.net${prefix(r.lang)}/memorial/${m.slug || m.id}`;
      // Donation amounts are intentionally not included; only counts.
      return `<li><a href="${url}">${esc(m.name)}</a>: ${s.c} ${t.c} · ${s.m} ${t.m} · ${s.d} ${t.d}</li>`;
    }).join("");
    try { await sendMail(r.email, t.subject, layout(`<h2>${t.h}</h2><ul>${rows}</ul>`, r.lang)); sent++; }
    catch (e) { console.error(e); await db.from("owner_email_log").delete().eq("kind", "weekly").eq("ref_id", `${r.id}:${week}`); }
  }
  return new Response(JSON.stringify({ sent }), { headers: { ...corsHeaders, "Content-Type": "application/json" } });
});
