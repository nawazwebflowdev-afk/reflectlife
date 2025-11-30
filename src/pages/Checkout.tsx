import { useEffect, useState } from "react";
import { useNavigate, useParams } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Loader2, ShoppingCart, Lock, CreditCard } from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import { getCountryFlag } from "@/lib/countryFlags";

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
    checkAuthAndFetchTemplate();
  }, [templateId]);

  const checkAuthAndFetchTemplate = async () => {
    // Check authentication
    const { data: { session } } = await supabase.auth.getSession();
    
    if (!session?.user) {
      toast({
        title: "Authentication Required",
        description: "Please sign in to purchase templates",
        variant: "destructive",
      });
      navigate("/login");
      return;
    }

    setUserId(session.user.id);

    if (!templateId) {
      toast({
        title: "Invalid Template",
        description: "Template not found",
        variant: "destructive",
      });
      navigate("/templates");
      return;
    }

    // Fetch template details
    const { data: templateData, error: templateError } = await supabase
      .from("site_templates")
      .select("*")
      .eq("id", templateId)
      .single();

    if (templateError || !templateData) {
      toast({
        title: "Template Not Found",
        description: "The requested template does not exist",
        variant: "destructive",
      });
      navigate("/templates");
      return;
    }

    // Check if template is free
    if (templateData.is_free) {
      toast({
        title: "Free Template",
        description: "This template is free. Redirecting...",
      });
      navigate("/templates");
      return;
    }

    // Check if user already owns this template
    const { data: purchaseData } = await supabase
      .from("template_purchases")
      .select("id")
      .eq("buyer_id", session.user.id)
      .eq("template_id", templateId)
      .eq("payment_status", "success")
      .single();

    if (purchaseData) {
      setAlreadyOwned(true);
    }

    setTemplate(templateData);
    setLoading(false);
  };

  const handlePayment = async () => {
    if (!userId || !template) return;

    setProcessing(true);

    try {
      const { data, error } = await supabase.functions.invoke('create-checkout-session', {
        body: { 
          buyer_id: userId, 
          template_id: template.id 
        }
      });

      if (error) throw error;

      if (data?.url) {
        window.location.href = data.url;
      } else {
        throw new Error("No checkout URL received");
      }
    } catch (error) {
      console.error("Checkout error:", error);
      toast({
        title: "Checkout Failed",
        description: "Unable to start checkout. Please try again.",
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
            Complete Your Purchase
          </h1>
          <p className="text-muted-foreground">
            Secure checkout powered by Stripe
          </p>
        </div>

        <div className="grid md:grid-cols-2 gap-6">
          {/* Template Preview */}
          <Card className="overflow-hidden shadow-elegant animate-fade-in">
            <div className="aspect-[3/4] overflow-hidden">
              <img
                src={template.preview_url || "https://images.unsplash.com/photo-1485963631004-f2f00b1d6606?w=600"}
                alt={template.name}
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

          {/* Payment Details */}
          <div className="space-y-6">
            <Card className="shadow-elegant animate-fade-in" style={{ animationDelay: "100ms" }}>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <ShoppingCart className="h-5 w-5" />
                  Order Summary
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="flex justify-between items-center py-3 border-b border-border">
                  <span className="text-muted-foreground">Template</span>
                  <span className="font-semibold">{template.name}</span>
                </div>
                <div className="flex justify-between items-center py-3 border-b border-border">
                  <span className="text-muted-foreground">Price</span>
                  <span className="font-semibold">€{template.price.toFixed(2)}</span>
                </div>
                <div className="flex justify-between items-center py-3 text-lg font-bold">
                  <span>Total</span>
                  <span className="text-primary">€{template.price.toFixed(2)}</span>
                </div>
              </CardContent>
            </Card>

            <Card className="shadow-elegant animate-fade-in" style={{ animationDelay: "200ms" }}>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <CreditCard className="h-5 w-5" />
                  Payment Information
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="bg-muted/50 p-4 rounded-md space-y-2">
                  <div className="flex items-center gap-2 text-sm">
                    <Lock className="h-4 w-4 text-primary" />
                    <span className="font-semibold">Secure Payment</span>
                  </div>
                  <p className="text-xs text-muted-foreground">
                    Your payment information is processed securely through Stripe.
                  </p>
                </div>

                {alreadyOwned ? (
                  <div className="space-y-4">
                    <Badge variant="secondary" className="w-full justify-center py-2">
                      You already own this template
                    </Badge>
                    <Button 
                      className="w-full" 
                      variant="outline"
                      onClick={() => navigate("/dashboard")}
                    >
                      Go to Dashboard
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
                          Processing...
                        </>
                      ) : (
                        <>
                          <Lock className="h-4 w-4 mr-2" />
                          Proceed to Secure Checkout
                        </>
                      )}
                    </Button>

                    <Button 
                      className="w-full" 
                      variant="ghost"
                      onClick={() => navigate("/templates")}
                      disabled={processing}
                    >
                      Cancel
                    </Button>
                  </>
                )}
              </CardContent>
            </Card>

            <p className="text-xs text-center text-muted-foreground">
              By completing this purchase, you agree to our terms of service and privacy policy.
              After payment, this template will be available in your account.
            </p>
          </div>
        </div>
      </div>
    </div>
  );
};

export default Checkout;
