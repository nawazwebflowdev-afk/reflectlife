import { useEffect, useMemo, useState } from "react";
import { useSearchParams } from "react-router-dom";
import { useTranslation } from "react-i18next";
import { Loader2 } from "lucide-react";
import Fuse from "fuse.js";
import { Card, CardContent } from "@/components/ui/card";
import InfoCard from "@/components/info/InfoCard";
import { infoTable, INFO_CATEGORIES, INFO_LANGS, type InfoItem } from "@/lib/info";

const InfoBoard = () => {
  const { t } = useTranslation();
  const [params, setParams] = useSearchParams();
  const [items, setItems] = useState<InfoItem[]>([]);
  const [loading, setLoading] = useState(true);

  const q = params.get("q") || "";
  const cat = params.get("cat") || "all";
  const lang = params.get("lang") || "all";

  useEffect(() => {
    const load = async () => {
      const { data, error } = await infoTable()
        .select("*")
        .order("sort_order", { ascending: true })
        .order("publish_at", { ascending: false });
      if (error) console.error("info load", error);
      setItems((data as InfoItem[]) || []);
      setLoading(false);
    };
    load();
  }, []);

  const setParam = (key: string, value: string) => {
    const next = new URLSearchParams(params);
    if (value && value !== "all") next.set(key, value);
    else next.delete(key);
    setParams(next, { replace: true });
  };

  const filtered = useMemo(() => {
    const list = items.filter(
      (i) =>
        (cat === "all" || i.category === cat) &&
        (lang === "all" || i.languages.includes(lang))
    );
    if (!q.trim()) return list;

    // Fuzzy search so small typos, word order and synonyms still find the clip.
    const fuse = new Fuse(list, {
      includeScore: true,
      threshold: 0.38,
      ignoreLocation: true,
      keys: [
        { name: "title", weight: 3 },
        { name: "tags", weight: 2 },
        { name: "description", weight: 2 },
        { name: "category", weight: 1 },
        { name: "body", weight: 1 },
      ],
    });
    return fuse
      .search(q.trim())
      .map((r) => r.item)
      .filter((i) => i.category === cat || cat === "all")
      .filter((i) => i.languages.includes(lang) || lang === "all");
  }, [items, q, cat, lang]);

  const featured = filtered.filter((i) => i.featured).slice(0, 10);
  const newest = [...filtered].sort((a, b) => b.publish_at.localeCompare(a.publish_at)).slice(0, 10);
  const inRow = new Set([...featured.map((i) => i.id), ...newest.map((i) => i.id)]);
  const rest = filtered.filter((i) => !inRow.has(i.id));

  const catLabel = (c: string) => t(`info.${c}`);

  return (
    <div className="container mx-auto px-4 py-10 max-w-6xl">
      <header className="space-y-2 pb-2">
        <h1 className="font-serif text-3xl font-bold">{t("info.title")}</h1>
        <p className="max-w-2xl text-muted-foreground">{t("info.subtitle")}</p>
      </header>

      <div className="flex flex-wrap items-center gap-2 mb-4">
        <input
          value={q}
          onChange={(e) => setParam("q", e.target.value)}
          placeholder={t("info.search")}
          aria-label={t("info.search")}
          className="flex-1 min-w-[220px] rounded-xl border border-border bg-background px-4 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-primary/40"
        />
        <select
          value={lang}
          onChange={(e) => setParam("lang", e.target.value)}
          aria-label={t("info.language")}
          className="rounded-xl border border-border bg-background px-3 py-2.5 text-sm"
        >
          <option value="all">{t("info.anyLang")}</option>
          {INFO_LANGS.map((l) => (
            <option key={l} value={l}>
              {l.toUpperCase()}
            </option>
          ))}
        </select>
      </div>

      <div className="flex flex-wrap gap-2 mb-8">
        <button
          onClick={() => setParam("cat", "all")}
          className={`rounded-full px-4 py-1.5 text-sm border transition-smooth ${
            cat === "all" ? "bg-primary text-primary-foreground border-primary" : "border-border text-foreground hover:border-primary/50"
          }`}
        >
          {t("info.all")}
        </button>
        {INFO_CATEGORIES.map((c) => (
          <button
            key={c}
            onClick={() => setParam("cat", c)}
            className={`rounded-full px-4 py-1.5 text-sm border transition-smooth ${
              cat === c ? "bg-primary text-primary-foreground border-primary" : "border-border text-foreground hover:border-primary/50"
            }`}
          >
            {catLabel(c)}
          </button>
        ))}
      </div>

      {loading ? (
        <div className="flex justify-center py-24 text-muted-foreground">
          <Loader2 className="h-6 w-6 animate-spin" />
        </div>
      ) : filtered.length === 0 ? (
        <Card>
          <CardContent className="py-10 text-center text-muted-foreground">
            {q.trim() ? t("info.empty", { q }) : t("info.noItems")}
          </CardContent>
        </Card>
      ) : (
        <div className="space-y-12">
          {featured.length > 0 && (
            <section>
              <h2 className="font-serif text-xl font-semibold mb-4">{t("info.featured")}</h2>
              <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-5 gap-4">
                {featured.map((i) => (
                  <InfoCard key={i.id} item={i} />
                ))}
              </div>
            </section>
          )}

          {newest.length > 0 && (
            <section>
              <h2 className="font-serif text-xl font-semibold mb-4">{t("info.newest")}</h2>
              <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-5 gap-4">
                {newest.map((i) => (
                  <InfoCard key={i.id} item={i} />
                ))}
              </div>
            </section>
          )}

          {INFO_CATEGORIES.filter((c) => rest.some((i) => i.category === c)).map((c) => (
            <section key={c}>
              <h2 className="font-serif text-xl font-semibold mb-4">{catLabel(c)}</h2>
              <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-5 gap-4">
                {rest.filter((i) => i.category === c).map((i) => (
                  <InfoCard key={i.id} item={i} />
                ))}
              </div>
            </section>
          ))}
        </div>
      )}
    </div>
  );
};

export default InfoBoard;
