// Permanently deletes the signed-in user's own account. Related data is removed by
// the existing ON DELETE CASCADE foreign keys on auth.users.
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.45.0";
import { corsHeaders, service } from "../_shared/ownerMail.ts";

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response("ok", { headers: corsHeaders });
  const json = (b: unknown, s = 200) => new Response(JSON.stringify(b), { status: s, headers: { ...corsHeaders, "Content-Type": "application/json" } });
  const token = (req.headers.get("Authorization") ?? "").replace("Bearer ", "");
  if (!token) return json({ error: "unauthorized" }, 401);
  const anon = createClient(Deno.env.get("SUPABASE_URL") ?? "", Deno.env.get("SUPABASE_ANON_KEY") ?? "");
  const { data: { user } } = await anon.auth.getUser(token);
  if (!user) return json({ error: "unauthorized" }, 401);
  const { confirm } = await req.json().catch(() => ({}));
  if (confirm !== "DELETE") return json({ error: "confirmation required" }, 400);
  const { error } = await service().auth.admin.deleteUser(user.id);
  if (error) { console.error(error); return json({ error: "failed" }, 500); }
  return json({ deleted: true });
});
