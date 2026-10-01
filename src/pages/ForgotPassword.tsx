import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { Mail, ArrowLeft, Loader2, CheckCircle2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { useToast } from "@/hooks/use-toast";
import { supabase } from "@/integrations/supabase/client";

import { tr } from "@/i18n/tr";
const ForgotPassword = () => {
  const [email, setEmail] = useState("");
  const [isLoading, setIsLoading] = useState(false);
  const [emailSent, setEmailSent] = useState(false);
  const navigate = useNavigate();
  const { toast } = useToast();

  const handleResetRequest = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();

    if (!email) {
      toast({
        title: tr("a.7f2f6a15cf"),
        description: tr("a.103d83a104"),
        variant: "destructive",
      });
      return;
    }

    setIsLoading(true);

    const { error } = await supabase.auth.resetPasswordForEmail(email, {
      redirectTo: `${window.location.origin}/reset-password`,
    });

    setIsLoading(false);

    if (error) {
      toast({
        title: tr("a.7f2f6a15cf"),
        description: error.message,
        variant: "destructive",
      });
      return;
    }

    setEmailSent(true);
    toast({
      title: tr("a.42a8f651d7"),
      description: tr("a.b1b6421b8f"),
    });
  };

  if (emailSent) {
    return (
      <div className="min-h-screen flex items-center justify-center py-12 px-4">
        <div className="w-full max-w-md space-y-6">
          <Card className="shadow-elegant-lg animate-fade-up">
            <CardHeader className="text-center space-y-4">
              <div className="mx-auto w-12 h-12 rounded-full bg-green-100 dark:bg-green-900/20 flex items-center justify-center">
                <CheckCircle2 className="h-6 w-6 text-green-600 dark:text-green-400" />
              </div>
              <div className="space-y-2">
                <CardTitle className="font-serif text-2xl">{tr("a.e80f3c73ae")}</CardTitle>
                <CardDescription className="text-base">
                  {tr("a.4624d72265")}
                </CardDescription>
              </div>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="p-4 bg-muted rounded-lg text-sm text-muted-foreground">
                <p>{tr("a.9a88eb8dce")}</p>
              </div>
              <Button
                variant="outline"
                className="w-full"
                onClick={() => navigate("/login")}
              >
                <ArrowLeft className="mr-2 h-4 w-4" />
                {tr("a.c65048d3ff")}
              </Button>
            </CardContent>
          </Card>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen flex items-center justify-center py-12 px-4">
      <div className="w-full max-w-md space-y-6">
        <div className="text-center space-y-2 animate-fade-in">
          <h1 className="font-serif text-4xl font-bold">{tr("a.f99d98e85f")}</h1>
          <p className="text-muted-foreground">
            {tr("a.64924bcd93")}
          </p>
        </div>

        <Card className="shadow-elegant-lg animate-fade-up">
          <CardHeader className="space-y-1">
            <CardTitle className="font-serif text-2xl">{tr("a.3fb75e3bfe")}</CardTitle>
            <CardDescription>
              {tr("a.05012b8635")}
            </CardDescription>
          </CardHeader>
          <CardContent>
            <form onSubmit={handleResetRequest} className="space-y-4">
              <div className="space-y-2">
                <Label htmlFor="email">{tr("a.09ba557fd1")}</Label>
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

              <Button type="submit" className="w-full" disabled={isLoading}>
                {isLoading ? (
                  <>
                    <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                    {tr("a.9b9e933299")}
                  </>
                ) : (
                  tr("a.987be45240")
                )}
              </Button>

              <Button
                type="button"
                variant="ghost"
                className="w-full"
                onClick={() => navigate("/login")}
                disabled={isLoading}
              >
                <ArrowLeft className="mr-2 h-4 w-4" />
                {tr("a.c65048d3ff")}
              </Button>
            </form>
          </CardContent>
        </Card>
      </div>
    </div>
  );
};

export default ForgotPassword;
