import { Link } from "react-router-dom";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Flame, Heart } from "lucide-react";

import { tr } from "@/i18n/tr";
interface FeaturedPrayer {
  id: number;
  title: string;
  author: string;
  text: string;
}

const FEATURED_PRAYERS: FeaturedPrayer[] = [
  {
    id: 1,
    title: tr("a.83fee3cc6a"),
    author: "Andriy Shevchenko",
    text: tr("a.ff43566463"),
  },
  {
    id: 2,
    title: tr("a.48d507d570"),
    author: "Olena Melnyk",
    text: tr("a.a836c169c0"),
  },
  {
    id: 3,
    title: tr("a.f711a2c006"),
    author: "Oleksandr Kovalenko",
    text: tr("a.ab4611edd1"),
  },
  {
    id: 4,
    title: tr("a.a4087f66e9"),
    author: "Kateryna Bondarenko",
    text: tr("a.762d137ac0"),
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
                    {tr("a.5f313782fe")}
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
