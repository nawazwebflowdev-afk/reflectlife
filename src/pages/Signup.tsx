import { useState, useCallback, Component, type ReactNode } from "react";
import { useNavigate } from "react-router-dom";
import { Mail, Lock, User, ArrowRight, Loader2, Phone, MapPin, Shield, CheckCircle2, AlertTriangle, RefreshCw } from "lucide-react";
import zxcvbn from "zxcvbn";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Checkbox } from "@/components/ui/checkbox";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { useToast } from "@/hooks/use-toast";
import { supabase } from "@/integrations/supabase/client";
import { countries } from "@/data/countries";

// Error boundary to catch render crashes
class SignupErrorBoundary extends Component<
  { children: ReactNode },
  { hasError: boolean; error: Error | null }
> {
  constructor(props: { children: ReactNode }) {
    super(props);
    this.state = { hasError: false, error: null };
  }

  static getDerivedStateFromError(error: Error) {
    return { hasError: true, error };
  }

  componentDidCatch(error: Error, info: React.ErrorInfo) {
    console.error("Signup page crash:", error, info);
  }

  render() {
    if (this.state.hasError) {
      return (
        <div className="min-h-screen flex items-center justify-center py-12 px-4 gradient-subtle">
          <Card className="w-full max-w-md shadow-elegant border-border/50">
            <CardHeader className="text-center space-y-2">
              <div className="mx-auto h-14 w-14 rounded-full bg-destructive/10 flex items-center justify-center">
                <AlertTriangle className="h-7 w-7 text-destructive" />
              </div>
              <CardTitle className="font-serif text-2xl text-card-foreground">
                Something went wrong
              </CardTitle>
              <CardDescription>
                The signup page encountered an error. Please try again.
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-3">
              <p className="text-sm text-muted-foreground text-center">
                {this.state.error?.message || "An unexpected error occurred."}
              </p>
              <Button
                className="w-full"
                onClick={() => {
                  this.setState({ hasError: false, error: null });
                  window.location.reload();
                }}
              >
                <RefreshCw className="mr-2 h-4 w-4" />
                Reload Page
              </Button>
            </CardContent>
          </Card>
        </div>
      );
    }
    return this.props.children;
  }
}

const SignupForm = () => {
  const [isLoading, setIsLoading] = useState(false);
  const [signupError, setSignupError] = useState<string | null>(null);
  const [fullName, setFullName] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [phoneNumber, setPhoneNumber] = useState("");
  const [country, setCountry] = useState("");
  const [termsAccepted, setTermsAccepted] = useState(false);
  const [passwordStrength, setPasswordStrength] = useState<{
    score: number;
    feedback: string;
    color: string;
  }>({ score: 0, feedback: "", color: "bg-gray-200" });
  
  const navigate = useNavigate();
  const { toast } = useToast();

  const checkPasswordStrength = useCallback((pwd: string) => {
    if (!pwd) {
      setPasswordStrength({ score: 0, feedback: "", color: "bg-gray-200" });
      return;
    }

    const result = zxcvbn(pwd);
    const strengthLabels = ["Very Weak", "Weak", "Fair", "Good", "Strong"];
    const strengthColors = [
      "bg-destructive",
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
  }, []);

  const handlePasswordChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const newPassword = e.target.value;
    setPassword(newPassword);
    checkPasswordStrength(newPassword);
  };

  const getSignupErrorDetails = (input: unknown) => {
    const raw = typeof input === "string" ? input : (input as any)?.message || "";
    const normalized = raw.toLowerCase();

    if (normalized.includes("rate limit") || normalized.includes("429") || normalized.includes("over_email_send_rate_limit")) {
      return {
        title: "Email rate limit exceeded",
        description: "Please wait 30–60 minutes before trying again, or try from a different network.",
      };
    }

    return {
      title: "Sign up failed",
      description: raw || "An unexpected error occurred. Please try again.",
    };
  };

  const handleSignup = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    setSignupError(null);
    
    if (!fullName || !email || !password || !phoneNumber || !country) {
      toast({
        title: "Error",
        description: "All fields are required",
        variant: "destructive",
      });
      return;
    }
    
    if (!termsAccepted) {
      toast({
        title: "Error",
        description: "Please agree to the terms and conditions",
        variant: "destructive",
      });
      return;
    }

    if (passwordStrength.score < 3) {
      toast({
        title: "Weak Password",
        description: "Please choose a stronger password (at least 'Good' strength)",
        variant: "destructive",
      });
      return;
    }
    
    setIsLoading(true);

    try {
      const [firstName, ...rest] = fullName.trim().split(/\s+/);
      const lastName = rest.join(" ");

      const { data, error } = await supabase.functions.invoke('secure-signup', {
        body: {
          email,
          password,
          fullName,
          firstName,
          lastName,
          phoneNumber,
          country,
          passwordScore: passwordStrength.score,
        }
      });

      if (error) {
        throw error;
      }

      if (data?.error) {
        throw new Error(data.error);
      }

      const { error: signInError } = await supabase.auth.signInWithPassword({
        email,
        password,
      });

      if (signInError) {
        throw signInError;
      }

      toast({
        title: "Account created!",
        description: "Welcome to Reflectlife.",
      });

      navigate("/dashboard");

    } catch (error: any) {
      console.error('Signup error:', error);
      const details = getSignupErrorDetails(error);
      setSignupError(details.description);
      toast({
        title: details.title,
        description: details.description,
        variant: "destructive",
      });
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="min-h-screen flex items-center justify-center py-12 px-4 gradient-subtle">
      <div className="w-full max-w-2xl space-y-6">
        <div className="text-center space-y-2 animate-fade-in">
          <h1 className="font-serif text-4xl font-bold text-foreground">Begin Your Journey</h1>
          <p className="text-muted-foreground">
            Begin your journey of remembrance securely
          </p>
        </div>

        {signupError && (
          <Card className="border-destructive/50 bg-destructive/5 animate-fade-in">
            <CardContent className="flex items-start gap-3 py-4">
              <AlertTriangle className="h-5 w-5 text-destructive flex-shrink-0 mt-0.5" />
              <div className="space-y-1">
                <p className="text-sm font-medium text-destructive">Sign up failed</p>
                <p className="text-sm text-muted-foreground">{signupError}</p>
                <Button
                  variant="ghost"
                  size="sm"
                  className="mt-1 h-auto p-0 text-primary underline underline-offset-4"
                  onClick={() => setSignupError(null)}
                >
                  Dismiss
                </Button>
              </div>
            </CardContent>
          </Card>
        )}

        <Card className="shadow-elegant animate-fade-up border-border/50">
          <CardHeader className="space-y-1">
            <CardTitle className="font-serif text-2xl text-card-foreground">Create Your Account</CardTitle>
            <CardDescription>
              Fill in your details to get started with Reflectlife
            </CardDescription>
          </CardHeader>
          <CardContent>
            <form onSubmit={handleSignup} className="space-y-5">
              <div className="space-y-2">
                <Label htmlFor="fullName">Full Name</Label>
                <div className="relative">
                  <User className="absolute left-3 top-3 h-4 w-4 text-muted-foreground" />
                  <Input
                    id="fullName"
                    type="text"
                    placeholder="John Doe"
                    className="pl-10"
                    value={fullName}
                    onChange={(e) => setFullName(e.target.value)}
                    required
                    disabled={isLoading}
                  />
                </div>
              </div>

              <div className="space-y-2">
                <Label htmlFor="email">Email</Label>
                <div className="relative">
                  <Mail className="absolute left-3 top-3 h-4 w-4 text-muted-foreground" />
                  <Input
                    id="email"
                    type="email"
                    placeholder="your@email.com"
                    className="pl-10"
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    required
                    disabled={isLoading}
                  />
                </div>
              </div>

              <div className="space-y-2">
                <Label htmlFor="password">Password</Label>
                <div className="relative">
                  <Lock className="absolute left-3 top-3 h-4 w-4 text-muted-foreground" />
                  <Input
                    id="password"
                    type="password"
                    placeholder="••••••••"
                    className="pl-10"
                    value={password}
                    onChange={handlePasswordChange}
                    required
                    minLength={8}
                    disabled={isLoading}
                  />
                </div>
                {password && (
                  <div className="space-y-2">
                    <div className="flex items-center gap-2">
                      <div className="flex-1 h-2 bg-muted rounded-full overflow-hidden">
                        <div 
                          className={`h-full transition-all duration-300 ${passwordStrength.color}`}
                          style={{ width: `${(passwordStrength.score + 1) * 20}%` }}
                        />
                      </div>
                      <span className="text-xs font-medium text-muted-foreground">{passwordStrength.feedback}</span>
                    </div>
                    <div className="flex items-start gap-2 text-xs text-muted-foreground">
                      <Shield className="h-3 w-3 mt-0.5 flex-shrink-0" />
                      <div>
                        {passwordStrength.score < 3 ? (
                          <span className="text-orange-600">Use a mix of uppercase, lowercase, numbers, and special characters</span>
                        ) : (
                          <span className="text-green-600 flex items-center gap-1">
                            <CheckCircle2 className="h-3 w-3" />
                            Strong password
                          </span>
                        )}
                      </div>
                    </div>
                  </div>
                )}
              </div>

              <div className="space-y-2">
                <Label htmlFor="phoneNumber">Phone Number</Label>
                <div className="relative">
                  <Phone className="absolute left-3 top-3 h-4 w-4 text-muted-foreground" />
                  <Input
                    id="phoneNumber"
                    type="tel"
                    placeholder="+1 (555) 123-4567"
                    className="pl-10"
                    value={phoneNumber}
                    onChange={(e) => setPhoneNumber(e.target.value)}
                    required
                    disabled={isLoading}
                  />
                </div>
              </div>

              <div className="space-y-2">
                <Label htmlFor="country">Country</Label>
                <div className="relative">
                  <MapPin className="absolute left-3 top-3 h-4 w-4 text-muted-foreground z-10 pointer-events-none" />
                  <Select value={country} onValueChange={setCountry} required disabled={isLoading}>
                    <SelectTrigger id="country" className="pl-10">
                      <SelectValue placeholder="Select your country" />
                    </SelectTrigger>
                    <SelectContent className="max-h-[300px]">
                      {countries.map((c) => (
                        <SelectItem key={c} value={c}>
                          {c}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
              </div>

              <div className="space-y-3">
                <div className="flex items-start space-x-3">
                  <Checkbox
                    id="terms"
                    checked={termsAccepted}
                    onCheckedChange={(checked) => setTermsAccepted(checked as boolean)}
                    disabled={isLoading}
                  />
                  <div className="space-y-1">
                    <Label htmlFor="terms" className="text-sm font-normal cursor-pointer">
                      I agree to all terms and conditions
                    </Label>
                    <p className="text-xs text-muted-foreground">
                      We respect your privacy and protect your data with care.
                    </p>
                  </div>
                </div>
              </div>

              <Button type="submit" className="w-full" disabled={isLoading}>
                {isLoading ? (
                  <>
                    <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                    Creating account...
                  </>
                ) : (
                  <>
                    Create Account
                    <ArrowRight className="ml-2 h-4 w-4" />
                  </>
                )}
              </Button>

              <div className="text-center text-sm text-muted-foreground">
                Already have an account?{" "}
                <button
                  type="button"
                  onClick={() => navigate("/login")}
                  className="text-primary underline underline-offset-4 hover:text-primary/80 transition-smooth"
                >
                  Sign in
                </button>
              </div>
            </form>
          </CardContent>
        </Card>
      </div>
    </div>
  );
};

const Signup = () => (
  <SignupErrorBoundary>
    <SignupForm />
  </SignupErrorBoundary>
);

export default Signup;
