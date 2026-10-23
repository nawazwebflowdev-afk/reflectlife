import { Link } from "react-router-dom";
import { useTranslation } from "react-i18next";
import { Flame, LayoutTemplate, HeartHandshake, BookOpen } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Separator } from "@/components/ui/separator";

const Pricing = () => {
  const { t } = useTranslation();

  return (
    <div className="container mx-auto px-4 py-12 max-w-3xl">
      <h1 className="font-serif text-3xl md:text-4xl font-bold text-foreground mb-4">
        {t("pricing.title")}
      </h1>
      <p className="text-muted-foreground leading-relaxed mb-8">{t("pricing.subtitle")}</p>

      <div className="grid gap-4 sm:grid-cols-2 mb-8">
        <Card className="border-border/60">
          <CardContent className="p-5">
            <BookOpen className="w-6 h-6 text-primary mb-3" aria-hidden="true" />
            <h2 className="font-serif text-lg font-semibold text-foreground mb-1">{t("pricing.memorialTitle")}</h2>
            <p className="text-xl font-semibold text-primary mb-2">{t("pricing.memorialPrice")}</p>
            <p className="text-sm text-muted-foreground leading-relaxed">{t("pricing.memorialDesc")}</p>
          </CardContent>
        </Card>

        <Card className="border-border/60">
          <CardContent className="p-5">
            <Flame className="w-6 h-6 text-primary mb-3" aria-hidden="true" />
            <h2 className="font-serif text-lg font-semibold text-foreground mb-2">{t("pricing.candlesTitle")}</h2>
            <p className="text-sm text-muted-foreground leading-relaxed mb-3">{t("pricing.candlesDesc")}</p>
            <ul className="text-sm text-foreground space-y-1">
              <li>{t("pricing.candleFree")}</li>
              <li>{t("pricing.candleMonthly")}</li>
              <li>{t("pricing.candleYearly")}</li>
            </ul>
          </CardContent>
        </Card>

        <Card className="border-border/60">
          <CardContent className="p-5">
            <LayoutTemplate className="w-6 h-6 text-primary mb-3" aria-hidden="true" />
            <h2 className="font-serif text-lg font-semibold text-foreground mb-1">{t("pricing.templatesTitle")}</h2>
            <p className="text-xl font-semibold text-primary mb-2">{t("pricing.templatesPrice")}</p>
            <p className="text-sm text-muted-foreground leading-relaxed">{t("pricing.templatesDesc")}</p>
          </CardContent>
        </Card>

        <Card className="border-border/60">
          <CardContent className="p-5">
            <HeartHandshake className="w-6 h-6 text-primary mb-3" aria-hidden="true" />
            <h2 className="font-serif text-lg font-semibold text-foreground mb-2">{t("pricing.donationsTitle")}</h2>
            <p className="text-sm text-muted-foreground leading-relaxed">{t("pricing.donationsDesc")}</p>
          </CardContent>
        </Card>
      </div>

      <Separator className="my-8" />

      <p className="text-center text-muted-foreground text-sm mb-6">{t("pricing.note")}</p>

      <div className="text-center">
        <Button asChild>
          <Link to="/signup">{t("examples.createCta")}</Link>
        </Button>
      </div>
    </div>
  );
};

export default Pricing;
