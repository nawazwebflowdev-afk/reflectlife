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

    const confirmPurchase = async (attempt = 1): Promise<boolean> => {
      if (!sessionId) return false;

      try {
        await supabase.auth.refreshSession();

        const {
          data: { session },
        } = await supabase.auth.getSession();

        if (!session?.access_token) {
          throw new Error("Please sign in again to confirm your purchase.");
        }

        const response = await fetch(
          `${import.meta.env.VITE_SUPABASE_URL || "https://osmyfzkcydvtwgnbjplx.supabase.co"}/functions/v1/confirm-template-purchase`,
          {
            method: "POST",
            headers: {
              "Content-Type": "application/json",
              Authorization: `Bearer ${session.access_token}`,
              apikey: import.meta.env.VITE_SUPABASE_PUBLISHABLE_KEY || "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Im9zbXlmemtjeWR2dHdnbmJqcGx4Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3NzIwMzk1MTYsImV4cCI6MjA4NzYxNTUxNn0.BMC8xuq-LmxNtkzEiSaADM58MutcbXNBU3WibIwWmLw",
            },
            body: JSON.stringify({ session_id: sessionId }),
          }
        );

        const data = await response.json();

        if (!response.ok) {
          throw new Error(data?.error || `Server error (${response.status})`);
        }

        if (!data?.success) {
          throw new Error(data?.error || "Failed to unlock your template");
        }

        return true;
      } catch (error) {
        console.error(`Purchase confirmation attempt ${attempt} failed:`, error);

        // Retry up to 3 times with increasing delay
        if (attempt < 3) {
          await new Promise((r) => setTimeout(r, attempt * 2000));
          return confirmPurchase(attempt + 1);
        }

        throw error;
      }
    };

    const run = async () => {
      try {
        const confirmed = await confirmPurchase();
        if (!isMounted) return;

        if (confirmed) {
          // Force refresh session to pick up any profile changes
          await supabase.auth.refreshSession();
          setStatus("success");
          toast({
            title: "Purchase confirmed",
            description: "Your bought template is now active on your profile.",
          });
        } else {
          setStatus("success");
        }
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

      // Only redirect AFTER confirmation completes (success or failure)
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
