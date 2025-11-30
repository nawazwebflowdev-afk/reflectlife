import { useState } from "react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Check, Crown, Loader2 } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";
import { useAuth } from "@/contexts/AuthContext";

const PremiumUpgrade = () => {
  const [loading, setLoading] = useState(false);
  const { toast } = useToast();
  const { user } = useAuth();

  const handleUpgrade = async () => {
    if (!user) {
      toast({
        title: "Authentication Required",
        description: "Please sign in to upgrade to premium",
        variant: "destructive",
      });
      return;
    }

    setLoading(true);

    try {
      const { data, error } = await supabase.functions.invoke('create-premium-checkout', {
        body: { user_id: user.id }
      });

      if (error) throw error;

      if (data?.url) {
        window.location.href = data.url;
      } else {
        throw new Error("No checkout URL received");
      }
    } catch (error) {
      console.error("Upgrade error:", error);
      toast({
        title: "Upgrade Failed",
        description: "Unable to start upgrade process. Please try again.",
        variant: "destructive",
      });
      setLoading(false);
    }
  };

  const features = [
    "Access to all premium templates",
    "Unlimited memory storage",
    "Priority customer support",
    "Advanced customization options",
    "Export all data as PDF",
    "Ad-free experience",
  ];

  return (
    <Card className="shadow-elegant">
      <CardHeader>
        <div className="flex items-center gap-2">
          <Crown className="h-5 w-5 text-primary" />
          <CardTitle>Upgrade to Premium</CardTitle>
        </div>
        <CardDescription>
          Unlock all features and templates for just €9.99/month
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-6">
        <div className="space-y-3">
          {features.map((feature, index) => (
            <div key={index} className="flex items-center gap-2">
              <Check className="h-4 w-4 text-primary flex-shrink-0" />
              <span className="text-sm">{feature}</span>
            </div>
          ))}
        </div>

        <div className="bg-accent/50 p-4 rounded-md">
          <div className="flex items-baseline gap-2 mb-2">
            <span className="text-3xl font-bold">€9.99</span>
            <span className="text-muted-foreground">/month</span>
          </div>
          <Badge variant="secondary" className="mb-2">
            Cancel anytime
          </Badge>
          <p className="text-xs text-muted-foreground">
            Billed monthly. Secure payment via Stripe.
          </p>
        </div>

        <Button 
          className="w-full shadow-elegant" 
          size="lg"
          onClick={handleUpgrade}
          disabled={loading}
        >
          {loading ? (
            <>
              <Loader2 className="h-4 w-4 animate-spin mr-2" />
              Processing...
            </>
          ) : (
            <>
              <Crown className="h-4 w-4 mr-2" />
              Upgrade to Premium
            </>
          )}
        </Button>

        <p className="text-xs text-center text-muted-foreground">
          By upgrading, you agree to our terms of service and privacy policy.
        </p>
      </CardContent>
    </Card>
  );
};

export default PremiumUpgrade;
