import { useEffect, useState } from "react";
import { Link, useParams } from "react-router-dom";
import { useTranslation } from "react-i18next";
import { Helmet } from "react-helmet-async";
import { Link as LinkIcon, Mail } from "lucide-react";
import { Button } from "@/components/ui/button";
import { useToast } from "@/hooks/use-toast";
import { formatDate } from "@/lib/dateFormat";
import ArticleBody from "@/components/content/ArticleBody";
import MediaVideo from "@/components/content/MediaVideo";
import { IMAGES, db, mediaUrl, type Article, type Video } from "@/lib/content";

const SITE = "https://reflectlife.net";

/** Shared by the public page and the admin preview. */
export const ArticleView = ({ article }: { article: Article }) => {
  const { t } = useTranslation();
  const { toast } = useToast();
  const [cover, setCover] = useState<string | null>(null);
  const [video, setVideo] = useState<Video | null>(null);
  useEffect(() => { mediaUrl(IMAGES, article.cover_image).then(setCover); }, [article.cover_image]);
  useEffect(() => {
    if (article.video_id) db("videos").select("*").eq("id", article.video_id).maybeSingle().then(({ data }: any) => setVideo(data));
    else setVideo(null);
  }, [article.video_id]);
  const url = `${SITE}/stories/${article.slug}`;
  const enc = encodeURIComponent;

  return (
    <article className="space-y-6">
      <Helmet>
        <title>{`${article.seo_title || article.title} | Reflectlife`}</title>
        <meta name="description" content={article.seo_description || article.excerpt || ""} />
        <link rel="canonical" href={url} />
        <meta property="og:title" content={article.seo_title || article.title} />
        <meta property="og:description" content={article.seo_description || article.excerpt || ""} />
        <meta property="og:type" content="article" />
        <meta property="og:url" content={url} />
        {cover && <meta property="og:image" content={cover} />}
        <meta name="twitter:card" content="summary_large_image" />
        <script type="application/ld+json">{JSON.stringify({ "@context": "https://schema.org", "@type": "Article", headline: article.title, description: article.excerpt, datePublished: article.publish_date, dateModified: article.updated_at, image: cover || undefined, publisher: { "@type": "Organization", name: "Reflectlife" } })}</script>
      </Helmet>
      {cover && <img src={cover} alt={article.title} width={1600} height={900} className="aspect-[16/9] w-full rounded-2xl object-cover" />}
      <header className="space-y-2">
        <div className="flex items-center gap-2 text-sm text-muted-foreground">
          {article.category && <span className="rounded-full bg-primary/10 px-2 py-0.5 text-primary">{article.category}</span>}
          <time dateTime={article.publish_date}>{formatDate(article.publish_date)}</time>
        </div>
        <h1 className="font-serif text-3xl md:text-4xl font-bold">{article.title}</h1>
        {article.excerpt && <p className="text-lg text-muted-foreground">{article.excerpt}</p>}
      </header>
      {video && <MediaVideo video={video} />}
      {article.body && <ArticleBody html={article.body} />}
      <div className="flex flex-wrap items-center gap-2 border-t border-border pt-4">
        <span className="text-sm font-medium">{t("cms.share")}:</span>
        <Button size="sm" variant="outline" onClick={async () => { await navigator.clipboard.writeText(url); toast({ title: t("cms.copied") }); }}><LinkIcon className="mr-1 h-4 w-4" />{t("cms.copyLink")}</Button>
        <Button size="sm" variant="outline" asChild><a href={`https://wa.me/?text=${enc(`${article.title} ${url}`)}`} target="_blank" rel="noopener noreferrer">WhatsApp</a></Button>
        <Button size="sm" variant="outline" asChild><a href={`https://www.facebook.com/sharer/sharer.php?u=${enc(url)}`} target="_blank" rel="noopener noreferrer">Facebook</a></Button>
        <Button size="sm" variant="outline" asChild><a href={`mailto:?subject=${enc(article.title)}&body=${enc(url)}`}><Mail className="mr-1 h-4 w-4" />{t("cms.email")}</a></Button>
      </div>
    </article>
  );
};

const StoryPage = () => {
  const { slug } = useParams();
  const { t } = useTranslation();
  const [a, setA] = useState<Article | null | undefined>(undefined);
  useEffect(() => { db("articles").select("*").eq("slug", slug).eq("status", "published").maybeSingle().then(({ data }: any) => setA(data ?? null)); }, [slug]);
  return (
    <div className="container mx-auto max-w-3xl px-4 py-8">
      {a === undefined ? <div className="min-h-[50vh]" /> : a === null ? (
        <div className="py-16 text-center space-y-3"><p>{t("cms.notFound")}</p><Link to="/stories" className="text-primary underline">{t("cms.back")}</Link></div>
      ) : <ArticleView article={a} />}
    </div>
  );
};

export default StoryPage;
