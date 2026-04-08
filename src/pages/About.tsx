import { Link } from "react-router-dom";
import { useTranslation } from "react-i18next";
import { Separator } from "@/components/ui/separator";

const About = () => {
  const { t } = useTranslation();

  return (
    <div className="container mx-auto px-4 py-12 max-w-3xl">
      <h1 className="font-serif text-3xl md:text-4xl font-bold text-foreground mb-8">
        {t("about.title")}
      </h1>

      <p className="text-muted-foreground leading-relaxed mb-4">{t("about.intro1")}</p>
      <p className="text-muted-foreground leading-relaxed mb-8">{t("about.intro2")}</p>

      <div className="space-y-3 mb-8">
        <p className="text-foreground">{t("about.feature1")}</p>
        <p className="text-foreground">{t("about.feature2")}</p>
        <p className="text-foreground">{t("about.feature3")}</p>
        <p className="text-foreground">{t("about.feature4")}</p>
      </div>

      <Separator className="my-8" />

      <section className="mb-6">
        <p className="text-muted-foreground leading-relaxed">{t("about.control")}</p>
      </section>
      <section className="mb-6">
        <p className="text-muted-foreground leading-relaxed">{t("about.connection")}</p>
      </section>
      <section className="mb-8">
        <p className="text-muted-foreground leading-relaxed">{t("about.purpose")}</p>
      </section>

      <Separator className="my-8" />

      <div className="text-center">
        <p className="text-lg md:text-xl italic text-foreground/80 leading-relaxed mb-2">
          {t("about.closing1")}
        </p>
        <p className="text-lg md:text-xl italic text-foreground/80 leading-relaxed">
          {t("about.closing2")}
        </p>
      </div>

      <p className="text-center mt-8 text-muted-foreground text-sm">
        <Link to="/" className="text-primary hover:underline">{t("about.backHome")}</Link>
      </p>
    </div>
  );
};

export default About;
