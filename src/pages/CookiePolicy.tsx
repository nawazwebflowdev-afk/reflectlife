import { Link } from "react-router-dom";
import { useTranslation } from "react-i18next";
import { Separator } from "@/components/ui/separator";

const CookiePolicy = () => {
  const { t } = useTranslation();

  return (
    <div className="container mx-auto px-4 py-12 max-w-3xl">
      <h1 className="font-serif text-3xl md:text-4xl font-bold text-foreground mb-2">
        {t("cookiePolicy.title")}
      </h1>
      <p className="text-sm text-muted-foreground mb-8">{t("cookiePolicy.lastUpdated")}</p>

      <p className="text-muted-foreground leading-relaxed mb-8">
        {t("cookiePolicy.intro")}
      </p>

      <Separator className="my-8" />

      <section className="mb-8">
        <h2 className="font-serif text-xl font-semibold text-foreground mb-4">
          {t("cookiePolicy.whatTitle")}
        </h2>
        <p className="text-muted-foreground leading-relaxed">
          {t("cookiePolicy.whatBody")}
        </p>
      </section>

      <Separator className="my-8" />

      <section className="mb-8">
        <h2 className="font-serif text-xl font-semibold text-foreground mb-4">
          {t("cookiePolicy.howTitle")}
        </h2>

        <div className="space-y-6">
          <div>
            <p className="text-foreground font-semibold mb-1">{t("cookiePolicy.essentialLabel")}</p>
            <p className="text-muted-foreground leading-relaxed">{t("cookiePolicy.essentialBody")}</p>
          </div>
          <div>
            <p className="text-foreground font-semibold mb-1">{t("cookiePolicy.analyticsLabel")}</p>
            <p className="text-muted-foreground leading-relaxed">{t("cookiePolicy.analyticsBody")}</p>
          </div>
          <div>
            <p className="text-foreground font-semibold mb-1">{t("cookiePolicy.personalizationLabel")}</p>
            <p className="text-muted-foreground leading-relaxed">{t("cookiePolicy.personalizationBody")}</p>
          </div>
        </div>
      </section>

      <Separator className="my-8" />

      <section className="mb-8">
        <h2 className="font-serif text-xl font-semibold text-foreground mb-4">
          {t("cookiePolicy.controlTitle")}
        </h2>
        <div className="space-y-4">
          <p className="text-muted-foreground leading-relaxed">
            <span className="font-semibold text-foreground">{t("cookiePolicy.controlBanner")}</span>{" "}
            {t("cookiePolicy.controlBannerDesc")}
          </p>
          <p className="text-muted-foreground leading-relaxed">
            <span className="font-semibold text-foreground">{t("cookiePolicy.controlBrowser")}</span>{" "}
            {t("cookiePolicy.controlBrowserDesc")}
          </p>
          <p className="text-muted-foreground leading-relaxed">
            <span className="font-semibold text-foreground">{t("cookiePolicy.controlGPC")}</span>{" "}
            {t("cookiePolicy.controlGPCDesc")}
          </p>
        </div>
      </section>

      <Separator className="my-8" />

      <section className="mb-8">
        <h2 className="font-serif text-xl font-semibold text-foreground mb-4">
          {t("cookiePolicy.changesTitle")}
        </h2>
        <p className="text-muted-foreground leading-relaxed">
          {t("cookiePolicy.changesBody")}
        </p>
      </section>

      <Separator className="my-8" />

      <section className="mb-8">
        <h2 className="font-serif text-xl font-semibold text-foreground mb-4">
          {t("cookiePolicy.moreTitle")}
        </h2>
        <p className="text-muted-foreground leading-relaxed mb-2">
          {t("cookiePolicy.morePrivacy")}{" "}
          <Link to="/privacy-policy" className="text-primary hover:underline">
            {t("footer.privacyPolicy")}
          </Link>.
        </p>
        <p className="text-muted-foreground leading-relaxed">
          {t("cookiePolicy.moreContact")}{" "}
          <a href="mailto:sypera.sylvia@gmail.com" className="text-primary hover:underline">
            sypera.sylvia@gmail.com
          </a>
        </p>
      </section>
    </div>
  );
};

export default CookiePolicy;
