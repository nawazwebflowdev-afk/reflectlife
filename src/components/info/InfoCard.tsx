import { Link } from "react-router-dom";
import { useTranslation } from "react-i18next";
import { BookOpen, PlayCircle, Sparkles } from "lucide-react";
import { formatDuration, type InfoItem } from "@/lib/info";

const InfoCard = ({ item }: { item: InfoItem }) => {
  const { t } = useTranslation();
  return (
    <Link to={`/info/${item.slug}`} className="group block rounded-2xl border border-border bg-card overflow-hidden shadow-sm hover:shadow-md transition-smooth focus:outline-none focus-visible:ring-2 focus-visible:ring-primary">
      <div className="relative aspect-[9/16] bg-muted">
        {item.thumbnail_url ? (
          <img src={item.thumbnail_url} alt={item.thumbnail_alt || item.title} loading="lazy" decoding="async" width={360} height={640} className="h-full w-full object-cover" />
        ) : (
          <div className="flex h-full items-center justify-center bg-gradient-to-b from-primary/10 to-accent/20 text-primary">
            {item.item_type === "guide" ? <BookOpen className="h-10 w-10" /> : <PlayCircle className="h-10 w-10" />}
          </div>
        )}
        {item.duration_seconds != null && (
          <span className="absolute bottom-2 right-2 rounded-md bg-foreground/75 px-1.5 py-0.5 text-xs text-background">{formatDuration(item.duration_seconds)}</span>
        )}
        {item.ai_assisted && item.item_type === "video" && (
          <span className="absolute top-2 left-2 inline-flex items-center gap-1 rounded-full bg-background/90 px-2 py-0.5 text-[11px] font-medium text-foreground">
            <Sparkles className="h-3 w-3" />{t("info.aiBadge")}
          </span>
        )}
      </div>
      <div className="p-3 space-y-2">
        <h3 className="font-serif text-sm font-semibold leading-snug line-clamp-2 group-hover:text-primary">{item.title}</h3>
        <div className="flex flex-wrap items-center gap-1.5 text-[11px]">
          <span className="rounded-full bg-primary/10 px-2 py-0.5 text-primary">{t(`info.${item.category}`)}</span>
          <span className="uppercase text-muted-foreground">{item.languages.join(" · ")}</span>
        </div>
      </div>
    </Link>
  );
};

export default InfoCard;
