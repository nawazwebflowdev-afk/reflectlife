import { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import { Card, CardContent } from "@/components/ui/card";
import { Heart } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { useTranslation } from "react-i18next";

interface Prayer {
  id: string;
  tribute_text: string;
  created_at: string;
  memorial_id: string;
  memorial_name: string;
}

const formatWhen = (iso: string) => {
  const diff = Date.now() - new Date(iso).getTime();
  const mins = Math.floor(diff / 60000);
  if (mins < 1) return "just now";
  if (mins < 60) return `${mins}m ago`;
  const hrs = Math.floor(mins / 60);
  if (hrs < 24) return `${hrs}h ago`;
  const days = Math.floor(hrs / 24);
  if (days < 7) return `${days}d ago`;
  return new Date(iso).toLocaleDateString();
};

export const LatestPrayers = () => {
  const { t } = useTranslation();
  const [prayers, setPrayers] = useState<Prayer[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const load = async () => {
      const { data } = await supabase
        .from("memorial_tributes")
        .select("id, tribute_text, created_at, memorial_id, memorials!inner(name, is_public, privacy_level)")
        .eq("memorials.is_public", true)
        .eq("memorials.privacy_level", "public")
        .order("created_at", { ascending: false })
        .limit(6);

      const rows: Prayer[] = (data ?? []).map((r: any) => ({
        id: r.id,
        tribute_text: r.tribute_text,
        created_at: r.created_at,
        memorial_id: r.memorial_id,
        memorial_name: r.memorials?.name ?? "",
      }));
      setPrayers(rows);
      setLoading(false);
    };
    load();
  }, []);

  if (loading) {
    return (
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6 max-w-5xl mx-auto">
        {[0, 1, 2, 3].map((i) => (
          <Card key={i} className="bg-card/50 border-2 animate-pulse">
            <CardContent className="p-8 h-40" />
          </Card>
        ))}
      </div>
    );
  }

  if (prayers.length === 0) {
    return (
      <div className="max-w-2xl mx-auto text-center">
        <Card className="bg-card/50 border-2">
          <CardContent className="p-10">
            <Heart className="w-8 h-8 mx-auto mb-4 text-primary" />
            <p className="text-muted-foreground italic leading-relaxed">
              {t("landing.prayersEmpty", "No prayers have been shared yet. Be the first to leave a tribute on a memorial page.")}
            </p>
          </CardContent>
        </Card>
      </div>
    );
  }

  return (
    <div className="grid grid-cols-1 md:grid-cols-2 gap-6 max-w-5xl mx-auto">
      {prayers.map((prayer, index) => (
        <Card
          key={prayer.id}
          className="bg-card/50 border-2 hover:shadow-elegant transition-smooth animate-fade-in"
          style={{ animationDelay: `${index * 100}ms` }}
        >
          <CardContent className="p-8">
            <div className="flex flex-col h-full">
              <Heart className="w-6 h-6 mb-3 text-primary" />
              <p className="text-muted-foreground italic mb-4 leading-relaxed line-clamp-5">
                "{prayer.tribute_text}"
              </p>
              <div className="mt-auto flex items-center justify-between text-sm">
                <Link
                  to={`/memorial/${prayer.memorial_id}`}
                  className="font-serif font-semibold text-foreground hover:text-primary transition-colors"
                >
                  {t("landing.prayersFor", "For")} {prayer.memorial_name}
                </Link>
                <span className="text-muted-foreground">{formatWhen(prayer.created_at)}</span>
              </div>
            </div>
          </CardContent>
        </Card>
      ))}
    </div>
  );
};

export default LatestPrayers;
