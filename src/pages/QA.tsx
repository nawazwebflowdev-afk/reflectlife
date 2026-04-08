import { useTranslation } from "react-i18next";
import { Helmet } from "react-helmet-async";
import {
  Accordion,
  AccordionContent,
  AccordionItem,
  AccordionTrigger,
} from "@/components/ui/accordion";

const faqItems = [
  { qKey: "q1", aKey: "a1" },
  { qKey: "q2", aKey: "a2" },
  { qKey: "q3", aKey: "a3" },
  { qKey: "q4", aKey: "a4" },
  { qKey: "q5", aKey: "a5" },
  { qKey: "q6", aKey: "a6" },
  { qKey: "q7", aKey: "a7" },
  { qKey: "q8", aKey: "a8" },
  { qKey: "q9", aKey: "a9" },
  { qKey: "q10", aKey: "a10" },
];

const QA = () => {
  const { t } = useTranslation();

  const structuredData = {
    "@context": "https://schema.org",
    "@type": "FAQPage",
    mainEntity: faqItems.map(({ qKey, aKey }) => ({
      "@type": "Question",
      name: t(`qa.${qKey}`),
      acceptedAnswer: {
        "@type": "Answer",
        text: t(`qa.${aKey}`),
      },
    })),
  };

  return (
    <>
      <Helmet>
        <title>Questions & Answers — Reflectlife | Online Memorial, Light a Candle Online</title>
        <meta
          name="description"
          content="Frequently asked questions about Reflectlife — online memorial pages, lighting candles, grief diary, remembering loved ones online, and more."
        />
        <script type="application/ld+json">{JSON.stringify(structuredData)}</script>
      </Helmet>

      <div className="container mx-auto px-4 py-12 max-w-3xl">
        <h1 className="font-serif text-3xl md:text-4xl font-bold text-foreground mb-2">
          {t("qa.title")}
        </h1>
        <p className="text-muted-foreground mb-8">{t("qa.subtitle")}</p>

        <Accordion type="single" collapsible className="space-y-3">
          {faqItems.map(({ qKey, aKey }, i) => (
            <AccordionItem key={qKey} value={`item-${i}`} className="border border-border rounded-lg px-5">
              <AccordionTrigger className="text-left font-medium text-foreground hover:no-underline py-4">
                {t(`qa.${qKey}`)}
              </AccordionTrigger>
              <AccordionContent className="text-muted-foreground leading-relaxed pb-4">
                {t(`qa.${aKey}`)}
              </AccordionContent>
            </AccordionItem>
          ))}
        </Accordion>
      </div>
    </>
  );
};

export default QA;
