import { useEffect, useState } from "react";
import { Link, useSearchParams } from "react-router-dom";
import { useTranslation } from "react-i18next";
import { Helmet } from "react-helmet-async";
import { formatDate } from "@/lib/dateFormat";
import { IMAGES, db, mediaUrl, type Article, type Category } from "@/lib/content";

const Cover = ({ path, alt }: { path: string | null; alt: string }) => {
  const [src, setSrc] = useState<string | null>(null);
  useEffect(() => { mediaUrl(IMAGES, path).then(setSrc); }, [path]);
  return <div className="aspect-[16/9] bg-muted">{src && <img src={src} alt={alt} loading="lazy" decoding="async" width={800} height={450} className="h-full w-full object-cover" />}</div>;
};

const Stories = () => {
  const { t } = useTranslation();
  const [params, setParams] = useSearchParams();
  const cat = params.get("category") ?? "";
  const [items, setItems] = useState<Article[] | null>(null);
  const [cats, setCats] = useState<Category[]>([]);

  useEffect(() => { db("content_categories").select("*").order("sort_order").then(({ data }: any) => setCats(data ?? [])); }, []);
  useEffect(() => {
    let q = db("articles").select("id,title,slug,excerpt,cover_image,category,publish_date").eq("status", "published").lte("publish_date", new Date().toISOString()).order("publish_date", { ascending: false });
    if (cat) q = q.eq("category", cat);
    q.then(({ data }: any) => setItems(data ?? []));
  }, [cat]);

  const chip = (a: boolean) => `rounded-full border px-3 py-1.5 text-sm ${a ? "bg-primary text-primary-foreground border-primary" : "border-border text-muted-foreground hover:text-foreground"}`;

  return (
    <div className="container mx-auto max-w-6xl px-4 py-10 space-y-8">
      <Helmet><title>{`${t("cms.stories")} | Reflectlife`}</title><meta name="description" content={t("cms.storiesSub")} /></Helmet>
      <header className="text-center space-y-2">
        <h1 className="font-serif text-3xl md:text-4xl font-bold">{t("cms.stories")}</h1>
        <p className="text-muted-foreground">{t("cms.storiesSub")}</p>
      </header>
      {!!cats.length && (
        <div className="flex flex-wrap justify-center gap-2">
          <button type="button" className={chip(!cat)} onClick={() => setParams({})}>{t("cms.all")}</button>
          {cats.map((c) => <button key={c.id} type="button" className={chip(cat === c.name)} onClick={() => setParams({ category: c.name })}>{c.name}</button>)}
        </div>
      )}
      {items === null ? <div className="min-h-[30vh]" /> : !items.length ? <p className="text-center text-muted-foreground">{t("cms.noStories")}</p> : (
        <div className="grid gap-6 sm:grid-cols-2 lg:grid-cols-3">
          {items.map((a) => (
            <Link key={a.id} to={`/stories/${a.slug}`} className="group overflow-hidden rounded-2xl border border-border bg-card shadow-sm hover:shadow-md transition-smooth">
              <Cover path={a.cover_image} alt={a.title} />
              <div className="p-4 space-y-2">
                <div className="flex items-center gap-2 text-xs text-muted-foreground">
                  {a.category && <span className="rounded-full bg-primary/10 px-2 py-0.5 text-primary">{a.category}</span>}
                  <time dateTime={a.publish_date}>{formatDate(a.publish_date)}</time>
                </div>
                <h2 className="font-serif text-lg font-semibold group-hover:text-primary">{a.title}</h2>
                {a.excerpt && <p className="text-sm text-muted-foreground line-clamp-3">{a.excerpt}</p>}
              </div>
            </Link>
          ))}
        </div>
      )}
    </div>
  );
};

export default Stories;
