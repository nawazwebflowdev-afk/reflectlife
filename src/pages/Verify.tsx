import { useEffect, useState, useCallback } from "react";
import { useNavigate, useLocation } from "react-router-dom";
import { CheckCircle2, Loader2, Mail, RefreshCw } from "lucide-react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { useToast } from "@/hooks/use-toast";
import { supabase } from "@/integrations/supabase/client";

import { tr } from "@/i18n/tr";
const COOLDOWN_SECONDS = 60;

const Verify = () => {
  const [isVerifying, setIsVerifying] = useState(true);
  const [isResending, setIsResending] = useState(false);
  const [cooldown, setCooldown] = useState(0);
  const navigate = useNavigate();
  const location = useLocation();
  const { toast } = useToast();

  // Get email from route state (passed from signup page)
  const emailFromState = (location.state as { email?: string })?.email || "";

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
      // Try to get email from route state first, then from session
      let email = emailFromState;

      if (!email) {
        const { data: { session } } = await supabase.auth.getSession();
        email = session?.user?.email || "";
      }

      if (!email) {
        toast({
          title: tr("a.0b3c656b48"),
          description: tr("a.d87ea66ba7"),
          variant: "destructive",
        });
        navigate("/signup");
        return;
      }

      // Use the secure-signup edge function to resend (bypasses Supabase rate limits)
      const { data, error } = await supabase.functions.invoke('secure-signup', {
        body: {
          email,
          password: '__resend_only__',
          
          fullName: 'Resend',
        }
      });

      if (error) throw error;

      setCooldown(COOLDOWN_SECONDS);
      toast({
        title: tr("a.12206dfa58"),
        description: tr("a.06a091532a"),
      });
    } catch (error: any) {
      console.error("Resend error:", error);
      const raw = error?.message || "";
      const isRateLimited = raw.toLowerCase().includes("rate limit") || raw.toLowerCase().includes("over_email_send_rate_limit") || raw.includes("429");

      toast({
        title: isRateLimited ? tr("a.4d323287dd") : tr("a.49af7cee36"),
        description: isRateLimited
          ? tr("a.e3f26839ea")
          : (raw || tr("a.73c841bf1e")),
        variant: "destructive",
      });
    } finally {
      setIsResending(false);
    }
  }, [cooldown, isResending, emailFromState, navigate, toast]);

  useEffect(() => {
    // After 3 seconds, stop showing "verifying" spinner since user needs to check email
    const timeout = setTimeout(() => {
      setIsVerifying(false);
    }, 3000);

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
            phone: user.user_metadata?.phone_number || '',
            country: user.user_metadata?.country || '',
          }, {
            onConflict: 'id'
          });

          if (profileError) {
            console.error('Profile creation error:', profileError);
          }

          setIsVerifying(false);

          toast({
            title: tr("a.eb82c6fff1"),
            description: tr("a.32d2e777fc"),
          });

          setTimeout(() => {
            navigate("/dashboard");
          }, 2000);
        } catch (error: any) {
          console.error('Profile creation error:', error);
          toast({
            title: tr("a.1b5f28b082"),
            description: error.message || tr("a.9a3ea0598e"),
            variant: "destructive",
          });
          setIsVerifying(false);
          navigate("/login");
        }
      } else if (event === 'SIGNED_OUT') {
        clearTimeout(timeout);
        setIsVerifying(false);
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
                <Mail className="h-8 w-8 text-primary" />
              )}
            </div>
            <CardTitle className="font-serif text-2xl text-card-foreground">
              {isVerifying ? tr("a.9a3bbc6fb2") : tr("a.48faa67c34")}
            </CardTitle>
            <CardDescription>
              {isVerifying
                ? tr("a.19a08bfe73")
                : emailFromState
                  ? `We sent a verification link to ${emailFromState}`
                  : tr("a.472b2673b2")}
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4 text-center">
            <p className="text-sm text-muted-foreground">
              {isVerifying
                ? tr("a.d08dbf91a0")
                : tr("a.d6e14a84c8")}
            </p>

            {!isVerifying && (
              <>
                <Button
                  onClick={handleResend}
                  disabled={isResending || cooldown > 0}
                  variant="outline"
                  className="w-full"
                >
                  {isResending ? (
                    <>
                      <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                      {tr("a.c338c191ab")}
                    </>
                  ) : cooldown > 0 ? (
                    <>
                      <RefreshCw className="mr-2 h-4 w-4" />
                      {tr("a.bd4bd134cc")} {cooldown}s
                    </>
                  ) : (
                    <>
                      <Mail className="mr-2 h-4 w-4" />
                      {tr("a.0ca4ac3dd6")}
                    </>
                  )}
                </Button>

                <div className="text-sm text-muted-foreground">
                  {tr("a.25a8c46367")}{" "}
                  <button
                    type="button"
                    onClick={() => navigate("/login")}
                    className="text-primary underline underline-offset-4 hover:text-primary/80"
                  >
                    {tr("a.ada2e9e96f")}
                  </button>
                </div>
              </>
            )}
          </CardContent>
        </Card>
      </div>
    </div>
  );
};

export default Verify;