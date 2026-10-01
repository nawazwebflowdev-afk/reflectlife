import { useEffect, useState } from "react";
import { useNavigate, useParams } from "react-router-dom";
import {
  supabase,
  SUPABASE_PUBLISHABLE_KEY,
  SUPABASE_URL,
} from "@/integrations/supabase/client";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Loader2, ShoppingCart, Lock, CreditCard } from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import { getCountryFlag } from "@/lib/countryFlags";

import { tr } from "@/i18n/tr";
import { optimizedImageUrl } from "@/lib/imageUrl";
interface Template {
  id: string;
  name: string;
  country: string;
  preview_url: string | null;
  price: number;
  description: string | null;
  creator_id: string | null;
  is_free: boolean;
}

const Checkout = () => {
  const { templateId } = useParams<{ templateId: string }>();
  const [template, setTemplate] = useState<Template | null>(null);
  const [loading, setLoading] = useState(true);
  const [processing, setProcessing] = useState(false);
  const [userId, setUserId] = useState<string | null>(null);
  const [alreadyOwned, setAlreadyOwned] = useState(false);
  const navigate = useNavigate();
  const { toast } = useToast();

  useEffect(() => {
    void checkAuthAndFetchTemplate();
  }, [templateId]);

  const getAuthenticatedUser = async () => {
    const {
      data: { session },
    } = await supabase.auth.getSession();

    if (!session) {
      return null;
    }

    await supabase.auth.refreshSession();

    const {
      data: { user },
      error,
    } = await supabase.auth.getUser();

    if (error || !user) {
      return null;
    }

    return user;
  };

  const checkAuthAndFetchTemplate = async () => {
    setLoading(true);

    const user = await getAuthenticatedUser();

    if (!user) {
      toast({
        title: tr("a.fbbe499440"),
        description: tr("a.bf2d23ff5d"),
        variant: "destructive",
      });
      navigate("/login");
      return;
    }

    setUserId(user.id);

    if (!templateId) {
      toast({
        title: tr("a.51ae02c551"),
        description: tr("a.a2d38583a8"),
        variant: "destructive",
      });
      navigate("/templates");
      return;
    }

    const { data: templateData, error: templateError } = await supabase
      .from("site_templates")
      .select("*")
      .eq("id", templateId)
      .single();

    if (templateError || !templateData) {
      toast({
        title: tr("a.834744e1f4"),
        description: tr("a.5325b8260b"),
        variant: "destructive",
      });
      navigate("/templates");
      return;
    }

    if (templateData.is_free) {
      toast({
        title: tr("a.26f7c651cd"),
        description: tr("a.68c26c80f4"),
      });
      navigate("/templates");
      return;
    }

    const { data: purchaseData } = await supabase
      .from("template_purchases")
      .select("id")
      .eq("buyer_id", user.id)
      .eq("template_id", templateId)
      .eq("payment_status", "success")
      .maybeSingle();

    setAlreadyOwned(Boolean(purchaseData));
    setTemplate(templateData);
    setLoading(false);
  };

  const applyOwnedTemplate = async () => {
    if (!template) return;

    const user = await getAuthenticatedUser();
    if (!user) {
      toast({
        title: tr("a.b828190ecb"),
        description: tr("a.06c76c0dad"),
        variant: "destructive",
      });
      navigate("/login");
      return;
    }

    setProcessing(true);

    const { error } = await supabase
      .from("profiles")
      .update({ template_id: template.id })
      .eq("id", user.id);

    setProcessing(false);

    if (error) {
      toast({
        title: tr("a.2625dbc908"),
        description: tr("a.5d114b4926"),
        variant: "destructive",
      });
      return;
    }

    toast({
      title: tr("a.8dc9d6251d"),
      description: tr("a.c561c040b8"),
    });
    navigate("/dashboard");
  };

  const handlePayment = async () => {
    if (!userId || !template) return;

    setProcessing(true);

    try {
      const user = await getAuthenticatedUser();

      if (!user) {
        throw new Error(tr("a.4b190cdcc1"));
      }

      const response = await fetch(`${SUPABASE_URL}/functions/v1/create-checkout-session`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${(await supabase.auth.getSession()).data.session?.access_token ?? ""}`,
          apikey: SUPABASE_PUBLISHABLE_KEY,
        },
        body: JSON.stringify({
          buyer_id: user.id,
          template_id: template.id,
        }),
      });

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data?.error || `Server error (${response.status})`);
      }

      if (data?.url) {
        window.location.href = data.url;
        return;
      }

      throw new Error("No checkout URL received. Response: " + JSON.stringify(data));
    } catch (error) {
      console.error("Checkout error:", error);
      toast({
        title: tr("a.4db451fbe8"),
        description:
          error instanceof Error
            ? error.message
            : tr("a.a43115275b"),
        variant: "destructive",
      });
      setProcessing(false);
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-gradient-subtle flex items-center justify-center">
        <Loader2 className="h-12 w-12 animate-spin text-primary" />
      </div>
    );
  }

  if (!template) {
    return null;
  }

  return (
    <div className="min-h-screen bg-gradient-subtle py-12 px-4">
      <div className="max-w-4xl mx-auto">
        <div className="text-center mb-8">
          <h1 className="font-serif text-3xl md:text-4xl font-bold mb-2">
            {tr("a.2290ff2868")}
          </h1>
          <p className="text-muted-foreground">{tr("a.ab2634aa92")}</p>
        </div>

        <div className="grid md:grid-cols-2 gap-6">
          <Card className="overflow-hidden shadow-elegant animate-fade-in">
            <div className="aspect-[3/4] overflow-hidden">
              <img
                src={optimizedImageUrl(template.preview_url) || "https://images.unsplash.com/photo-1485963631004-f2f00b1d6606?w=600"}
                alt={template.name}
                width={600}
                height={800}
                decoding="async"
                className="w-full h-full object-cover"
              />
            </div>
            <CardContent className="p-6 space-y-4">
              <div className="flex items-center gap-2">
                <span className="text-3xl">{getCountryFlag(template.country)}</span>
                <div>
                  <h2 className="font-serif text-2xl font-bold">{template.name}</h2>
                  <p className="text-sm text-muted-foreground">{template.country}</p>
                </div>
              </div>
              {template.description && (
                <p className="text-muted-foreground">{template.description}</p>
              )}
            </CardContent>
          </Card>

          <div className="space-y-6">
            <Card className="shadow-elegant animate-fade-in" style={{ animationDelay: "100ms" }}>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <ShoppingCart className="h-5 w-5" />
                  {tr("a.c7df8a995a")}
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="flex justify-between items-center py-3 border-b border-border">
                  <span className="text-muted-foreground">{tr("a.3ec1ae061c")}</span>
                  <span className="font-semibold">{template.name}</span>
                </div>
                <div className="flex justify-between items-center py-3 border-b border-border">
                  <span className="text-muted-foreground">{tr("a.3e8248e32e")}</span>
                  <span className="font-semibold">€{template.price.toFixed(2)}</span>
                </div>
                <div className="flex justify-between items-center py-3 text-lg font-bold">
                  <span>{tr("a.b25928c699")}</span>
                  <span className="text-primary">€{template.price.toFixed(2)}</span>
                </div>
              </CardContent>
            </Card>

            <Card className="shadow-elegant animate-fade-in" style={{ animationDelay: "200ms" }}>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <CreditCard className="h-5 w-5" />
                  {tr("a.88b8328c7c")}
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="bg-muted/50 p-4 rounded-md space-y-2">
                  <div className="flex items-center gap-2 text-sm">
                    <Lock className="h-4 w-4 text-primary" />
                    <span className="font-semibold">{tr("a.bcb0285a5a")}</span>
                  </div>
                  <p className="text-xs text-muted-foreground">
                    {tr("a.7d279e12de")}
                  </p>
                </div>

                {alreadyOwned ? (
                  <div className="space-y-4">
                    <Badge variant="secondary" className="w-full justify-center py-2">
                      {tr("a.51f1ade00a")}
                    </Badge>
                    <Button className="w-full" onClick={applyOwnedTemplate} disabled={processing}>
                      {processing ? (
                        <>
                          <Loader2 className="h-4 w-4 animate-spin mr-2" />
                          {tr("a.b299bfbb38")}
                        </>
                      ) : (
                        tr("a.89f4a0a600")
                      )}
                    </Button>
                    <Button
                      className="w-full"
                      variant="outline"
                      onClick={() => navigate("/templates")}
                      disabled={processing}
                    >
                      {tr("a.32ded662f3")}
                    </Button>
                  </div>
                ) : (
                  <>
                    <Button
                      className="w-full shadow-elegant"
                      size="lg"
                      onClick={handlePayment}
                      disabled={processing}
                    >
                      {processing ? (
                        <>
                          <Loader2 className="h-4 w-4 animate-spin mr-2" />
                          {tr("a.272bc02ec5")}
                        </>
                      ) : (
                        <>
                          <Lock className="h-4 w-4 mr-2" />
                          {tr("a.3d8fda3253")}
                        </>
                      )}
                    </Button>

                    <Button
                      className="w-full"
                      variant="ghost"
                      onClick={() => navigate("/templates")}
                      disabled={processing}
                    >
                      {tr("a.77dfd2135f")}
                    </Button>
                  </>
                )}
              </CardContent>
            </Card>

            <p className="text-xs text-center text-muted-foreground">
              {tr("a.a5e3ebeb31")}
            </p>
          </div>
        </div>
      </div>
    </div>
  );
};

export default Checkout;
