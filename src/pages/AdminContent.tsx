import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { Navigate } from "react-router-dom";
import { useTranslation } from "react-i18next";
import { Helmet } from "react-helmet-async";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { useToast } from "@/hooks/use-toast";
import { formatDate } from "@/lib/dateFormat";
import RichEditor from "@/components/content/RichEditor";
import DropUpload from "@/components/content/DropUpload";
import { ArticleView } from "./StoryPage";
import { IMAGES, VIDEOS, VIDEO_WARN_MB, db, mediaUrl, slugify, toWebp, uploadWithProgress, useIsAdmin, type Article, type Category, type Video } from "@/lib/content";

const sel = "w-full rounded-md border border-input bg-background p-2 text-sm";
const Pill = ({ s }: { s: string }) => {
  const { t } = useTranslation();
  return <span className={`rounded-full px-2 py-0.5 text-xs ${s === "published" ? "bg-primary/15 text-primary" : "bg-muted text-muted-foreground"}`}>{t(`cms.${s}`)}</span>;
};
const toLocal = (iso: string) => new Date(new Date(iso).getTime() - new Date().getTimezoneOffset() * 60000).toISOString().slice(0, 16);

/* ---------------- Article editor ---------------- */
const ArticleEditor = ({ initial, videos, cats, onClose }: { initial: Partial<Article>; videos: Video[]; cats: Category[]; onClose: () => void }) => {
  const { t } = useTranslation();
  const { toast } = useToast();
  const [a, setA] = useState<Partial<Article>>(initial);
  const [slugTouched, setSlugTouched] = useState(!!initial.id);
  const [coverUrl, setCoverUrl] = useState<string | null>(null);
  const [prog, setProg] = useState<number | null>(null);
  const [err, setErr] = useState<string | null>(null);
  const [preview, setPreview] = useState(false);
  const [autoMsg, setAutoMsg] = useState("");
  const dirty = useRef(false);
  const latest = useRef(a); latest.current = a;

  useEffect(() => { mediaUrl(IMAGES, a.cover_image).then(setCoverUrl); }, [a.cover_image]);
  const set = (p: Partial<Article>) => { dirty.current = true; setA((x) => ({ ...x, ...p })); };

  const persist = useCallback(async (status?: "draft" | "published", silent = false) => {
    const cur = latest.current;
    if (!cur.title?.trim()) { if (!silent) toast({ title: t("cms.title"), variant: "destructive" }); return false; }
    const row = {
      title: cur.title.trim(), slug: slugify(cur.slug || cur.title) || crypto.randomUUID().slice(0, 8), excerpt: cur.excerpt || null, body: cur.body || null,
      cover_image: cur.cover_image || null, video_id: cur.video_id || null, category: cur.category || null,
      status: status ?? cur.status ?? "draft", publish_date: cur.publish_date || new Date().toISOString(),
      seo_title: cur.seo_title || null, seo_description: cur.seo_description || null,
    };
    const res = cur.id ? await db("articles").update(row).eq("id", cur.id).select().single() : await db("articles").insert(row).select().single();
    if (res.error) { toast({ title: res.error.message, variant: "destructive" }); return false; }
    dirty.current = false;
    setA((x) => ({ ...x, id: res.data.id, status: res.data.status, slug: res.data.slug }));
    if (!silent) toast({ title: t("cms.saved") });
    return true;
  }, [t, toast]);

  // Auto-save drafts every 30 seconds when something changed.
  useEffect(() => {
    const iv = setInterval(async () => {
      if (dirty.current && (latest.current.status ?? "draft") === "draft" && latest.current.title?.trim()) {
        if (await persist("draft", true)) setAutoMsg(t("cms.autosaved", { time: new Date().toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" }) }));
      }
    }, 30000);
    return () => clearInterval(iv);
  }, [persist, t]);

  const onCover = async (f: File) => {
    setErr(null);
    if (!f.type.startsWith("image/")) { setErr("Image files only."); return; }
    try { setProg(0); set({ cover_image: await uploadWithProgress(IMAGES, await toWebp(f), "webp", setProg) }); }
    catch (e: any) { setErr(e.message); }
    setProg(null);
  };

  const counter = (v: string | null | undefined, max: number) => <span className={(v?.length ?? 0) > max ? "text-destructive" : "text-muted-foreground"}>{v?.length ?? 0}/{max}</span>;

  return (
    <Dialog open onOpenChange={(o) => !o && onClose()}>
      <DialogContent className="max-h-[92vh] overflow-y-auto sm:max-w-4xl">
        <DialogHeader><DialogTitle>{a.id ? t("cms.edit") : t("cms.newArticle")} {a.status && <Pill s={a.status} />}</DialogTitle></DialogHeader>
        {preview ? (
          <div className="space-y-4"><ArticleView article={{ publish_date: new Date().toISOString(), updated_at: new Date().toISOString(), ...a } as Article} />
            <Button variant="outline" onClick={() => setPreview(false)}>{t("cms.close")}</Button></div>
        ) : (
          <div className="grid gap-4">
            <div><Label>{t("cms.title")}</Label><Input value={a.title || ""} onChange={(e) => set({ title: e.target.value, ...(slugTouched ? {} : { slug: slugify(e.target.value) }) })} /></div>
            <div><Label>{t("cms.slug")}</Label><Input value={a.slug || ""} onChange={(e) => { setSlugTouched(true); set({ slug: slugify(e.target.value) }); }} /></div>
            <div><Label>{t("cms.excerpt")}</Label><Textarea rows={2} value={a.excerpt || ""} onChange={(e) => set({ excerpt: e.target.value })} /></div>
            <div className="grid gap-3 sm:grid-cols-3">
              <div><Label>{t("cms.category")}</Label><select className={sel} value={a.category || ""} onChange={(e) => set({ category: e.target.value })}><option value="">{t("cms.none")}</option>{cats.map((c) => <option key={c.id}>{c.name}</option>)}</select></div>
              <div><Label>{t("cms.publishDate")}</Label><Input type="datetime-local" value={toLocal(a.publish_date || new Date().toISOString())} onChange={(e) => e.target.value && set({ publish_date: new Date(e.target.value).toISOString() })} /></div>
              <div><Label>{t("cms.linkedVideo")}</Label><select className={sel} value={a.video_id || ""} onChange={(e) => set({ video_id: e.target.value || null })}><option value="">{t("cms.none")}</option>{videos.map((v) => <option key={v.id} value={v.id}>{v.title}</option>)}</select></div>
            </div>
            <DropUpload accept="image/*" label={t("cms.cover")} progress={prog} error={err} onFile={onCover}>
              {coverUrl ? <img src={coverUrl} alt="" className="h-28 rounded-md object-cover" /> : undefined}
            </DropUpload>
            <div><Label>{t("cms.body")}</Label><RichEditor value={a.body || ""} onChange={(body) => set({ body })} videos={videos} onError={(m) => toast({ title: m, variant: "destructive" })} /></div>
            <div><Label className="flex justify-between">{t("cms.seoTitle")} {counter(a.seo_title, 60)}</Label><Input value={a.seo_title || ""} onChange={(e) => set({ seo_title: e.target.value })} /></div>
            <div><Label className="flex justify-between">{t("cms.seoDesc")} {counter(a.seo_description, 160)}</Label><Textarea rows={2} value={a.seo_description || ""} onChange={(e) => set({ seo_description: e.target.value })} /></div>
            <div className="flex flex-wrap items-center justify-between gap-2">
              <span className="text-xs text-muted-foreground">{autoMsg}</span>
              <div className="flex flex-wrap gap-2">
                <Button variant="outline" onClick={() => persist("draft")}>{t("cms.saveDraft")}</Button>
                <Button variant="outline" onClick={() => setPreview(true)}>{t("cms.preview")}</Button>
                {a.status === "published"
                  ? <Button variant="secondary" onClick={() => persist("draft")}>{t("cms.unpublish")}</Button>
                  : <Button onClick={() => persist("published")}>{t("cms.publish")}</Button>}
              </div>
            </div>
          </div>
        )}
      </DialogContent>
    </Dialog>
  );
};

/* ---------------- Video editor ---------------- */
const VideoEditor = ({ initial, onClose }: { initial: Partial<Video>; onClose: () => void }) => {
  const { t } = useTranslation();
  const { toast } = useToast();
  const [v, setV] = useState<Partial<Video>>(initial);
  const [vidUrl, setVidUrl] = useState<string | null>(null);
  const [posterUrl, setPosterUrl] = useState<string | null>(null);
  const [prog, setProg] = useState<Record<string, number | null>>({});
  const [err, setErr] = useState<Record<string, string | null>>({});
  const player = useRef<HTMLVideoElement>(null);
  const set = (p: Partial<Video>) => setV((x) => ({ ...x, ...p }));

  useEffect(() => { mediaUrl(VIDEOS, v.video_file).then(setVidUrl); }, [v.video_file]);
  useEffect(() => { mediaUrl(IMAGES, v.poster_image).then(setPosterUrl); }, [v.poster_image]);

  const run = async (key: string, fn: (p: (n: number) => void) => Promise<void>) => {
    setErr((e) => ({ ...e, [key]: null })); setProg((p) => ({ ...p, [key]: 0 }));
    try { await fn((n) => setProg((p) => ({ ...p, [key]: n }))); } catch (e: any) { setErr((x) => ({ ...x, [key]: e.message })); }
    setProg((p) => ({ ...p, [key]: null }));
  };

  const onVideo = (f: File) => {
    if (f.type !== "video/mp4" && !f.name.toLowerCase().endsWith(".mp4")) { setErr((e) => ({ ...e, video: t("cms.mp4Only") })); return; }
    if (f.size > VIDEO_WARN_MB * 1024 * 1024) toast({ title: t("cms.tooBig", { mb: VIDEO_WARN_MB }) });
    const local = URL.createObjectURL(f);
    const probe = document.createElement("video"); probe.preload = "metadata"; probe.src = local;
    probe.onloadedmetadata = () => set({ duration: Math.round(probe.duration) });
    run("video", async (p) => { set({ video_file: await uploadWithProgress(VIDEOS, f, "mp4", p) }); setVidUrl(local); });
  };

  const pickFrame = () => run("poster", async (p) => {
    const el = player.current; if (!el) return;
    const c = document.createElement("canvas"); c.width = el.videoWidth; c.height = el.videoHeight;
    c.getContext("2d")!.drawImage(el, 0, 0);
    const blob = await new Promise<Blob | null>((r) => c.toBlob(r, "image/webp", 0.85));
    if (!blob) throw new Error("Could not capture frame");
    set({ poster_image: await uploadWithProgress(IMAGES, blob, "webp", p) });
  });

  const save = async () => {
    if (!v.title?.trim()) return;
    const row = { title: v.title.trim(), description: v.description || null, video_file: v.video_file || null, poster_image: v.poster_image || null, duration: v.duration ?? null, captions_file: v.captions_file || null, status: v.status || "draft", featured: !!v.featured };
    if (row.featured) await db("videos").update({ featured: false }).eq("featured", true).neq("id", v.id ?? "00000000-0000-0000-0000-000000000000");
    const res = v.id ? await db("videos").update(row).eq("id", v.id) : await db("videos").insert(row);
    if (res.error) { toast({ title: res.error.message, variant: "destructive" }); return; }
    toast({ title: t("cms.saved") }); onClose();
  };

  return (
    <Dialog open onOpenChange={(o) => !o && onClose()}>
      <DialogContent className="max-h-[92vh] overflow-y-auto sm:max-w-2xl">
        <DialogHeader><DialogTitle>{v.id ? t("cms.edit") : t("cms.newVideo")}</DialogTitle></DialogHeader>
        <div className="grid gap-4">
          <div><Label>{t("cms.title")}</Label><Input value={v.title || ""} onChange={(e) => set({ title: e.target.value })} /></div>
          <div><Label>{t("cms.description")}</Label><Textarea rows={3} value={v.description || ""} onChange={(e) => set({ description: e.target.value })} /></div>
          <DropUpload accept="video/mp4,.mp4" label={`MP4 · ${t("cms.mp4Only")}`} progress={prog.video ?? null} error={err.video} onFile={onVideo} />
          {vidUrl && <video ref={player} src={vidUrl} controls playsInline crossOrigin="anonymous" className="max-h-72 w-full rounded-md bg-foreground" />}
          {v.duration != null && <p className="text-xs text-muted-foreground">{t("cms.duration")}: {Math.floor(v.duration / 60)}:{String(v.duration % 60).padStart(2, "0")}</p>}
          <DropUpload accept="image/*" label={t("cms.poster")} progress={prog.poster ?? null} error={err.poster}
            onFile={(f) => run("poster", async (p) => set({ poster_image: await uploadWithProgress(IMAGES, await toWebp(f, 1280), "webp", p) }))}>
            {posterUrl ? <img src={posterUrl} alt="" className="h-24 rounded-md object-cover" /> : undefined}
          </DropUpload>
          {vidUrl && <Button type="button" variant="outline" size="sm" onClick={pickFrame}>{t("cms.pickFrame")}</Button>}
          <DropUpload accept=".vtt,text/vtt" label={t("cms.captions")} progress={prog.cap ?? null} error={err.cap}
            onFile={(f) => f.name.toLowerCase().endsWith(".vtt") ? run("cap", async (p) => set({ captions_file: await uploadWithProgress(VIDEOS, new Blob([f], { type: "text/vtt" }), "vtt", p) })) : setErr((e) => ({ ...e, cap: ".vtt only" }))}>
            {v.captions_file ? <span className="text-xs">✓ .vtt</span> : undefined}
          </DropUpload>
          <div className="flex flex-wrap gap-6">
            <label className="flex items-center gap-2 text-sm"><Switch checked={v.status === "published"} onCheckedChange={(c) => set({ status: c ? "published" : "draft" })} />{t("cms.published")}</label>
            <label className="flex items-center gap-2 text-sm"><Switch checked={!!v.featured} onCheckedChange={(c) => set({ featured: c })} />{t("cms.featured")}</label>
          </div>
          <div className="flex justify-end gap-2"><Button variant="outline" onClick={onClose}>{t("cms.close")}</Button><Button onClick={save} disabled={Object.values(prog).some((x) => x !== null && x !== undefined)}>{t("cms.save")}</Button></div>
        </div>
      </DialogContent>
    </Dialog>
  );
};

/* ---------------- Page ---------------- */
const AdminContent = () => {
  const { t } = useTranslation();
  const [allowed, setAllowed] = useState<boolean | null>(null);
  const [articles, setArticles] = useState<Article[]>([]);
  const [videos, setVideos] = useState<Video[]>([]);
  const [cats, setCats] = useState<Category[]>([]);
  const [q, setQ] = useState(""); const [status, setStatus] = useState(""); const [cat, setCat] = useState("");
  const [editA, setEditA] = useState<Partial<Article> | null>(null);
  const [editV, setEditV] = useState<Partial<Video> | null>(null);
  const [newCat, setNewCat] = useState("");

  const load = () => {
    db("articles").select("*").order("publish_date", { ascending: false }).then(({ data }: any) => setArticles(data ?? []));
    db("videos").select("*").order("created_at", { ascending: false }).then(({ data }: any) => setVideos(data ?? []));
    db("content_categories").select("*").order("sort_order").then(({ data }: any) => setCats(data ?? []));
  };
  useEffect(() => { useIsAdmin().then((ok) => { setAllowed(ok); if (ok) load(); }); }, []);

  const match = (title: string, s: string, c?: string | null) =>
    (!q || title.toLowerCase().includes(q.toLowerCase())) && (!status || s === status) && (c === undefined || !cat || c === cat);
  const fa = useMemo(() => articles.filter((a) => match(a.title, a.status, a.category)), [articles, q, status, cat]);
  const fv = useMemo(() => videos.filter((v) => match(v.title, v.status)), [videos, q, status]);

  const del = async (table: "articles" | "videos", id: string, title: string) => {
    if (!window.confirm(t("cms.confirmDelete", { t: title }))) return;
    await db(table).delete().eq("id", id); load();
  };

  if (allowed === null) return <div className="min-h-[50vh]" aria-hidden />;
  if (!allowed) return <Navigate to="/" replace />;

  const Row = ({ title, s, date, extra, onEdit, onDel }: { title: string; s: string; date: string; extra?: string; onEdit: () => void; onDel: () => void }) => (
    <tr className="border-t border-border">
      <td className="p-3 font-medium">{title}{extra && <span className="ml-2 text-xs text-muted-foreground">{extra}</span>}</td>
      <td className="p-3"><Pill s={s} /></td>
      <td className="p-3 whitespace-nowrap text-muted-foreground">{formatDate(date)}</td>
      <td className="p-3 text-right whitespace-nowrap"><Button size="sm" variant="ghost" onClick={onEdit}>{t("cms.edit")}</Button><Button size="sm" variant="ghost" className="text-destructive" onClick={onDel}>{t("cms.delete")}</Button></td>
    </tr>
  );

  return (
    <div className="container mx-auto max-w-6xl px-4 py-8 space-y-6">
      <Helmet><title>{t("cms.manager")}</title><meta name="robots" content="noindex" /></Helmet>
      <h1 className="font-serif text-2xl font-bold">{t("cms.manager")}</h1>
      <div className="flex flex-wrap gap-2">
        <Input value={q} onChange={(e) => setQ(e.target.value)} placeholder={t("cms.search")} className="max-w-xs" />
        <select className={`${sel} w-auto`} value={status} onChange={(e) => setStatus(e.target.value)}><option value="">{t("cms.anyStatus")}</option><option value="draft">{t("cms.draft")}</option><option value="published">{t("cms.published")}</option></select>
        <select className={`${sel} w-auto`} value={cat} onChange={(e) => setCat(e.target.value)}><option value="">{t("cms.anyCategory")}</option>{cats.map((c) => <option key={c.id}>{c.name}</option>)}</select>
      </div>
      <Tabs defaultValue="articles">
        <TabsList><TabsTrigger value="articles">{t("cms.articles")}</TabsTrigger><TabsTrigger value="videos">{t("cms.videos")}</TabsTrigger><TabsTrigger value="categories">{t("cms.categories")}</TabsTrigger></TabsList>
        <TabsContent value="articles" className="space-y-3">
          <Button onClick={() => setEditA({ status: "draft" })}>{t("cms.newArticle")}</Button>
          <div className="overflow-x-auto rounded-xl border border-border"><table className="w-full text-sm"><tbody>
            {fa.map((a) => <Row key={a.id} title={a.title} s={a.status} date={a.publish_date} extra={a.category || ""} onEdit={() => setEditA(a)} onDel={() => del("articles", a.id, a.title)} />)}
          </tbody></table></div>
        </TabsContent>
        <TabsContent value="videos" className="space-y-3">
          <Button onClick={() => setEditV({ status: "draft", featured: false })}>{t("cms.newVideo")}</Button>
          <div className="overflow-x-auto rounded-xl border border-border"><table className="w-full text-sm"><tbody>
            {fv.map((v) => <Row key={v.id} title={v.title} s={v.status} date={v.created_at} extra={v.featured ? "★" : ""} onEdit={() => setEditV(v)} onDel={() => del("videos", v.id, v.title)} />)}
          </tbody></table></div>
        </TabsContent>
        <TabsContent value="categories" className="space-y-3">
          <div className="flex gap-2 max-w-sm"><Input value={newCat} onChange={(e) => setNewCat(e.target.value)} />
            <Button onClick={async () => { if (newCat.trim()) { await db("content_categories").insert({ name: newCat.trim(), sort_order: cats.length + 1 }); setNewCat(""); load(); } }}>{t("cms.addCategory")}</Button></div>
          <ul className="divide-y divide-border rounded-xl border border-border max-w-sm">
            {cats.map((c) => (
              <li key={c.id} className="flex items-center justify-between p-2 pl-3 text-sm">{c.name}
                <Button size="sm" variant="ghost" className="text-destructive" onClick={async () => { if (window.confirm(t("cms.confirmDelete", { t: c.name }))) { await db("content_categories").delete().eq("id", c.id); load(); } }}>{t("cms.delete")}</Button>
              </li>
            ))}
          </ul>
        </TabsContent>
      </Tabs>
      {editA && <ArticleEditor initial={editA} videos={videos} cats={cats} onClose={() => { setEditA(null); load(); }} />}
      {editV && <VideoEditor initial={editV} onClose={() => { setEditV(null); load(); }} />}
    </div>
  );
};

export default AdminContent;
