import { Link } from "react-router-dom";
import { Separator } from "@/components/ui/separator";
import { Helmet } from "react-helmet-async";

import { tr } from "@/i18n/tr";
const Section = ({ title, children }: { title: string; children: React.ReactNode }) => (
  <section className="mb-8">
    <h2 className="font-serif text-xl font-semibold text-foreground mb-3">{title}</h2>
    <div className="text-muted-foreground leading-relaxed space-y-3">{children}</div>
  </section>
);

export default function Terms() {
  return (
    <div className="container mx-auto px-4 py-12 max-w-3xl">
      <Helmet>
        <title>{tr("a.ed7b67cc5c")}</title>
        <meta name="description" content="Reflectlife terms of use, including memorial donation, campaign transparency and payout terms." />
        <link rel="canonical" href="https://reflectlife.net/terms" />
      </Helmet>

      <h1 className="font-serif text-3xl md:text-4xl font-bold text-foreground mb-2">{tr("a.d35f2b98ed")}</h1>
      <p className="text-sm text-muted-foreground mb-8">{tr("a.9423608a3e")}</p>

      <p className="text-muted-foreground leading-relaxed mb-8">
        {tr("a.b03ed3b71c")}{" "}
        <Link to="/privacy-policy" className="text-primary underline underline-offset-4">{tr("a.9db108ba6b")}</Link> and{" "}
        <Link to="/cookie-policy" className="text-primary underline underline-offset-4">{tr("a.e6e178ccc8")}</Link>.
      </p>

      <Separator className="my-8" />

      <Section title={tr("a.5aada3e710")}>
        <p>{tr("a.41a8df26c3")}</p>
      </Section>

      <Section title={tr("a.0bf1afc96e")}>
        <p>{tr("a.947bc4fa99")}</p>
        <p>{tr("a.296167211a")}</p>
      </Section>

      <Section title={tr("a.0fc8e82b00")}>
        <p>{tr("a.83fa6953f2")}</p>
      </Section>

      <Section title={tr("a.e2ed98df84")}>
        <p>{tr("a.3280f989c1")}</p>
      </Section>

      <Section title={tr("a.dfb5d77dcc")}>
        <p>{tr("a.065a1471f1")}</p>
      </Section>

      <Separator className="my-8" />

      <h2 id="donations" className="font-serif text-2xl font-bold text-foreground mb-2">{tr("a.8ce6aa6b03")}</h2>
      <p className="text-sm text-muted-foreground mb-6">{tr("a.f147a1bea3")}</p>

      <Section title={tr("a.9d44e1ae8f")}>
        <p>{tr("a.54fdf06d70")}</p>
      </Section>

      <Section title={tr("a.5ce81a4a6b")}>
        <p>{tr("a.143465e3a7")}</p>
        <ul className="list-disc pl-6 space-y-1">
          <li><strong className="text-foreground">{tr("a.c176796fce")}</strong> {tr("a.ad9a4a46d9")}</li>
          <li><strong className="text-foreground">{tr("a.f45408c108")}</strong> {tr("a.3ef431bc1a")}</li>
          <li><strong className="text-foreground">{tr("a.b3b971d6f7")}</strong> {tr("a.db180d82c6")}</li>
        </ul>
      </Section>

      <Section title={tr("a.e33916087e")}>
        <p>{tr("a.9fa0ba9ac3")}</p>
      </Section>

      <Section title={tr("a.3019a26c83")}>
        <p>{tr("a.dbef2a69d9")}</p>
      </Section>
    </div>
  );
}
