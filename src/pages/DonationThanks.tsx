import { useEffect } from "react";
import { track } from "@/lib/analytics";
import { useTranslation } from "react-i18next";
import { Link, useSearchParams } from "react-router-dom";
import { Helmet } from "react-helmet-async";
import { toast } from "sonner";
import Navigation from "@/components/Navigation";
import Footer from "@/components/Footer";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Flame, Share2, Heart } from "lucide-react";

export default function DonationThanks() {
  useEffect(() => { track("Donation Completed"); }, []);
  const { t } = useTranslation();
  const [params] = useSearchParams();
  const raw = params.get("memorial") ?? "";
  const slug = /^[a-z0-9-]{1,80}$/i.test(raw) ? raw : "";
  const path = slug ? `/memorial/${slug}` : "/memorials";

  const share = async () => {
    const url = `https://reflectlife.net${path}`;
    if (navigator.share) { try { await navigator.share({ url }); return; } catch { /* cancelled */ } }
    await navigator.clipboard.writeText(url);
    toast.success(url);
  };

  return (
    <div className="min-h-screen flex flex-col bg-background">
      <Helmet><meta name="robots" content="noindex" /></Helmet>
      <Navigation />
      <main className="flex-1 container mx-auto px-4 py-16 max-w-xl">
        <Card className="shadow-elegant text-center">
          <CardContent className="p-8 space-y-5">
            <Heart className="h-10 w-10 mx-auto text-primary" />
            <h1 className="text-2xl font-semibold">{t("don.thanksTitle")}</h1>
            <p className="text-muted-foreground">{t("don.thanksText")}</p>
            <div className="flex flex-col sm:flex-row gap-3 justify-center">
              <Button asChild><Link to={`${path}#candles-of-remembrance`}><Flame className="mr-2 h-4 w-4" />{t("don.lightCandle")}</Link></Button>
              <Button variant="outline" onClick={share}><Share2 className="mr-2 h-4 w-4" />{t("don.share")}</Button>
            </div>
            <Link to={path} className="text-sm underline text-muted-foreground block">{t("don.backToMemorial")}</Link>
          </CardContent>
        </Card>
      </main>
      <Footer />
    </div>
  );
}
