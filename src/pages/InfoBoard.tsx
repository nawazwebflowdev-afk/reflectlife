import { useEffect, useMemo, useState } from "react";
import { useSearchParams } from "react-router-dom";
import { useTranslation } from "react-i18next";
import { Helmet } from "react-helmet-async";
import Fuse from "fuse.js";
import { Search } from "lucide-react";
import { Input } from "@/components/ui/input";
import InfoCard from "@/components/info/InfoCard";
import { INFO_CATEGORIES, INFO_LANGS, infoTable, type InfoItem } from "@/lib/info";

const Row = ({ title, items }: { title: string; items: InfoItem[] }) =>
  items.length ? (
    <section className="space-y-3">
      <h2 className="font-serif text-xl font-semibold">{title}</h2>
      <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-5">
        {items.map((i) => <InfoCard key={i.id} item={i} />)}
      </div>
    </section>
  ) : null;

const InfoBoard = () => {
  const { t } = useTranslation();
  const [params, setParams] = useSearchParams();
  const [items, setItems] = useState<InfoItem[]>([]);
  const [loading, setLoading] = useState(true);
  const q = params.get("q") ?? "";
  const cat = params.get("cat") ?? "all";
  const lang = params.get("lang") ?? "all";

  const setParam = (k: string, v: string) => {
    const next = new URLSearchParams(params);
    if (!v || v === "all") next.delete(k); else next.set(k, v);
    setParams(next, { replace: true });
  };

  useEffect(() => {
    infoTable().select("*").order("publish_at", { ascending: false }).then(({ data }: any) => {
      setItems(data ?? []);
      setLoading(false);
    });
  }, []);

  const filtered = useMemo(
    () => items.filter((i) => (cat === "all" || i.category === cat) && (lang === "all" || i.languages.includes(lang))),
    [items, cat, lang],
  );

  const fuse = useMemo(() => new Fuse(filtered.map((i) => ({ ...i, catLabel: t(`info.${i.category}`) })), {
    keys: [{ name: "title", weight: 3 }, { name: "tags", weight: 2 }, { name: "description", weight: 2 }, "catLabel", "category", "body"],
    threshold: 0.38, ignoreLocation: true, minMatchCharLength: 2,
  }), [filtered, t]);

  const results = q.trim() ? fuse.search(q.trim()).map((r) => r.item as InfoItem) : null;

  const chip = (active: boolean) =>
    `rounded-full border px-3 py-1.5 text-sm transition-smooth focus:outline-none focus-visible:ring-2 focus-visible:ring-primary ${active ? "bg-primary text-primary-foreground border-primary" : "bg-card border-border text-muted-foreground hover:text-foreground"}`;

  return (
    <div className="container mx-auto max-w-6xl px-4 py-8 space-y-8">
      <Helmet>
        <title>{`${t("info.title")} | Reflectlife`}</title>
        <meta name="description" content={t("info.subtitle")} />
      </Helmet>
      <header className="space-y-3 text-center">
        <h1 className="font-serif text-3xl md:text-4xl font-bold">{t("info.title")}</h1>
        <p className="mx-auto max-w-2xl text-muted-foreground">{t("info.subtitle")}</p>
      </header>

      <div className="space-y-3">
        <div className="relative">
          <Search className="absolute left-4 top-1/2 h-5 w-5 -translate-y-1/2 text-muted-foreground" aria-hidden />
          <Input type="search" value={q} onChange={(e) => setParam("q", e.target.value)} placeholder={t("info.search")}
            aria-label={t("info.search")} className="h-14 rounded-2xl pl-12 text-base" />
        </div>
        <div className="flex flex-wrap gap-2" role="group" aria-label={t("info.category")}>
          {["all", ...INFO_CATEGORIES].map((c) => (
            <button key={c} type="button" onClick={() => setParam("cat", c)} className={chip(cat === c)} aria-pressed={cat === c}
              title={c === "all" ? undefined : t(`info.${c}Hint`)}>{t(`info.${c}`)}</button>
          ))}
        </div>
        <div className="flex flex-wrap gap-2" role="group" aria-label={t("info.language")}>
          {["all", ...INFO_LANGS].map((l) => (
            <button key={l} type="button" onClick={() => setParam("lang", l)} className={chip(lang === l)} aria-pressed={lang === l}>
              {l === "all" ? t("info.anyLang") : l.toUpperCase()}
            </button>
          ))}
        </div>
      </div>

      {loading ? (
        <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-5">
          {Array.from({ length: 5 }).map((_, i) => <div key={i} className="aspect-[9/16] rounded-2xl bg-muted animate-pulse" />)}
        </div>
      ) : results ? (
        results.length ? <Row title={t("info.results")} items={results} />
          : <p className="rounded-2xl border border-border bg-card p-6 text-center text-muted-foreground">{t("info.empty", { q })}</p>
      ) : null}

      {!loading && (
        <>
          {!items.length && <p className="text-center text-muted-foreground">{t("info.noItems")}</p>}
          <Row title={t("info.featured")} items={filtered.filter((i) => i.featured).slice(0, 10)} />
          <Row title={t("info.newest")} items={filtered.slice(0, 10)} />
          {INFO_CATEGORIES.map((c) => cat === "all" || cat === c ? (
            <Row key={c} title={`${t(`info.${c}`)} · ${t(`info.${c}Hint`)}`} items={filtered.filter((i) => i.category === c)} />
          ) : null)}
        </>
      )}
    </div>
  );
};

export default InfoBoard;
