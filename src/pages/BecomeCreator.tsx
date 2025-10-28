import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Checkbox } from "@/components/ui/checkbox";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { useToast } from "@/hooks/use-toast";
import { Palette, TrendingUp, DollarSign } from "lucide-react";
import { countries } from "@/data/countries";

const BecomeCreator = () => {
  const [displayName, setDisplayName] = useState("");
  const [email, setEmail] = useState("");
  const [country, setCountry] = useState("");
  const [portfolio, setPortfolio] = useState("");
  const [description, setDescription] = useState("");
  const [agreeTerms, setAgreeTerms] = useState(false);
  const [loading, setLoading] = useState(false);
  const [userId, setUserId] = useState<string | null>(null);
  const navigate = useNavigate();
  const { toast } = useToast();

  useEffect(() => {
    checkAuth();
  }, []);

  const checkAuth = async () => {
    const { data: { session } } = await supabase.auth.getSession();
    if (!session?.user) {
      toast({
        title: "Sign in required",
        description: "Please sign in to become a creator",
        variant: "destructive",
      });
      navigate("/auth");
      return;
    }
    
    setUserId(session.user.id);
    setEmail(session.user.email || "");
    
    // Check if already a creator
    const { data: creator } = await supabase
      .from("template_creators")
      .select("*")
      .eq("user_id", session.user.id)
      .single();
    
    if (creator) {
      toast({
        title: "Already a Creator",
        description: creator.approved 
          ? "You're already an approved creator!"
          : "Your creator application is pending approval",
      });
      navigate("/dashboard");
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!agreeTerms) {
      toast({
        title: "Terms Required",
        description: "Please agree to the Creator Terms",
        variant: "destructive",
      });
      return;
    }

    if (!userId) return;

    setLoading(true);

    const { error } = await supabase
      .from("template_creators")
      .insert({
        user_id: userId,
        display_name: displayName,
        country,
        portfolio: portfolio || null,
        description: description || null,
        approved: false,
      });

    setLoading(false);

    if (error) {
      toast({
        title: "Error",
        description: "Failed to submit creator application",
        variant: "destructive",
      });
    } else {
      toast({
        title: "Application Submitted",
        description: "Your application has been submitted. You'll be notified when approved.",
      });
      navigate("/dashboard");
    }
  };

  const benefits = [
    {
      icon: Palette,
      title: "Creative Freedom",
      description: "Design beautiful memorial templates with your unique style",
    },
    {
      icon: TrendingUp,
      title: "Reach Thousands",
      description: "Your templates will be seen by families worldwide",
    },
    {
      icon: DollarSign,
      title: "Earn Revenue",
      description: "Set your own prices and earn from every template sale",
    },
  ];

  return (
    <div className="py-12 bg-gradient-subtle">
        <div className="container mx-auto px-4 max-w-4xl">
          <div className="text-center mb-12">
            <h1 className="font-serif text-4xl md:text-5xl font-bold mb-4">
              Become a Template Creator
            </h1>
            <p className="text-lg text-muted-foreground">
              Share your creativity and earn by designing memorial templates
            </p>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-12">
            {benefits.map((benefit, index) => (
              <Card key={index}>
                <CardContent className="p-6 text-center">
                  <div className="w-12 h-12 mx-auto mb-4 rounded-full bg-primary/10 flex items-center justify-center">
                    <benefit.icon className="h-6 w-6 text-primary" />
                  </div>
                  <h3 className="font-serif text-lg font-semibold mb-2">
                    {benefit.title}
                  </h3>
                  <p className="text-sm text-muted-foreground">
                    {benefit.description}
                  </p>
                </CardContent>
              </Card>
            ))}
          </div>

          <Card>
            <CardHeader>
              <CardTitle className="font-serif text-2xl">Creator Registration</CardTitle>
            </CardHeader>
            <CardContent>
              <form onSubmit={handleSubmit} className="space-y-6">
                <div>
                  <Label htmlFor="displayName">Display Name *</Label>
                  <Input
                    id="displayName"
                    value={displayName}
                    onChange={(e) => setDisplayName(e.target.value)}
                    placeholder="Your creative name"
                    required
                  />
                </div>

                <div>
                  <Label htmlFor="email">Email *</Label>
                  <Input
                    id="email"
                    type="email"
                    value={email}
                    disabled
                    className="bg-muted"
                  />
                </div>

                <div>
                  <Label htmlFor="country">Country *</Label>
                  <Select value={country} onValueChange={setCountry} required>
                    <SelectTrigger>
                      <SelectValue placeholder="Select your country" />
                    </SelectTrigger>
                    <SelectContent>
                      {countries.map((c) => (
                        <SelectItem key={c} value={c}>
                          {c}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>

                <div>
                  <Label htmlFor="portfolio">Portfolio Link (Optional)</Label>
                  <Input
                    id="portfolio"
                    type="url"
                    value={portfolio}
                    onChange={(e) => setPortfolio(e.target.value)}
                    placeholder="https://your-portfolio.com"
                  />
                </div>

                <div>
                  <Label htmlFor="description">Why do you want to become a creator? *</Label>
                  <Textarea
                    id="description"
                    value={description}
                    onChange={(e) => setDescription(e.target.value)}
                    placeholder="Tell us about your creative vision and why you'd like to design memorial templates..."
                    rows={4}
                    required
                  />
                </div>

                <div className="flex items-start gap-2">
                  <Checkbox
                    id="terms"
                    checked={agreeTerms}
                    onCheckedChange={(checked) => setAgreeTerms(checked as boolean)}
                  />
                  <Label htmlFor="terms" className="cursor-pointer text-sm">
                    I agree to the Creator Terms and understand that my templates will be
                    reviewed before being published
                  </Label>
                </div>

                <Button type="submit" size="lg" className="w-full" disabled={loading}>
                  {loading ? "Submitting..." : "Submit Application"}
                </Button>
              </form>
            </CardContent>
          </Card>
        </div>
    </div>
  );
};

export default BecomeCreator;
