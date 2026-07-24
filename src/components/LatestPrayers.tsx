import { Link } from "react-router-dom";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Flame, Heart } from "lucide-react";

interface FeaturedPrayer {
  id: number;
  title: string;
  author: string;
  text: string;
}

const FEATURED_PRAYERS: FeaturedPrayer[] = [
  {
    id: 1,
    title: "Prayer for Eternal Rest",
    author: "Andriy Shevchenko",
    text: "Eternal rest grant unto them, O Lord, and let perpetual light shine upon them. May they rest in peace, and may Your everlasting love surround them forever. Amen.",
  },
  {
    id: 2,
    title: "Eternal Memory",
    author: "Olena Melnyk",
    text: "May their memory be eternal. May their kindness never be forgotten. May their love continue to live in the hearts of those they touched. Though they have departed this world, their spirit remains with us always. Eternal memory.",
  },
  {
    id: 3,
    title: "Prayer for Peace",
    author: "Oleksandr Kovalenko",
    text: "Lord, receive this precious soul into Your heavenly kingdom. Grant them peace beyond all understanding. Comfort those who mourn, strengthen those who grieve, and remind us that love never ends. Amen.",
  },
  {
    id: 4,
    title: "The Shepherd's Prayer",
    author: "Kateryna Bondarenko",
    text: "The Lord is my Shepherd; I shall not want. He leads me beside still waters and restores my soul. Even though I walk through the valley of the shadow of death, I will fear no evil, for You are with me. Your love comforts me today and always.",
  },
];

export const LatestPrayers = () => {
  return (
    <div className="max-w-7xl mx-auto">
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6">
        {FEATURED_PRAYERS.map((prayer, index) => (
          <Card
            key={prayer.id}
            className="bg-card/60 border-2 hover:shadow-elegant transition-smooth animate-fade-in flex flex-col"
            style={{ animationDelay: `${index * 100}ms` }}
          >
            <CardContent className="p-6 flex flex-col h-full">
              <Heart className="w-6 h-6 mb-3 text-primary" />
              <h3 className="font-serif text-lg font-semibold text-foreground mb-3 leading-snug">
                {prayer.title}
              </h3>
              <p className="text-sm text-muted-foreground italic leading-relaxed mb-5">
                "{prayer.text}"
              </p>
              <div className="mt-auto pt-4 border-t border-border/60">
                <p className="text-xs uppercase tracking-wide text-muted-foreground mb-3">
                  — {prayer.author}
                </p>
                <Button
                  asChild
                  size="sm"
                  variant="secondary"
                  className="w-full rounded-full"
                >
                  <Link to={`/memorial-wall?prayer=${prayer.id}`}>
                    <Flame className="w-4 h-4 mr-2" />
                    Light a Candle with this Prayer
                  </Link>
                </Button>
              </div>
            </CardContent>
          </Card>
        ))}
      </div>
    </div>
  );
};

export default LatestPrayers;
