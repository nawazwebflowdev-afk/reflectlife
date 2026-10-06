import { useEffect, useMemo, useState } from "react";
import { Link, useParams } from "react-router-dom";
import { useTranslation } from "react-i18next";
import { Helmet } from "react-helmet-async";
import ReactMarkdown from "react-markdown";
import { Share2, Link as LinkIcon, Sparkles, Play, PlayCircle } from "lucide-react";
import { Button } from "@/components/ui/button";
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger } from "@/components/ui/dropdown-menu";
import { useToast } from "@/hooks/use-toast";
import InfoCard from "@/components/info/InfoCard";
import { formatDate } from "@/lib/dateFormat";
import { infoTable, toEmbedUrl, videoThumb, transcriptToVtt, type InfoItem } from "@/lib/info";

const SITE = "https://reflectlife.net";

const InfoItemPage = () => {
  const { slug } = useParams();
  const { t } = useTranslation();
  const { toast } = useToast();
  const [item, setItem] = useState<InfoItem | null | undefined>(undefined);
  const [related, setRelated] = useState<InfoItem[]>([]);
  // Nothing is downloaded until the visitor presses play.
  const [playing, setPlaying] = useState(false);

  useEffect(() => {
    setItem(undefined);
    setPlaying(false);
    infoTable().select("*").eq("slug", slug).maybeSingle().then(({ data }: any) => {
      setItem(data ?? null);
      if (data) infoTable().select("*").eq("category", data.category).neq("id", data.id)
        .order("publish_at", { ascending: false }).limit(3).then(({ data: r }: any) => setRelated(r ?? []));
    });
  }, [slug]);

  // Fallback captions generated from the transcript when no caption file exists.
  const vttUrl = useMemo(() => {
    if (!item || item.caption_url || !item.video_url || !item.body) return null;
    return URL.createObjectURL(new Blob([transcriptToVtt(item.body.replace(/[#*_>`]/g, ""), item.duration_seconds || 60)], { type: "text/vtt" }));
  }, [item]);

  if (item === undefined) return <div className="min-h-[50vh]" aria-hidden />;
  if (item === null) return (
    <div className="container mx-auto px-4 py-16 text-center space-y-4">
      <p>{t("info.notFound")}</p>
      <Link to="/info" className="text-primary underline">{t("info.back")}</Link>
    </div>
  );

  const url = `${SITE}/info/${item.slug}`;
  const embed = toEmbedUrl(item.embed_url || item.video_url);
  const direct = !embed && !!item.video_url;
  const thumb = item.thumbnail_url || videoThumb(item.embed_url || item.video_url);
  const embedSrc = embed ? `${embed}${embed.includes("?") ? "&" : "?"}autoplay=1` : null;
  const isVideo = item.item_type === "video" && (item.video_url || embed);
  const jsonLd = isVideo ? {
    "@context": "https://schema.org", "@type": "VideoObject", name: item.title,
    description: item.description || item.title, thumbnailUrl: thumb ? [thumb] : undefined,
    uploadDate: item.publish_at, contentUrl: item.video_url || undefined, embedUrl: embed || undefined,
    duration: item.duration_seconds ? `PT${item.duration_seconds}S` : undefined, transcript: item.body || undefined,
  } : {
    "@context": "https://schema.org", "@type": "Article", headline: item.title, description: item.description,
    image: item.thumbnail_url || undefined, datePublished: item.publish_at, author: { "@type": "Organization", name: "Reflectlife" },
  };

  const copy = async () => { await navigator.clipboard.writeText(url); toast({ title: t("info.copied") }); };

  return (
    <article className="container mx-auto max-w-3xl px-4 py-6 space-y-6">
      <Helmet>
        <title>{`${item.title} | Reflectlife`}</title>
        <meta name="description" content={item.description || item.title} />
        <link rel="canonical" href={url} />
        <meta property="og:title" content={item.title} />
        <meta property="og:description" content={item.description || ""} />
        <meta property="og:type" content={isVideo ? "video.other" : "article"} />
        <meta property="og:url" content={url} />
        {thumb && <meta property="og:image" content={thumb} />}
        <meta name="twitter:card" content="summary_large_image" />
        <script type="application/ld+json">{JSON.stringify(jsonLd)}</script>
      </Helmet>

      <div className="mx-auto w-full max-w-sm">
        {(direct || embed) && !playing && (
          <button
            type="button"
            onClick={() => setPlaying(true)}
            aria-label={t("info.play")}
            className={`group relative block w-full overflow-hidden rounded-2xl bg-muted focus:outline-none focus-visible:ring-2 focus-visible:ring-primary ${embed ? "aspect-video" : "aspect-[9/16]"}`}
          >
            {thumb ? (
              <img src={thumb} alt={item.thumbnail_alt || item.title} width={720} height={1280} loading="lazy" decoding="async" className="h-full w-full object-cover" />
            ) : (
              <div className="flex h-full items-center justify-center bg-gradient-to-b from-primary/10 to-accent/20 text-primary">
                <PlayCircle className="h-12 w-12" />
              </div>
            )}
            <span className="absolute inset-0 flex items-center justify-center">
              <span className="flex h-16 w-16 items-center justify-center rounded-full bg-background/90 text-primary shadow-lg transition-transform group-hover:scale-105">
                <Play className="ml-1 h-7 w-7" />
              </span>
            </span>
          </button>
        )}
        {direct && playing && (
          <video controls autoPlay playsInline preload="none" poster={item.thumbnail_url || undefined} className="aspect-[9/16] w-full rounded-2xl bg-foreground object-contain">
            <source src={item.video_url!} type="video/mp4" />
            {(item.caption_url || vttUrl) && <track kind="captions" src={item.caption_url || vttUrl!} srcLang={item.languages[0]} label={item.languages[0].toUpperCase()} default />}
          </video>
        )}
        {embed && playing && (
          <iframe src={embedSrc!} title={item.title} allow="autoplay; encrypted-media; picture-in-picture; fullscreen" allowFullScreen
            referrerPolicy="strict-origin-when-cross-origin" className="aspect-[9/16] w-full rounded-2xl border-0 bg-muted" />
        )}
        {!direct && !embed && thumb && (
          <img src={thumb} alt={item.thumbnail_alt || item.title} className="w-full rounded-2xl" width={720} height={1280} />
        )}
        {item.ai_assisted && item.item_type === "video" && (
          <p className="mt-2 flex items-center gap-1.5 text-sm text-muted-foreground"><Sparkles className="h-4 w-4 shrink-0" />{t("info.aiLabel")}</p>
        )}
      </div>

      <header className="space-y-3">
        <h1 className="font-serif text-2xl md:text-3xl font-bold">{item.title}</h1>
        <div className="flex flex-wrap items-center gap-2 text-sm text-muted-foreground">
          <time dateTime={item.publish_at}>{formatDate(item.publish_at)}</time>
          <Link to={`/info?cat=${item.category}`} className="rounded-full bg-primary/10 px-2 py-0.5 text-primary">{t(`info.${item.category}`)}</Link>
          <span className="uppercase">{item.languages.join(" · ")}</span>
        </div>
        {!!item.tags.length && (
          <div className="flex flex-wrap gap-1.5">
            {item.tags.map((tag) => (
              <Link key={tag} to={`/info?q=${encodeURIComponent(tag)}`} className="rounded-full border border-border px-2.5 py-0.5 text-xs hover:border-primary hover:text-primary">#{tag}</Link>
            ))}
          </div>
        )}
        <DropdownMenu>
          <DropdownMenuTrigger asChild><Button variant="outline" size="sm" className="gap-2"><Share2 className="h-4 w-4" />{t("info.share")}</Button></DropdownMenuTrigger>
          <DropdownMenuContent align="start">
            <DropdownMenuItem onClick={copy}><LinkIcon className="mr-2 h-4 w-4" />{t("info.copyLink")}</DropdownMenuItem>
            <DropdownMenuItem asChild><a href={`https://wa.me/?text=${encodeURIComponent(`${item.title} ${url}`)}`} target="_blank" rel="noopener noreferrer">WhatsApp</a></DropdownMenuItem>
            <DropdownMenuItem asChild><a href={`https://www.facebook.com/sharer/sharer.php?u=${encodeURIComponent(url)}`} target="_blank" rel="noopener noreferrer">Facebook</a></DropdownMenuItem>
          </DropdownMenuContent>
        </DropdownMenu>
      </header>

      {item.description && <p className="text-lg">{item.description}</p>}
      {item.body && (
        <section className="space-y-2">
          <h2 className="font-serif text-lg font-semibold">{item.item_type === "video" ? t("info.transcript") : t("info.fullText")}</h2>
          <div className="prose prose-neutral max-w-none dark:prose-invert space-y-3 leading-relaxed"><ReactMarkdown>{item.body}</ReactMarkdown></div>
        </section>
      )}

      {!!related.length && (
        <section className="space-y-3">
          <h2 className="font-serif text-lg font-semibold">{t("info.related")}</h2>
          <div className="grid grid-cols-3 gap-3">{related.map((r) => <InfoCard key={r.id} item={r} />)}</div>
        </section>
      )}

      <Link to="/" className="block rounded-2xl border border-primary/30 bg-primary/5 p-5 text-center font-medium text-primary hover:bg-primary/10">{t("info.cta")}</Link>
      <p className="border-t border-border pt-4 text-center text-sm text-muted-foreground">
        {t("info.support")} <Link to="/support" className="text-primary underline">{t("info.supportLink")}</Link>
      </p>
    </article>
  );
};

export default InfoItemPage;
