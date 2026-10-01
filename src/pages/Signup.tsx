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
import PhoneNumberField, { detectDefaultCountry, toE164 } from "@/components/PhoneNumberField";
import type { CountryCode } from "libphonenumber-js";

import { tr } from "@/i18n/tr";
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
                {tr("a.8d886c0ba6")}
              </CardTitle>
              <CardDescription>
                {tr("a.c9723fc1bf")}
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-3">
              <p className="text-sm text-muted-foreground text-center">
                {this.state.error?.message || tr("a.4444a27dbd")}
              </p>
              <Button
                className="w-full"
                onClick={() => {
                  this.setState({ hasError: false, error: null });
                  window.location.reload();
                }}
              >
                <RefreshCw className="mr-2 h-4 w-4" />
                {tr("a.6e41ee3f30")}
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
  const [phoneCountry, setPhoneCountry] = useState<CountryCode>(() => detectDefaultCountry());
  const [phoneError, setPhoneError] = useState<string | null>(null);
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
        title: tr("a.3a29f9eaa4"),
        description: tr("a.4b9fbc463a"),
      };
    }

    if (normalized.includes("already exists") || normalized.includes("already registered")) {
      return {
        title: tr("a.452864f755"),
        description: tr("a.75284a959a"),
      };
    }

    return {
      title: tr("a.a7bdefb078"),
      description: raw || tr("a.d07ac08788"),
    };
  };

  const extractFunctionErrorMessage = async (error: unknown): Promise<string> => {
    const fallback = (error as any)?.message || "";
    const context = (error as any)?.context;

    if (!context) return fallback;

    try {
      const cloned = typeof context.clone === "function" ? context.clone() : context;
      const parsed = await cloned.json();
      if (parsed?.error) return String(parsed.error);
      if (parsed?.message) return String(parsed.message);
    } catch {
      try {
        const text = await context.text();
        if (text) return text;
      } catch {
        // ignore and return fallback
      }
    }

    return fallback;
  };

  const handleSignup = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    setSignupError(null);
    
    if (!fullName || !email || !password || !phoneNumber || !country) {
      toast({
        title: tr("a.7f2f6a15cf"),
        description: tr("a.16a9c9e05b"),
        variant: "destructive",
      });
      return;
    }
    

    const e164 = toE164(phoneNumber, phoneCountry);
    if (!e164) {
      setPhoneError("Please enter a valid phone number for the selected country.");
      toast({
        title: tr("a.43c82e71b6"),
        description: tr("a.e3350826ff"),
        variant: "destructive",
      });
      return;
    }
    setPhoneError(null);

    if (!termsAccepted) {
      toast({
        title: tr("a.7f2f6a15cf"),
        description: tr("a.8643b54bf9"),
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

    try {
      const guestMemorialId = sessionStorage.getItem("reflectlife_guest_candle_memorial");
      const [firstName, ...rest] = fullName.trim().split(/\s+/);
      const lastName = rest.join(" ");

      const { data, error } = await supabase.functions.invoke('secure-signup', {
        body: {
          email,
          password,
          fullName,
          firstName,
          lastName,
          phoneNumber: e164,
          country,
          
        }
      });

      if (error) {
        const errorMessage = await extractFunctionErrorMessage(error);
        throw new Error(errorMessage || (error as any)?.message || tr("a.149dfa301d"));
      }

      if (data?.error) {
        throw new Error(typeof data.error === "string" ? data.error : tr("a.149dfa301d"));
      }

      if (guestMemorialId) {
        const deviceId = localStorage.getItem("reflectlife_candle_device");
        if (deviceId) await supabase.functions.invoke("track-guest-candle-conversion", { body: { memorial_id: guestMemorialId, device_id: deviceId, event_type: "signup_completed" } });
        sessionStorage.removeItem("reflectlife_guest_candle_memorial");
      }

      toast({
        title: tr("a.552cd3c724"),
        description: tr("a.1aa4a201cc"),
      });

      navigate("/verify", { state: { email } });

    } catch (error: any) {
      console.error('Signup error:', error);
      const resolvedMessage = await extractFunctionErrorMessage(error);
      const details = getSignupErrorDetails(resolvedMessage);
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
          <h1 className="font-serif text-4xl font-bold text-foreground">{tr("a.02d59877b8")}</h1>
          <p className="text-muted-foreground">
            {tr("a.461898105b")}
          </p>
        </div>

        {signupError && (
          <Card className="border-destructive/50 bg-destructive/5 animate-fade-in">
            <CardContent className="flex items-start gap-3 py-4">
              <AlertTriangle className="h-5 w-5 text-destructive flex-shrink-0 mt-0.5" />
              <div className="space-y-1">
                <p className="text-sm font-medium text-destructive">{tr("a.a7bdefb078")}</p>
                <p className="text-sm text-muted-foreground">{signupError}</p>
                <Button
                  variant="ghost"
                  size="sm"
                  className="mt-1 h-auto p-0 text-primary underline underline-offset-4"
                  onClick={() => setSignupError(null)}
                >
                  {tr("a.70afe9eff3")}
                </Button>
              </div>
            </CardContent>
          </Card>
        )}

        <Card className="shadow-elegant animate-fade-up border-border/50">
          <CardHeader className="space-y-1">
            <CardTitle className="font-serif text-2xl text-card-foreground">{tr("a.c586a432ec")}</CardTitle>
            <CardDescription>
              {tr("a.a491984f6c")}
            </CardDescription>
          </CardHeader>
          <CardContent>
            <form onSubmit={handleSignup} className="space-y-5">
              <div className="space-y-2">
                <Label htmlFor="fullName">{tr("a.64346b483c")}</Label>
                <div className="relative">
                  <User className="absolute left-3 top-3 h-4 w-4 text-muted-foreground" />
                  <Input
                    id="fullName"
                    type="text"
                    placeholder={tr("a.ae6e4d1209")}
                    className="pl-10"
                    value={fullName}
                    onChange={(e) => setFullName(e.target.value)}
                    required
                    disabled={isLoading}
                  />
                </div>
              </div>

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
                <Label htmlFor="password">{tr("a.8be3c943b1")}</Label>
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

              <PhoneNumberField
                country={phoneCountry}
                onCountryChange={(c) => { setPhoneCountry(c); setPhoneError(null); }}
                value={phoneNumber}
                onValueChange={(v) => { setPhoneNumber(v); setPhoneError(null); }}
                disabled={isLoading}
                error={phoneError}
              />

              <div className="space-y-2">
                <Label htmlFor="country">{tr("a.d523ebbd10")}</Label>
                <div className="relative">
                  <MapPin className="absolute left-3 top-3 h-4 w-4 text-muted-foreground z-10 pointer-events-none" />
                  <Select value={country} onValueChange={setCountry} required disabled={isLoading}>
                    <SelectTrigger id="country" className="pl-10">
                      <SelectValue placeholder={tr("a.5536b471cb")} />
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
                      {tr("a.1ebb6156b5")}
                    </Label>
                    <p className="text-xs text-muted-foreground">
                      {tr("a.f856f187c0")}
                    </p>
                  </div>
                </div>
              </div>

              <Button type="submit" className="w-full" disabled={isLoading}>
                {isLoading ? (
                  <>
                    <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                    {tr("a.27b8a2d710")}
                  </>
                ) : (
                  <>
                    {tr("a.eff4fd865f")}
                    <ArrowRight className="ml-2 h-4 w-4" />
                  </>
                )}
              </Button>

              <div className="text-center text-sm text-muted-foreground">
                {tr("a.8559034a07")}{" "}
                <button
                  type="button"
                  onClick={() => navigate("/login")}
                  className="text-primary underline underline-offset-4 hover:text-primary/80 transition-smooth"
                >
                  {tr("a.ada2e9e96f")}
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
