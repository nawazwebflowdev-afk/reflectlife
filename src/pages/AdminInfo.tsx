import { useEffect, useMemo, useState } from "react";
import { useNavigate } from "react-router-dom";
import { useTranslation } from "react-i18next";
import { Helmet } from "react-helmet-async";
import { supabase, SUPABASE_URL, SUPABASE_PUBLISHABLE_KEY } from "@/integrations/supabase/client";
import { ArrowDown, ArrowUp } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { useToast } from "@/hooks/use-toast";
import { formatDate } from "@/lib/dateFormat";
import { INFO_CATEGORIES, INFO_LANGS, infoPagesTable, infoTable, isDirectVideoUrl, slugify, videoThumb, type InfoItem } from "@/lib/info";

type Draft = Partial<InfoItem> & { tagsText?: string };
const BUCKET = "memorial_uploads";

const empty = (): Draft => ({
  item_type: "video", title: "", slug: "", category: "know", languages: ["en"], tagsText: "", description: "", body: "",
  video_url: null, embed_url: "", thumbnail_url: null, thumbnail_alt: "", caption_url: null, duration_seconds: null,
  ai_assisted: true, featured: false, status: "draft", publish_at: new Date().toISOString(), sort_order: 0,
});

const parseCsv = (text: string): string[][] => {
  const rows: string[][] = []; let row: string[] = []; let cell = ""; let q = false;
  for (let i = 0; i < text.length; i++) {
    const c = text[i];
    if (q) { if (c === '"' && text[i + 1] === '"') { cell += '"'; i++; } else if (c === '"') q = false; else cell += c; }
    else if (c === '"') q = true;
    else if (c === ",") { row.push(cell); cell = ""; }
    else if (c === "\n" || c === "\r") { if (c === "\r" && text[i + 1] === "\n") i++; row.push(cell); rows.push(row); row = []; cell = ""; }
    else cell += c;
  }
  if (cell || row.length) { row.push(cell); rows.push(row); }
  return rows.filter((r) => r.some((x) => x.trim()));
};

const AdminInfo = () => {
  const { t } = useTranslation();
  const { toast } = useToast();
  const navigate = useNavigate();
  const [uid, setUid] = useState<string | null>(null);
  const [allowed, setAllowed] = useState<boolean | null>(null);
  const [items, setItems] = useState<InfoItem[]>([]);
  const [search, setSearch] = useState("");
  const [draft, setDraft] = useState<Draft | null>(null);
  const [busy, setBusy] = useState(false);
  const [progress, setProgress] = useState<number | null>(null);
  const [support, setSupport] = useState<{ title: string; body: string } | null>(null);

  useEffect(() => {
    (async () => {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) { navigate("/login"); return; }
      setUid(user.id);
      const { data } = await supabase.from("user_roles").select("role").eq("user_id", user.id).eq("role", "admin").maybeSingle();
      setAllowed(!!data);
      if (data) { load(); infoPagesTable().select("title, body").eq("key", "support").maybeSingle().then(({ data: p }: any) => setSupport(p ?? { title: "Support", body: "" })); }
    })();
  }, []);

  const load = () => infoTable().select("*").order("sort_order", { ascending: true }).order("publish_at", { ascending: false }).then(({ data }: any) => setItems(data ?? []));

  const shown = useMemo(() => {
    const s = search.toLowerCase();
    return items.filter((i) => !s || i.title.toLowerCase().includes(s) || i.tags.join(" ").toLowerCase().includes(s));
  }, [items, search]);

  /** Uploads through the Storage endpoint so the bar can show real progress. */
  const upload = async (file: File, kind: string) => {
    const ext = file.name.split(".").pop() || "bin";
    const path = `${uid}/info/${kind}-${crypto.randomUUID()}.${ext}`;
    const { data: { session } } = await supabase.auth.getSession();
    const result = await new Promise<{ ok: boolean; status: number }>((resolve) => {
      const xhr = new XMLHttpRequest();
      xhr.open("POST", `${SUPABASE_URL}/storage/v1/object/${BUCKET}/${path}`);
      xhr.setRequestHeader("Authorization", `Bearer ${session?.access_token ?? SUPABASE_PUBLISHABLE_KEY}`);
      xhr.setRequestHeader("apikey", SUPABASE_PUBLISHABLE_KEY);
      xhr.setRequestHeader("x-upsert", "false");
      xhr.setRequestHeader("Content-Type", file.type || "application/octet-stream");
      if (kind === "video") xhr.upload.onprogress = (e) => e.lengthComputable && setProgress(Math.round((e.loaded / e.total) * 100));
      xhr.onload = () => resolve({ ok: xhr.status < 300, status: xhr.status });
      xhr.onerror = () => resolve({ ok: false, status: 0 });
      xhr.send(file);
    });
    setProgress(null);
    if (!result.ok) throw new Error(t("info.uploadFailed"));
    return supabase.storage.from(BUCKET).getPublicUrl(path).data.publicUrl;
  };

  const set = (patch: Draft) => setDraft((d) => ({ ...d!, ...patch }));

  const onVideo = async (file?: File) => {
    if (!file) return;
    if (!/^video\/(mp4|webm)$/.test(file.type) && !/\.(mp4|webm)$/i.test(file.name)) { toast({ title: t("info.badVideo"), variant: "destructive" }); return; }
    if (file.size > 200 * 1024 * 1024) { toast({ title: "Max 200 MB", variant: "destructive" }); return; }
    setBusy(true);
    try {
      const url = await upload(file, "video");
      // Read duration and grab a frame for an automatic thumbnail.
      const v = document.createElement("video");
      v.preload = "metadata"; v.muted = true; v.src = URL.createObjectURL(file);
      await new Promise((r) => { v.onloadedmetadata = r; });
      const patch: Draft = { video_url: url, duration_seconds: Math.round(v.duration) };
      if (!draft?.thumbnail_url) {
        v.currentTime = Math.min(1, v.duration / 2);
        await new Promise((r) => { v.onseeked = r; });
        const c = document.createElement("canvas"); c.width = v.videoWidth; c.height = v.videoHeight;
        c.getContext("2d")!.drawImage(v, 0, 0);
        const blob = await new Promise<Blob | null>((r) => c.toBlob(r, "image/webp", 0.8));
        if (blob) patch.thumbnail_url = await upload(new File([blob], "thumb.webp", { type: "image/webp" }), "thumb");
      }
      set(patch);
    } catch (e: any) { toast({ title: e.message, variant: "destructive" }); }
    setBusy(false);
  };

  const onFile = async (file: File | undefined, field: "thumbnail_url" | "caption_url") => {
    if (!file) return;
    setBusy(true);
    try {
      let f = file;
      if (field === "caption_url" && file.name.toLowerCase().endsWith(".srt")) {
        const vtt = "WEBVTT\n\n" + (await file.text()).replace(/(\d\d:\d\d:\d\d),(\d\d\d)/g, "$1.$2");
        f = new File([vtt], "captions.vtt", { type: "text/vtt" });
      }
      set({ [field]: await upload(f, field === "caption_url" ? "captions" : "thumb") });
    } catch (e: any) { toast({ title: e.message, variant: "destructive" }); }
    setBusy(false);
  };

  const save = async () => {
    if (!draft?.title?.trim()) return;
    setBusy(true);
    const { tagsText, id, created_at, ...rest } = draft as any;
    // A link to a page (YouTube/Vimeo/…) embeds; a link to a file plays directly.
    const link = (draft.embed_url || "").trim();
    const asFile = isDirectVideoUrl(link);
    const row = {
      ...rest,
      slug: slugify(draft.slug || draft.title),
      video_url: draft.video_url || (asFile ? link : null),
      embed_url: asFile ? null : link || null,
      thumbnail_url: draft.thumbnail_url || videoThumb(link) || null,
      sort_order: Number.isFinite(Number(draft.sort_order)) ? Number(draft.sort_order) : 0,
      tags: (tagsText || "").split(",").map((s: string) => s.trim()).filter(Boolean),
      description: (draft.description || "").slice(0, 160) || null,
      status: draft.status === "published" && new Date(draft.publish_at!) > new Date() ? "scheduled" : draft.status,
    };
    const { error } = id ? await infoTable().update(row).eq("id", id) : await infoTable().insert(row);
    setBusy(false);
    if (error) { toast({ title: error.message, variant: "destructive" }); return; }
    toast({ title: t("info.saved") }); setDraft(null); load();
  };

  const openEdit = (i: InfoItem, copy = false) => setDraft({
    ...i, tagsText: i.tags.join(", "),
    ...(copy ? { id: undefined, title: `${i.title} (copy)`, slug: `${i.slug}-copy-${Date.now().toString(36)}`, status: "draft" as const } : {}),
  });

  const unpublish = async (i: InfoItem) => { await infoTable().update({ status: "draft" }).eq("id", i.id); load(); };

  /** Swaps an item with its neighbour in the list, so you can set the display order. */
  const move = async (item: InfoItem, dir: -1 | 1) => {
    const list = shown;
    const i = list.findIndex((x) => x.id === item.id);
    const j = i + dir;
    if (i < 0 || j < 0 || j >= list.length) return;
    const a = list[i];
    const b = list[j];
    let va = a.sort_order;
    let vb = b.sort_order;
    if (va === vb) {
      // Give every item its own slot first, then swap the two.
      await Promise.all(list.map((x, k) => infoTable().update({ sort_order: (k + 1) * 10 }).eq("id", x.id)));
      va = (i + 1) * 10;
      vb = (j + 1) * 10;
    }
    await Promise.all([
      infoTable().update({ sort_order: vb }).eq("id", a.id),
      infoTable().update({ sort_order: va }).eq("id", b.id),
    ]);
    load();
  };

  const remove = async (i: InfoItem) => {
    if (!window.confirm(t("info.confirmDelete", { t: i.title }))) return;
    await infoTable().delete().eq("id", i.id); load();
  };

  const importCsv = async (file?: File) => {
    if (!file) return;
    const rows = parseCsv(await file.text());
    const [head, ...data] = rows;
    const idx = (k: string) => head.findIndex((h) => h.trim().toLowerCase() === k);
    const get = (r: string[], k: string) => (idx(k) >= 0 ? (r[idx(k)] || "").trim() : "");
    const out = data.map((r) => {
      const title = get(r, "title");
      const cat = get(r, "category").toLowerCase();
      const date = get(r, "date");
      return {
        item_type: "video", title, slug: `${slugify(title)}-${Math.random().toString(36).slice(2, 6)}`,
        category: (INFO_CATEGORIES as readonly string[]).includes(cat) ? cat : "know",
        languages: get(r, "language").toLowerCase().split(/[\s,+/]+/).filter((l) => (INFO_LANGS as readonly string[]).includes(l)).concat().slice(0, 4) || ["en"],
        description: get(r, "description").slice(0, 160) || null,
        tags: get(r, "tags").split(/[,;]/).map((s) => s.trim()).filter(Boolean),
        body: get(r, "transcript") || null, status: "draft",
        publish_at: date && !isNaN(Date.parse(date)) ? new Date(date).toISOString() : new Date().toISOString(),
      };
    }).filter((r) => r.title).map((r) => ({ ...r, languages: r.languages.length ? r.languages : ["en"] }));
    const { error } = await infoTable().insert(out);
    if (error) toast({ title: error.message, variant: "destructive" });
    else { toast({ title: t("info.imported", { n: out.length }) }); load(); }
  };

  const saveSupport = async () => {
    const { error } = await infoPagesTable().upsert({ key: "support", ...support, updated_at: new Date().toISOString() });
    toast({ title: error ? error.message : t("info.saved"), variant: error ? "destructive" : undefined });
  };

  if (allowed === null) return <div className="min-h-[50vh]" aria-hidden />;
  if (!allowed) return <p className="container mx-auto px-4 py-16 text-center">{t("info.noAccess")}</p>;

  const statusOf = (i: InfoItem) => i.status !== "draft" && new Date(i.publish_at) > new Date() ? "scheduled" : i.status;

  return (
    <div className="container mx-auto max-w-6xl px-4 py-8 space-y-6">
      <Helmet><title>{t("info.admin")}</title><meta name="robots" content="noindex" /></Helmet>
      <div className="flex flex-wrap items-center justify-between gap-3">
        <h1 className="font-serif text-2xl font-bold">{t("info.admin")}</h1>
        <div className="flex flex-wrap gap-2">
          <Button variant="outline" asChild><label className="cursor-pointer" title={t("info.csvHint")}>{t("info.importCsv")}<input type="file" accept=".csv,text/csv" className="sr-only" onChange={(e) => importCsv(e.target.files?.[0])} /></label></Button>
          <Button onClick={() => setDraft(empty())}>{t("info.addItem")}</Button>
        </div>
      </div>
      <p className="text-xs text-muted-foreground">{t("info.csvHint")}</p>
      <Input value={search} onChange={(e) => setSearch(e.target.value)} placeholder={t("info.searchAdmin")} className="max-w-sm" />

      <div className="overflow-x-auto rounded-xl border border-border">
        <table className="w-full text-sm">
          <thead className="bg-muted/50 text-left"><tr><th className="p-3" /><th className="p-3">Title</th><th className="p-3">{t("info.category")}</th><th className="p-3">{t("info.languages")}</th><th className="p-3">{t("info.status")}</th><th className="p-3">{t("info.publishDate")}</th><th className="p-3" /></tr></thead>
          <tbody>
            {shown.map((i, n) => (
              <tr key={i.id} className="border-t border-border">
                <td className="p-3">{i.thumbnail_url
                  ? <img src={i.thumbnail_url} alt="" width={36} height={64} loading="lazy" decoding="async" className="h-16 w-9 rounded-md object-cover" />
                  : <div className="h-16 w-9 rounded-md bg-muted" />}</td>
                <td className="p-3 font-medium">{i.title}{i.featured && " ★"}</td>
                <td className="p-3">{t(`info.${i.category}`)}</td>
                <td className="p-3 uppercase text-muted-foreground">{i.languages.join(" · ")}</td>
                <td className="p-3">{t(`info.${statusOf(i)}`)}</td>
                <td className="p-3 whitespace-nowrap">{formatDate(i.publish_at)}</td>
                <td className="p-3"><div className="flex flex-wrap justify-end gap-1">
                  <Button size="sm" variant="ghost" aria-label={t("info.moveUp")} title={t("info.moveUp")} disabled={n === 0} onClick={() => move(i, -1)}><ArrowUp className="h-4 w-4" /></Button>
                  <Button size="sm" variant="ghost" aria-label={t("info.moveDown")} title={t("info.moveDown")} disabled={n === shown.length - 1} onClick={() => move(i, 1)}><ArrowDown className="h-4 w-4" /></Button>
                  <Button size="sm" variant="ghost" onClick={() => openEdit(i)}>{t("info.edit")}</Button>
                  <Button size="sm" variant="ghost" onClick={() => openEdit(i, true)}>{t("info.duplicate")}</Button>
                  {i.status !== "draft" && <Button size="sm" variant="ghost" onClick={() => unpublish(i)}>{t("info.unpublish")}</Button>}
                  <Button size="sm" variant="ghost" className="text-destructive" onClick={() => remove(i)}>{t("info.delete")}</Button>
                </div></td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      {support && (
        <section className="space-y-2 rounded-xl border border-border p-4">
          <h2 className="font-serif text-lg font-semibold">{t("info.supportPage")} (/support)</h2>
          <Input value={support.title} onChange={(e) => setSupport({ ...support, title: e.target.value })} />
          <Textarea rows={6} value={support.body} onChange={(e) => setSupport({ ...support, body: e.target.value })} />
          <Button onClick={saveSupport}>{t("info.save")}</Button>
        </section>
      )}

      <Dialog open={!!draft} onOpenChange={(o) => !o && setDraft(null)}>
        <DialogContent className="max-h-[90vh] overflow-y-auto sm:max-w-2xl">
          <DialogHeader><DialogTitle>{draft?.id ? t("info.edit") : t("info.addItem")}</DialogTitle></DialogHeader>
          {draft && (
            <div className="grid gap-3">
              <div className="grid grid-cols-2 gap-3">
                <div><Label>{t("info.type")}</Label>
                  <select className="w-full rounded-md border border-input bg-background p-2" value={draft.item_type}
                    onChange={(e) => set({ item_type: e.target.value as any, ai_assisted: e.target.value === "video" })}>
                    <option value="video">{t("info.video")}</option><option value="guide">{t("info.guide")}</option>
                  </select></div>
                <div><Label>{t("info.category")}</Label>
                  <select className="w-full rounded-md border border-input bg-background p-2" value={draft.category} onChange={(e) => set({ category: e.target.value })}>
                    {INFO_CATEGORIES.map((c) => <option key={c} value={c}>{t(`info.${c}`)}</option>)}
                  </select></div>
              </div>
              <div><Label>Title</Label><Input value={draft.title} onChange={(e) => set({ title: e.target.value, ...(draft.id ? {} : { slug: slugify(e.target.value) }) })} /></div>
              <div><Label>{t("info.slug")}</Label><Input value={draft.slug} onChange={(e) => set({ slug: slugify(e.target.value) })} /></div>
              <div><Label>{t("info.languages")}</Label>
                <div className="flex gap-3">{INFO_LANGS.map((l) => (
                  <label key={l} className="flex items-center gap-1 text-sm"><input type="checkbox" checked={draft.languages?.includes(l)}
                    onChange={(e) => set({ languages: e.target.checked ? [...(draft.languages || []), l] : (draft.languages || []).filter((x) => x !== l) })} />{l.toUpperCase()}</label>
                ))}</div></div>
              <div><Label>{t("info.tags")}</Label><Input value={draft.tagsText} onChange={(e) => set({ tagsText: e.target.value })} /></div>
              <div><Label>{t("info.description")} ({(draft.description || "").length}/160)</Label><Textarea rows={2} maxLength={160} value={draft.description || ""} onChange={(e) => set({ description: e.target.value })} /></div>
              <div><Label>{t("info.body")}</Label><Textarea rows={8} value={draft.body || ""} onChange={(e) => set({ body: e.target.value })} /></div>
              {draft.item_type === "video" && (<>
                <div><Label>{t("info.videoFile")}</Label><Input type="file" accept="video/mp4,video/webm,.mp4,.webm" onChange={(e) => onVideo(e.target.files?.[0])} />
                  {progress != null && (
                    <div className="mt-2" role="progressbar" aria-valuenow={progress} aria-valuemin={0} aria-valuemax={100}>
                      <div className="h-2 w-full overflow-hidden rounded-full bg-muted">
                        <div className="h-full rounded-full bg-primary transition-all" style={{ width: `${progress}%` }} />
                      </div>
                      <p className="mt-1 text-xs text-muted-foreground">{t("info.uploadProgress", { n: progress })}</p>
                    </div>
                  )}
                  {draft.video_url && <p className="mt-1 truncate text-xs text-muted-foreground">{draft.video_url}</p>}</div>
                <div><Label>{t("info.videoLink")}</Label><Input value={draft.embed_url || ""} onChange={(e) => set({ embed_url: e.target.value })} placeholder="https://" /></div>
                <div><Label>{t("info.captions")}</Label><Input type="file" accept=".srt,.vtt" onChange={(e) => onFile(e.target.files?.[0], "caption_url")} /></div>
                <div><Label>{t("info.duration")}</Label><Input type="number" min={0} value={draft.duration_seconds ?? ""} onChange={(e) => set({ duration_seconds: e.target.value ? Number(e.target.value) : null })} /></div>
              </>)}
              <div><Label>{t("info.thumbnail")}</Label><Input type="file" accept="image/*" onChange={(e) => onFile(e.target.files?.[0], "thumbnail_url")} />
                {draft.thumbnail_url && <img src={draft.thumbnail_url} alt="" className="mt-2 h-32 rounded-md object-cover" />}</div>
              <div><Label>{t("info.thumbAlt")}</Label><Input value={draft.thumbnail_alt || ""} onChange={(e) => set({ thumbnail_alt: e.target.value })} /></div>
              <div className="flex flex-wrap gap-6">
                <label className="flex items-center gap-2 text-sm"><Switch checked={!!draft.ai_assisted} onCheckedChange={(v) => set({ ai_assisted: v })} />{t("info.aiAssisted")}</label>
                <label className="flex items-center gap-2 text-sm"><Switch checked={!!draft.featured} onCheckedChange={(v) => set({ featured: v })} />{t("info.featuredToggle")}</label>
              </div>
              <div><Label>{t("info.sortOrder")}</Label>
                <Input type="number" value={draft.sort_order ?? 0} onChange={(e) => set({ sort_order: e.target.value === "" ? 0 : Number(e.target.value) })} />
                <p className="mt-1 text-xs text-muted-foreground">{t("info.orderHint")}</p></div>
              <div className="grid grid-cols-2 gap-3">
                <div><Label>{t("info.status")}</Label>
                  <select className="w-full rounded-md border border-input bg-background p-2" value={draft.status === "scheduled" ? "published" : draft.status} onChange={(e) => set({ status: e.target.value as any })}>
                    <option value="draft">{t("info.draft")}</option><option value="published">{t("info.published")} / {t("info.scheduled")}</option>
                  </select></div>
                <div><Label>{t("info.publishDate")}</Label>
                  <Input type="datetime-local" value={new Date(new Date(draft.publish_at!).getTime() - new Date().getTimezoneOffset() * 60000).toISOString().slice(0, 16)}
                    onChange={(e) => e.target.value && set({ publish_at: new Date(e.target.value).toISOString() })} /></div>
              </div>
              <div className="flex justify-end gap-2">
                <Button variant="outline" onClick={() => setDraft(null)}>{t("info.cancel")}</Button>
                <Button onClick={save} disabled={busy}>{busy ? (progress != null ? t("info.uploadProgress", { n: progress }) : t("info.uploading")) : t("info.save")}</Button>
              </div>
            </div>
          )}
        </DialogContent>
      </Dialog>
    </div>
  );
};

export default AdminInfo;
