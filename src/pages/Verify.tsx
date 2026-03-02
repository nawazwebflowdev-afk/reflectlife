import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { CheckCircle2, Loader2 } from "lucide-react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { useToast } from "@/hooks/use-toast";
import { supabase } from "@/integrations/supabase/client";

const Verify = () => {
  const [isVerifying, setIsVerifying] = useState(true);
  const navigate = useNavigate();
  const { toast } = useToast();

  useEffect(() => {
    const timeout = setTimeout(() => {
      toast({
        title: "Verification failed",
        description: "Unable to verify your email. Please try signing up again.",
        variant: "destructive",
      });
      setIsVerifying(false);
      navigate("/login");
    }, 10000);

    // Listen for auth state changes to handle the email confirmation callback
    const { data: { subscription } } = supabase.auth.onAuthStateChange(async (event, session) => {
      console.log('Auth event:', event, 'Session:', session);

      if (event === 'SIGNED_IN' && session?.user) {
        clearTimeout(timeout);
        const user = session.user;

        // Check if email is confirmed
        if (!user.email_confirmed_at) {
          toast({
            title: "Email not verified",
            description: "Please check your email and click the verification link.",
            variant: "destructive",
          });
          setIsVerifying(false);
          navigate("/login");
          return;
        }

        // Upsert profile with user metadata
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

          // Redirect to dashboard after a short delay
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
            <div className="mx-auto mb-4 h-16 w-16 rounded-full bg-green-100 dark:bg-green-900/20 flex items-center justify-center">
              {isVerifying ? (
                <Loader2 className="h-8 w-8 text-green-600 dark:text-green-400 animate-spin" />
              ) : (
                <CheckCircle2 className="h-8 w-8 text-green-600 dark:text-green-400" />
              )}
            </div>
            <CardTitle className="font-serif text-2xl text-card-foreground">
              {isVerifying ? "Verifying your email..." : "Email Verified!"}
            </CardTitle>
            <CardDescription>
              {isVerifying
                ? "Please wait while we verify your email address"
                : "Your email has been successfully verified. Redirecting to your dashboard..."}
            </CardDescription>
          </CardHeader>
          <CardContent className="text-center">
            <p className="text-sm text-muted-foreground">
              {isVerifying
                ? "This should only take a moment"
                : "Welcome to Reflectlife! 🌸"}
            </p>
          </CardContent>
        </Card>
      </div>
    </div>
  );
};

export default Verify;
