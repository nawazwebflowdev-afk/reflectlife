// Emails the memorial owner right away when someone else adds a memory.
// Caller only passes the memory id; everything else is read server-side.
// Each memory is emailed at most once (owner_email_log unique key).
import { corsHeaders, esc, layout, ownerRecipients, prefix, sendMail, service } from "../_shared/ownerMail.ts";

const T = {
  en: (n: string, who: string) => [`A new memory for ${n}`, `<h2>${who} added a new memory for ${n}</h2>`, "Read the memory"],
  uk: (n: string, who: string) => [`Новий спогад: ${n}`, `<h2>${who} додає новий спогад про ${n}</h2>`, "Прочитати спогад"],
  es: (n: string, who: string) => [`Un nuevo recuerdo de ${n}`, `<h2>${who} agregó un nuevo recuerdo de ${n}</h2>`, "Leer el recuerdo"],
  de: (n: string, who: string) => [`Eine neue Erinnerung an ${n}`, `<h2>${who} hat eine neue Erinnerung an ${n} geteilt</h2>`, "Erinnerung lesen"],
} as const;
const SOMEONE = { en: "Someone", uk: "Хтось", es: "Alguien", de: "Jemand" } as const;

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response("ok", { headers: corsHeaders });
  const json = (b: unknown, s = 200) => new Response(JSON.stringify(b), { status: s, headers: { ...corsHeaders, "Content-Type": "application/json" } });
  try {
    const { tributeId } = await req.json().catch(() => ({}));
    if (typeof tributeId !== "string" || !/^[0-9a-f-]{36}$/i.test(tributeId)) return json({ error: "invalid id" }, 400);
    const db = service();
    const { data: tr } = await db.from("tributes").select("id,memorial_id,user_id,tribute_text,created_at").eq("id", tributeId).maybeSingle();
    if (!tr?.memorial_id) return json({ error: "not found" }, 404);
    if (Date.now() - new Date(tr.created_at).getTime() > 15 * 60 * 1000) return json({ skipped: "old" });
    const { data: m } = await db.from("memorials").select("id,name,slug,user_id").eq("id", tr.memorial_id).maybeSingle();
    if (!m || m.user_id === tr.user_id) return json({ skipped: "owner" });
    const { error: claim } = await db.from("owner_email_log").insert({ kind: "new_memory", ref_id: tr.id });
    if (claim) return json({ skipped: "already sent" });
    const { data: author } = tr.user_id ? await db.from("profiles").select("full_name,first_name").eq("id", tr.user_id).maybeSingle() : { data: null };
    const recipients = await ownerRecipients(db, [m.user_id], "new_memory_email");
    let sent = 0;
    for (const r of recipients) {
      const who = esc(author?.full_name || author?.first_name || SOMEONE[r.lang]);
      const [subject, head, cta] = T[r.lang](esc(m.name), who);
      const url = `https://reflectlife.net${prefix(r.lang)}/memorial/${m.slug || m.id}#memories`;
      const excerpt = esc(String(tr.tribute_text).slice(0, 300));
      await sendMail(r.email, subject.replace(/&amp;/g, "&"), layout(`${head}<blockquote style="border-left:3px solid #e8a33d;padding-left:12px;color:#555">${excerpt}</blockquote><p><a href="${url}" style="background:#c8742a;color:#fff;padding:10px 18px;border-radius:8px;text-decoration:none">${cta}</a></p>`, r.lang));
      sent++;
    }
    return json({ sent });
  } catch (e) {
    console.error(e);
    return json({ error: "failed" }, 500);
  }
});
