import { useEffect, useState } from "react";
import { useNavigate, useSearchParams } from "react-router-dom";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { AlertCircle, CheckCircle, Loader2 } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";

type PurchaseConfirmationState = "checking" | "success" | "error";

const Success = () => {
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const { toast } = useToast();
  const sessionId = searchParams.get("session_id");
  const [status, setStatus] = useState<PurchaseConfirmationState>(
    sessionId ? "checking" : "success"
  );

  useEffect(() => {
    let isMounted = true;
    let timer: ReturnType<typeof setTimeout> | undefined;

    const confirmPurchase = async () => {
      if (!sessionId) return;

      try {
        await supabase.auth.refreshSession();

        const {
          data: { session },
        } = await supabase.auth.getSession();

        if (!session?.access_token) {
          throw new Error("Please sign in again to confirm your purchase.");
        }

        const { data, error } = await supabase.functions.invoke(
          "confirm-template-purchase",
          {
            body: { session_id: sessionId },
          }
        );

        if (error) {
          throw new Error(error.message || "Failed to confirm purchase");
        }

        if (!data?.success) {
          throw new Error(data?.error || "Failed to unlock your template");
        }

        if (!isMounted) return;

        setStatus("success");
        toast({
          title: "Purchase confirmed",
          description: "Your bought template is now active on your profile.",
        });
      } catch (error) {
        if (!isMounted) return;

        const message =
          error instanceof Error
            ? error.message
            : "We couldn't finalize template access automatically.";

        setStatus("error");
        toast({
          title: "Finalizing purchase",
          description: `${message} Please open Templates and retry selection once.`,
          variant: "destructive",
        });
      }
    };

    const run = async () => {
      await confirmPurchase();
      if (isMounted) {
        timer = setTimeout(() => {
          navigate("/templates");
        }, 5000);
      }
    };

    run();

    return () => {
      isMounted = false;
      if (timer) clearTimeout(timer);
    };
  }, [navigate, sessionId, toast]);

  const title =
    status === "checking"
      ? "Confirming Your Purchase..."
      : status === "error"
      ? "Purchase Received — Finalizing Access"
      : "Thank You for Your Purchase!";

  const description =
    status === "checking"
      ? "We're securely confirming your payment and unlocking your template now."
      : status === "error"
      ? "Your payment was received, but automatic confirmation needs one more step. You can still continue to Templates and retry selection."
      : "Your new template is now available in your account and active on your profile.";

  return (
    <div className="min-h-screen bg-gradient-subtle flex items-center justify-center p-4">
      <Card className="max-w-lg w-full shadow-elegant animate-fade-in">
        <CardContent className="p-8 text-center">
          <div className="mb-6 flex justify-center">
            <div className="rounded-full bg-primary/10 p-4">
              {status === "checking" ? (
                <Loader2 className="h-16 w-16 text-primary animate-spin" />
              ) : status === "error" ? (
                <AlertCircle className="h-16 w-16 text-primary" />
              ) : (
                <CheckCircle className="h-16 w-16 text-primary" />
              )}
            </div>
          </div>

          <h1 className="font-serif text-3xl font-bold mb-4">{title}</h1>

          <p className="text-muted-foreground text-lg mb-6">{description}</p>

          <div className="space-y-3">
            <Button onClick={() => navigate("/templates")} size="lg" className="w-full">
              View My Templates
            </Button>

            <Button
              onClick={() => navigate("/dashboard")}
              variant="outline"
              size="lg"
              className="w-full"
            >
              Go to Dashboard
            </Button>
          </div>

          <p className="text-sm text-muted-foreground mt-6">
            Redirecting to templates in a few seconds...
          </p>
        </CardContent>
      </Card>
    </div>
  );
};

export default Success;
