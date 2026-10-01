import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const SITE = "https://reflectlife.net";
const DEFAULT_IMAGE = `${SITE}/og-default.jpg`;
const UUID_RE = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

const esc = (s: string) =>
  s.replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;").replace(/"/g, "&quot;");

const year = (d: string | null) => (d ? d.slice(0, 4) : "");

Deno.serve(async (req) => {
  const url = new URL(req.url);
  const id = (url.searchParams.get("id") ?? url.searchParams.get("slug") ?? "").trim();

  let title = "Reflectlife — A timeless space to celebrate and remember";
  let description =
    "A timeless space to celebrate and remember loved ones through stories, photos, and shared memories.";
  let image = DEFAULT_IMAGE;
  let target = SITE + "/";

  if (UUID_RE.test(id)) {
    target = `${SITE}/memorial/${id}`;
    try {
      // Anon key: RLS only exposes public memorials, so private ones never leak.
      const supabase = createClient(
        Deno.env.get("SUPABASE_URL")!,
        Deno.env.get("SUPABASE_ANON_KEY")!,
      );
      const { data: m } = await supabase
        .from("memorials")
        .select("name, bio, date_of_birth, date_of_death, preview_image_url, is_public, privacy_level")
        .eq("id", id)
        .maybeSingle();

      const isPublic = m && m.is_public !== false && (m.privacy_level ?? "public") === "public";
      if (m && isPublic) {
        const b = year(m.date_of_birth), d = year(m.date_of_death);
        title = b || d ? `${m.name} (${b || "?"} – ${d || "?"})` : m.name;
        const bio = (m.bio ?? "").replace(/\s+/g, " ").trim();
        const first = (m.name ?? "").split(" ")[0];
        description = bio ? (bio.length > 150 ? bio.slice(0, 147) + "…" : bio)
          : `Remembering ${first}. Add your memory.`;
        if (m.preview_image_url?.startsWith("https://")) image = m.preview_image_url;
      }
    } catch (_) { /* fall back to defaults */ }
  }

  const shareUrl = UUID_RE.test(id) ? target : SITE + "/";
  const html = `<!doctype html><html lang="en"><head><meta charset="utf-8">
<title>${esc(title)}</title>
<meta name="description" content="${esc(description)}">
<meta property="og:site_name" content="Reflectlife">
<meta property="og:type" content="website">
<meta property="og:title" content="${esc(title)}">
<meta property="og:description" content="${esc(description)}">
<meta property="og:image" content="${esc(image)}">
${image === DEFAULT_IMAGE ? '<meta property="og:image:width" content="1200"><meta property="og:image:height" content="630">' : ""}
<meta property="og:url" content="${esc(shareUrl)}">
<meta name="twitter:card" content="summary_large_image">
<meta name="twitter:title" content="${esc(title)}">
<meta name="twitter:description" content="${esc(description)}">
<meta name="twitter:image" content="${esc(image)}">
<link rel="canonical" href="${esc(target)}">
<meta http-equiv="refresh" content="0;url=${esc(target)}">
</head><body><script>location.replace(${JSON.stringify(target)})</script>
<a href="${esc(target)}">Continue to Reflectlife</a></body></html>`;

  return new Response(html, {
    headers: { "Content-Type": "text/html; charset=utf-8", "Cache-Control": "public, max-age=300" },
  });
});
