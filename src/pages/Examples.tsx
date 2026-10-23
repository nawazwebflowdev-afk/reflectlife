import { Link } from "react-router-dom";
import { useTranslation } from "react-i18next";
import { Flame, Image, Clock, Users } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Separator } from "@/components/ui/separator";

const Examples = () => {
  const { t } = useTranslation();

  const sections = [
    { icon: Flame, title: t("examples.candleTitle"), text: t("examples.candleText") },
    { icon: Image, title: t("examples.galleryTitle"), text: t("examples.galleryText") },
    { icon: Clock, title: t("examples.timelineTitle"), text: t("examples.timelineText") },
    { icon: Users, title: t("examples.treeTitle"), text: t("examples.treeText") },
  ];

  return (
    <div className="container mx-auto px-4 py-12 max-w-3xl">
      <h1 className="font-serif text-3xl md:text-4xl font-bold text-foreground mb-4">
        {t("examples.title")}
      </h1>
      <p className="text-muted-foreground leading-relaxed mb-8">{t("examples.subtitle")}</p>

      <div className="grid gap-4 sm:grid-cols-2 mb-8">
        {sections.map(({ icon: Icon, title, text }) => (
          <Card key={title} className="border-border/60">
            <CardContent className="p-5">
              <Icon className="w-6 h-6 text-primary mb-3" aria-hidden="true" />
              <h2 className="font-serif text-lg font-semibold text-foreground mb-2">{title}</h2>
              <p className="text-sm text-muted-foreground leading-relaxed">{text}</p>
            </CardContent>
          </Card>
        ))}
      </div>

      <Separator className="my-8" />

      <div className="flex flex-col sm:flex-row gap-3 justify-center">
        <Button asChild variant="outline">
          <Link to="/memorials">{t("examples.wallCta")}</Link>
        </Button>
        <Button asChild>
          <Link to="/signup">{t("examples.createCta")}</Link>
        </Button>
      </div>
    </div>
  );
};

export default Examples;
