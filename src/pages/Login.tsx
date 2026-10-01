import { useState, useEffect } from "react";
import { useNavigate, useSearchParams } from "react-router-dom";
import { Mail, Lock, ArrowRight, Loader2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { useToast } from "@/hooks/use-toast";
import { supabase } from "@/integrations/supabase/client";
import type { Session } from "@supabase/supabase-js";

import { tr } from "@/i18n/tr";
const Login = () => {
  const [isLoading, setIsLoading] = useState(false);
  const [session, setSession] = useState<Session | null>(null);
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");

  const navigate = useNavigate();
  const [params] = useSearchParams();
  const { toast } = useToast();

  const redirectParam = params.get("redirect");
  const destination = redirectParam && redirectParam.startsWith("/") ? redirectParam : "/dashboard";

  useEffect(() => {
    const { data: { subscription } } = supabase.auth.onAuthStateChange(
      (_event, session) => {
        setSession(session);
        if (session) {
          navigate(destination);
        }
      }
    );

    supabase.auth.getSession().then(({ data: { session } }) => {
      setSession(session);
      if (session) {
        navigate(destination);
      }
    });

    return () => subscription.unsubscribe();
  }, [navigate, destination]);


  const handleLogin = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    
    if (!email || !password) {
      toast({
        title: tr("a.7f2f6a15cf"),
        description: tr("a.503ab476b1"),
        variant: "destructive",
      });
      return;
    }
    
    setIsLoading(true);

    try {
      const { data, error } = await supabase.auth.signInWithPassword({
        email,
        password,
      });

      if (error) {
        // Check if error is related to unverified email
        if (error.message.includes("Email not confirmed")) {
          toast({
            title: tr("a.9eb1c966dc"),
            description: tr("a.d6a2a3fbe0"),
            variant: "destructive",
          });
        } else {
          toast({
            title: tr("a.108b931431"),
            description: error.message,
            variant: "destructive",
          });
        }
        return;
      }

      // Check if user's email is verified
      if (data.user && !data.user.email_confirmed_at) {
        await supabase.auth.signOut();
        toast({
          title: tr("a.9eb1c966dc"),
          description: tr("a.d6a2a3fbe0"),
          variant: "destructive",
        });
        return;
      }

      toast({
        title: tr("a.45b62d8259"),
        description: tr("a.2c2bd4232e"),
      });
      navigate(destination);

    } catch (error: any) {
      toast({
        title: tr("a.108b931431"),
        description: error.message || tr("a.0e71559369"),
        variant: "destructive",
      });
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="min-h-screen flex items-center justify-center py-12 px-4 gradient-subtle">
      <div className="w-full max-w-md space-y-6">
        <div className="text-center space-y-2 animate-fade-in">
          <h1 className="font-serif text-4xl font-bold text-foreground">{tr("a.1c9089485a")}</h1>
          <p className="text-muted-foreground">
            {tr("a.2a42dcec64")}
          </p>
        </div>

        <Card className="shadow-elegant animate-fade-up border-border/50">
          <CardHeader className="space-y-1">
            <CardTitle className="font-serif text-2xl text-card-foreground">{tr("a.f8492cc1de")}</CardTitle>
            <CardDescription>
              {tr("a.20a13380f4")}
            </CardDescription>
          </CardHeader>
          <CardContent>
            <form onSubmit={handleLogin} className="space-y-4">
              <div className="space-y-2">
                <Label htmlFor="email">{tr("a.84add5b295")}</Label>
                <div className="relative">
                  <Mail className="absolute left-3 top-3 h-4 w-4 text-muted-foreground" />
                  <Input
                    id="email"
                    type="email"
                    placeholder={tr("a.2894efbef0")}
                    className="pl-10"
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    required
                    disabled={isLoading}
                  />
                </div>
              </div>

              <div className="space-y-2">
                <div className="flex items-center justify-between">
                  <Label htmlFor="password">{tr("a.8be3c943b1")}</Label>
                  <button
                    type="button"
                    onClick={() => navigate("/forgot-password")}
                    className="text-xs text-primary hover:text-primary/80 underline underline-offset-4 transition-smooth"
                  >
                    {tr("a.4c29f7f033")}
                  </button>
                </div>
                <div className="relative">
                  <Lock className="absolute left-3 top-3 h-4 w-4 text-muted-foreground" />
                  <Input
                    id="password"
                    type="password"
                    placeholder="••••••••"
                    className="pl-10"
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    required
                    disabled={isLoading}
                  />
                </div>
              </div>

              <Button type="submit" className="w-full" disabled={isLoading}>
                {isLoading ? (
                  <>
                    <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                    {tr("a.6ca8910ee6")}
                  </>
                ) : (
                  <>
                    {tr("a.f8492cc1de")}
                    <ArrowRight className="ml-2 h-4 w-4" />
                  </>
                )}
              </Button>

              <div className="text-center text-sm text-muted-foreground">
                {tr("a.f838dc11db")}{" "}
                <button
                  type="button"
                  onClick={() => navigate("/signup")}
                  className="text-primary underline underline-offset-4 hover:text-primary/80 transition-smooth"
                >
                  {tr("a.aaf3744797")}
                </button>
              </div>
            </form>
          </CardContent>
        </Card>
      </div>
    </div>
  );
};

export default Login;
