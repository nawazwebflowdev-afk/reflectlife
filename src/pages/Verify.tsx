import { useEffect, useState, useCallback } from "react";
import { useNavigate } from "react-router-dom";
import { CheckCircle2, Loader2, Mail, RefreshCw } from "lucide-react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { useToast } from "@/hooks/use-toast";
import { supabase } from "@/integrations/supabase/client";

const COOLDOWN_SECONDS = 60;

const Verify = () => {
  const [isVerifying, setIsVerifying] = useState(true);
  const [isResending, setIsResending] = useState(false);
  const [cooldown, setCooldown] = useState(0);
  const navigate = useNavigate();
  const { toast } = useToast();

  // Cooldown timer
  useEffect(() => {
    if (cooldown <= 0) return;
    const interval = setInterval(() => {
      setCooldown((prev) => (prev <= 1 ? 0 : prev - 1));
    }, 1000);
    return () => clearInterval(interval);
  }, [cooldown]);

  const handleResend = useCallback(async () => {
    if (cooldown > 0 || isResending) return;

    setIsResending(true);
    try {
      const { data: { session } } = await supabase.auth.getSession();
      const email = session?.user?.email;

      if (!email) {
        toast({
          title: "No email found",
          description: "Please sign up again to receive a verification email.",
          variant: "destructive",
        });
        navigate("/signup");
        return;
      }

      const { error } = await supabase.auth.resend({
        type: "signup",
        email,
        options: {
          emailRedirectTo: `${window.location.origin}/verify`,
        },
      });

      if (error) throw error;

      setCooldown(COOLDOWN_SECONDS);
      toast({
        title: "Verification email sent! 📧",
        description: "Please check your inbox and spam folder.",
      });
    } catch (error: any) {
      console.error("Resend error:", error);
      toast({
        title: "Failed to resend",
        description: error.message || "Something went wrong. Please try again later.",
        variant: "destructive",
      });
    } finally {
      setIsResending(false);
    }
  }, [cooldown, isResending, navigate, toast]);

  useEffect(() => {
    const timeout = setTimeout(() => {
      setIsVerifying(false);
    }, 10000);

    const { data: { subscription } } = supabase.auth.onAuthStateChange(async (event, session) => {
      console.log('Auth event:', event, 'Session:', session);

      if (event === 'SIGNED_IN' && session?.user) {
        clearTimeout(timeout);
        const user = session.user;

        if (!user.email_confirmed_at) {
          setIsVerifying(false);
          return;
        }

        try {
          const { error: profileError } = await supabase.from('profiles').upsert({
            id: user.id,
            email: user.email,
            full_name: user.user_metadata?.full_name || '',
            phone_number: user.user_metadata?.phone_number || '',
            country: user.user_metadata?.country || '',
            created_at: new Date().toISOString(),
          }, {
            onConflict: 'id'
          });

          if (profileError) {
            console.error('Profile creation error:', profileError);
          }

          setIsVerifying(false);

          toast({
            title: "Email verified! 🎉",
            description: "Your email has been successfully verified. Redirecting to your dashboard...",
          });

          setTimeout(() => {
            navigate("/dashboard");
          }, 2000);
        } catch (error: any) {
          console.error('Profile creation error:', error);
          toast({
            title: "Verification error",
            description: error.message || "Something went wrong. Please try again.",
            variant: "destructive",
          });
          setIsVerifying(false);
          navigate("/login");
        }
      } else if (event === 'SIGNED_OUT') {
        clearTimeout(timeout);
        toast({
          title: "Verification failed",
          description: "Unable to verify your email. Please try signing up again.",
          variant: "destructive",
        });
        setIsVerifying(false);
        navigate("/login");
      }
    });

    return () => {
      clearTimeout(timeout);
      subscription.unsubscribe();
    };
  }, [navigate, toast]);

  return (
    <div className="min-h-screen flex items-center justify-center py-12 px-4 gradient-subtle">
      <div className="w-full max-w-md space-y-6">
        <Card className="shadow-elegant animate-fade-up border-border/50">
          <CardHeader className="space-y-1 text-center">
            <div className="mx-auto mb-4 h-16 w-16 rounded-full bg-primary/10 flex items-center justify-center">
              {isVerifying ? (
                <Loader2 className="h-8 w-8 text-primary animate-spin" />
              ) : (
                <CheckCircle2 className="h-8 w-8 text-primary" />
              )}
            </div>
            <CardTitle className="font-serif text-2xl text-card-foreground">
              {isVerifying ? "Verifying your email..." : "Check your inbox"}
            </CardTitle>
            <CardDescription>
              {isVerifying
                ? "Please wait while we verify your email address"
                : "Click the verification link we sent to confirm your email"}
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4 text-center">
            <p className="text-sm text-muted-foreground">
              {isVerifying
                ? "This should only take a moment"
                : "Didn't receive the email? Check your spam folder or resend it below."}
            </p>

            {!isVerifying && (
              <Button
                onClick={handleResend}
                disabled={isResending || cooldown > 0}
                variant="outline"
                className="w-full"
              >
                {isResending ? (
                  <>
                    <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                    Sending...
                  </>
                ) : cooldown > 0 ? (
                  <>
                    <RefreshCw className="mr-2 h-4 w-4" />
                    Resend in {cooldown}s
                  </>
                ) : (
                  <>
                    <Mail className="mr-2 h-4 w-4" />
                    Resend verification email
                  </>
                )}
              </Button>
            )}
          </CardContent>
        </Card>
      </div>
    </div>
  );
};

export default Verify;
