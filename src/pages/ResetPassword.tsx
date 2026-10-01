import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { Lock, Loader2, CheckCircle2, Shield } from "lucide-react";
import zxcvbn from "zxcvbn";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { useToast } from "@/hooks/use-toast";
import { supabase } from "@/integrations/supabase/client";

import { tr } from "@/i18n/tr";
const ResetPassword = () => {
  const [newPassword, setNewPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [isLoading, setIsLoading] = useState(false);
  const [passwordReset, setPasswordReset] = useState(false);
  const [passwordStrength, setPasswordStrength] = useState<{
    score: number;
    feedback: string;
    color: string;
  }>({ score: 0, feedback: "", color: "bg-gray-200" });
  const navigate = useNavigate();
  const { toast } = useToast();

  useEffect(() => {
    // Check if user has a valid session from the reset link
    supabase.auth.getSession().then(({ data: { session } }) => {
      if (!session) {
        toast({
          title: tr("a.b7830e59c0"),
          description: tr("a.a51cd5f15a"),
          variant: "destructive",
        });
        navigate("/forgot-password");
      }
    });
  }, [navigate, toast]);

  const checkPasswordStrength = (pwd: string) => {
    if (!pwd) {
      setPasswordStrength({ score: 0, feedback: "", color: "bg-gray-200" });
      return;
    }

    const result = zxcvbn(pwd);
    const strengthLabels = ["Very Weak", "Weak", "Fair", "Good", "Strong"];
    const strengthColors = [
      "bg-red-500",
      "bg-orange-500",
      "bg-yellow-500",
      "bg-blue-500",
      "bg-green-500"
    ];

    setPasswordStrength({
      score: result.score,
      feedback: strengthLabels[result.score],
      color: strengthColors[result.score]
    });
  };

  const handlePasswordChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const pwd = e.target.value;
    setNewPassword(pwd);
    checkPasswordStrength(pwd);
  };

  const handleResetPassword = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();

    if (!newPassword || !confirmPassword) {
      toast({
        title: tr("a.7f2f6a15cf"),
        description: tr("a.503ab476b1"),
        variant: "destructive",
      });
      return;
    }

    if (newPassword !== confirmPassword) {
      toast({
        title: tr("a.5f087918ec"),
        description: tr("a.a7509eb6e4"),
        variant: "destructive",
      });
      return;
    }

    if (passwordStrength.score < 3) {
      toast({
        title: tr("a.7e83f13ca0"),
        description: tr("a.2e193731fc"),
        variant: "destructive",
      });
      return;
    }

    setIsLoading(true);

    const { error } = await supabase.auth.updateUser({
      password: newPassword,
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

    setPasswordReset(true);
    toast({
      title: tr("a.0582710f89"),
      description: tr("a.9f19df05eb"),
    });

    // Redirect to auth page after 2 seconds
    setTimeout(() => {
      navigate("/login");
    }, 2000);
  };

  if (passwordReset) {
    return (
      <div className="min-h-screen flex items-center justify-center py-12 px-4">
        <div className="w-full max-w-md space-y-6">
          <Card className="shadow-elegant-lg animate-fade-up">
            <CardHeader className="text-center space-y-4">
              <div className="mx-auto w-12 h-12 rounded-full bg-green-100 dark:bg-green-900/20 flex items-center justify-center">
                <CheckCircle2 className="h-6 w-6 text-green-600 dark:text-green-400" />
              </div>
              <div className="space-y-2">
                <CardTitle className="font-serif text-2xl">{tr("a.8b26e0e54c")}</CardTitle>
                <CardDescription className="text-base">
                  {tr("a.73d7b5f7da")}
                </CardDescription>
              </div>
            </CardHeader>
          </Card>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen flex items-center justify-center py-12 px-4">
      <div className="w-full max-w-md space-y-6">
        <div className="text-center space-y-2 animate-fade-in">
          <h1 className="font-serif text-4xl font-bold">{tr("a.3fb75e3bfe")}</h1>
          <p className="text-muted-foreground">
            {tr("a.7bec90ce73")}
          </p>
        </div>

        <Card className="shadow-elegant-lg animate-fade-up">
          <CardHeader className="space-y-1">
            <CardTitle className="font-serif text-2xl">{tr("a.53b7d4c329")}</CardTitle>
            <CardDescription>
              {tr("a.a38ed28ed6")}
            </CardDescription>
          </CardHeader>
          <CardContent>
            <form onSubmit={handleResetPassword} className="space-y-4">
              <div className="space-y-2">
                <Label htmlFor="newPassword">{tr("a.4894cb39ee")}</Label>
                <div className="relative">
                  <Lock className="absolute left-3 top-3 h-4 w-4 text-muted-foreground" />
                  <Input
                    id="newPassword"
                    type="password"
                    placeholder="••••••••"
                    className="pl-10"
                    value={newPassword}
                    onChange={handlePasswordChange}
                    required
                    minLength={8}
                    disabled={isLoading}
                  />
                </div>
                {newPassword && (
                  <div className="space-y-2">
                    <div className="flex items-center gap-2">
                      <div className="flex-1 h-2 bg-gray-200 rounded-full overflow-hidden">
                        <div 
                          className={`h-full transition-all duration-300 ${passwordStrength.color}`}
                          style={{ width: `${(passwordStrength.score + 1) * 20}%` }}
                        />
                      </div>
                      <span className="text-xs font-medium">{passwordStrength.feedback}</span>
                    </div>
                    <div className="flex items-start gap-2 text-xs text-muted-foreground">
                      <Shield className="h-3 w-3 mt-0.5 flex-shrink-0" />
                      <div>
                        {passwordStrength.score < 3 ? (
                          <span className="text-orange-600">{tr("a.bd0c40bce3")}</span>
                        ) : (
                          <span className="text-green-600 flex items-center gap-1">
                            <CheckCircle2 className="h-3 w-3" />
                            {tr("a.a4ca8db559")}
                          </span>
                        )}
                      </div>
                    </div>
                  </div>
                )}
              </div>

              <div className="space-y-2">
                <Label htmlFor="confirmPassword">{tr("a.c2d404cb7b")}</Label>
                <div className="relative">
                  <Lock className="absolute left-3 top-3 h-4 w-4 text-muted-foreground" />
                  <Input
                    id="confirmPassword"
                    type="password"
                    placeholder="••••••••"
                    className="pl-10"
                    value={confirmPassword}
                    onChange={(e) => setConfirmPassword(e.target.value)}
                    required
                    minLength={8}
                    disabled={isLoading}
                  />
                </div>
              </div>

              <Button type="submit" className="w-full" disabled={isLoading}>
                {isLoading ? (
                  <>
                    <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                    {tr("a.0c217107cd")}
                  </>
                ) : (
                  tr("a.3fb75e3bfe")
                )}
              </Button>
            </form>
          </CardContent>
        </Card>
      </div>
    </div>
  );
};

export default ResetPassword;
