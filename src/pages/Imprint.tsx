import { useTranslation } from "react-i18next";
import { Separator } from "@/components/ui/separator";

const Imprint = () => {
  const { t } = useTranslation();

  return (
    <div className="container mx-auto px-4 py-12 max-w-3xl">
      <h1 className="font-serif text-3xl md:text-4xl font-bold text-foreground mb-8">
        {t("imprint.title")}
      </h1>

      <section className="mb-8">
        <h2 className="font-serif text-xl font-semibold text-foreground mb-4">
          {t("imprint.providerTitle")}
        </h2>
        <div className="text-muted-foreground leading-relaxed">
          <p>Sypera UG (haftungsbeschränkt)</p>
          <p>Rablstraße [HOUSE NUMBER]</p>
          <p>81669 München</p>
          <p>Deutschland</p>
        </div>
      </section>

      <section className="mb-8">
        <h2 className="font-serif text-xl font-semibold text-foreground mb-4">
          {t("imprint.representedByTitle")}
        </h2>
        <p className="text-muted-foreground leading-relaxed">Sylvia Perez Andrae</p>
      </section>

      <Separator className="my-8" />

      <section className="mb-8">
        <h2 className="font-serif text-xl font-semibold text-foreground mb-4">
          {t("imprint.contactTitle")}
        </h2>
        <div className="space-y-2 text-muted-foreground leading-relaxed">
          <p>
            {t("imprint.phoneLabel")}: {" "}
            <a href="tel:+4915140017533" className="text-primary hover:underline">+49 151 40017533</a>
          </p>
          <p>
            {t("imprint.emailLabel")}: {" "}
            <a href="mailto:sypera.sylvia@gmail.com" className="text-primary hover:underline">sypera.sylvia@gmail.com</a>
          </p>
        </div>
      </section>

      <section className="mb-8">
        <h2 className="font-serif text-xl font-semibold text-foreground mb-4">
          {t("imprint.registerTitle")}
        </h2>
        <div className="text-muted-foreground leading-relaxed">
          <p>{t("imprint.registerCourtLabel")}: Amtsgericht München</p>
          <p>{t("imprint.registerNumberLabel")}: HRB [NUMBER]</p>
        </div>
      </section>

      <section className="mb-8">
        <h2 className="font-serif text-xl font-semibold text-foreground mb-4">
          {t("imprint.vatTitle")}
        </h2>
        <p className="text-muted-foreground leading-relaxed">
          {t("imprint.vatLabel")}: [DE NUMBER]
        </p>
      </section>

      <Separator className="my-8" />

      <section className="mb-8">
        <h2 className="font-serif text-xl font-semibold text-foreground mb-4">
          {t("imprint.contentResponsibilityTitle")}
        </h2>
        <p className="text-muted-foreground leading-relaxed">
          Sylvia Perez Andrae, {t("imprint.addressAsAbove")}
        </p>
      </section>

      <section>
        <h2 className="font-serif text-xl font-semibold text-foreground mb-4">
          {t("imprint.disputeTitle")}
        </h2>
        <p className="text-muted-foreground leading-relaxed">{t("imprint.disputeBody")}</p>
      </section>
    </div>
  );
};

export default Imprint;