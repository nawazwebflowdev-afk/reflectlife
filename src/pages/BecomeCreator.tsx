import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Checkbox } from "@/components/ui/checkbox";
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from "@/components/ui/form";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { useToast } from "@/hooks/use-toast";
import { Palette, TrendingUp, DollarSign, Upload, Loader2 } from "lucide-react";
import { countries } from "@/data/countries";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";

const templateFormSchema = z.object({
  name: z.string().min(3, "Name must be at least 3 characters").max(100, "Name must be less than 100 characters"),
  description: z.string().min(10, "Description must be at least 10 characters").max(500, "Description must be less than 500 characters"),
  price: z.coerce.number().min(4.99, "Minimum price is €4.99").max(19.99, "Maximum price is €19.99"),
});

type TemplateFormValues = z.infer<typeof templateFormSchema>;

const BecomeCreator = () => {
  const [displayName, setDisplayName] = useState("");
  const [email, setEmail] = useState("");
  const [country, setCountry] = useState("");
  const [portfolio, setPortfolio] = useState("");
  const [description, setDescription] = useState("");
  const [agreeTerms, setAgreeTerms] = useState(false);
  const [loading, setLoading] = useState(false);
  const [userId, setUserId] = useState<string | null>(null);
  const [isApprovedCreator, setIsApprovedCreator] = useState(false);
  const [isPending, setIsPending] = useState(false);
  const [previewFile, setPreviewFile] = useState<File | null>(null);
  const [uploadProgress, setUploadProgress] = useState(0);
  const navigate = useNavigate();
  const { toast } = useToast();

  const form = useForm<TemplateFormValues>({
    resolver: zodResolver(templateFormSchema),
    defaultValues: {
      name: "",
      description: "",
      price: 4.99,
    },
  });

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
      .maybeSingle();
    
    if (creator) {
      if (creator.approved) {
        setIsApprovedCreator(true);
        setCountry(creator.country);
      } else {
        setIsPending(true);
      }
    }
  };

  const handleApplicationSubmit = async (e: React.FormEvent) => {
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

  const handleTemplateSubmit = async (values: TemplateFormValues) => {
    if (!previewFile) {
      toast({
        title: "Missing Information",
        description: "Please upload a preview image",
        variant: "destructive",
      });
      return;
    }

    setLoading(true);
    setUploadProgress(0);

    try {
      // Get current authenticated user
      const { data: { user }, error: authError } = await supabase.auth.getUser();
      
      if (authError || !user) {
        throw new Error("You must be logged in to upload templates");
      }

      // Upload preview image
      const fileExt = previewFile.name.split(".").pop();
      const fileName = `${user.id}-${Date.now()}.${fileExt}`;
      const filePath = `templates/${fileName}`;

      const { error: uploadError } = await supabase.storage
        .from("memorial_uploads")
        .upload(filePath, previewFile);

      if (uploadError) throw uploadError;

      const { data: { publicUrl } } = supabase.storage
        .from("memorial_uploads")
        .getPublicUrl(filePath);

      setUploadProgress(50);

      // Insert template with authenticated user's ID
      const { error: insertError } = await supabase
        .from("site_templates")
        .insert([
          {
            creator_id: user.id,
            name: values.name,
            description: values.description,
            price: values.price,
            preview_url: publicUrl,
            country: country,
            is_free: false,
            is_creator_template: true,
          },
        ]);

      if (insertError) throw insertError;

      setUploadProgress(100);

      toast({
        title: "Success",
        description: "Template published successfully!",
      });

      form.reset();
      setPreviewFile(null);
      setUploadProgress(0);
    } catch (error: any) {
      toast({
        title: "Upload Failed",
        description: error.message || "Failed to upload template. Please try again.",
        variant: "destructive",
      });
    } finally {
      setLoading(false);
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

  // Show pending state
  if (isPending) {
    return (
      <div className="min-h-screen bg-gradient-to-b from-background to-secondary/20 flex items-center justify-center">
        <Card className="max-w-md mx-4">
          <CardHeader>
            <CardTitle className="text-center font-serif">Application Under Review</CardTitle>
          </CardHeader>
          <CardContent className="text-center">
            <p className="text-muted-foreground mb-6">
              Your creator request is still under review. You'll be notified once approved.
            </p>
            <Button onClick={() => navigate("/dashboard")}>
              Back to Dashboard
            </Button>
          </CardContent>
        </Card>
      </div>
    );
  }

  // Show approved creator dashboard
  if (isApprovedCreator) {
    return (
      <div className="py-12 bg-gradient-subtle">
        <div className="container mx-auto px-4 max-w-4xl">
          <div className="text-center mb-12">
            <h1 className="font-serif text-4xl md:text-5xl font-bold mb-4 bg-gradient-to-r from-primary to-primary/60 bg-clip-text text-transparent">
              Welcome to the Creative World
            </h1>
            <p className="text-lg text-muted-foreground">
              Where memories meet art
            </p>
          </div>

          <Card className="shadow-elegant">
            <CardHeader>
              <CardTitle className="font-serif text-2xl">Publish a New Template</CardTitle>
              <CardDescription>
                Share your creative design with the community
              </CardDescription>
            </CardHeader>
            <CardContent>
              <Form {...form}>
                <form onSubmit={form.handleSubmit(handleTemplateSubmit)} className="space-y-6">
                  <FormField
                    control={form.control}
                    name="name"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Template Name</FormLabel>
                        <FormControl>
                          <Input placeholder="Enter template name" {...field} />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />

                  <FormField
                    control={form.control}
                    name="description"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Description</FormLabel>
                        <FormControl>
                          <Textarea 
                            placeholder="Describe your template..."
                            className="min-h-[100px]"
                            {...field}
                          />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />

                  <div className="space-y-2">
                    <Label htmlFor="preview_image">Preview Image *</Label>
                    <div className="flex items-center gap-4">
                      <Input
                        id="preview_image"
                        type="file"
                        accept="image/*"
                        onChange={(e) => {
                          const file = e.target.files?.[0];
                          if (file) {
                            if (file.size > 5 * 1024 * 1024) {
                              toast({
                                title: "File too large",
                                description: "Image must be less than 5MB",
                                variant: "destructive",
                              });
                              return;
                            }
                            setPreviewFile(file);
                          }
                        }}
                        required
                      />
                      <Upload className="w-5 h-5 text-muted-foreground" />
                    </div>
                    {previewFile && (
                      <p className="text-sm text-muted-foreground">
                        Selected: {previewFile.name}
                      </p>
                    )}
                  </div>

                  <FormField
                    control={form.control}
                    name="price"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Price (€)</FormLabel>
                        <FormControl>
                          <Input 
                            type="number" 
                            step="0.01"
                            min="4.99"
                            max="19.99"
                            placeholder="4.99"
                            {...field}
                          />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />

                  {uploadProgress > 0 && uploadProgress < 100 && (
                    <div className="w-full bg-secondary rounded-full h-2">
                      <div 
                        className="bg-primary h-2 rounded-full transition-all duration-300"
                        style={{ width: `${uploadProgress}%` }}
                      />
                    </div>
                  )}

                  <Button type="submit" className="w-full" disabled={loading}>
                    {loading ? (
                      <>
                        <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                        Publishing...
                      </>
                    ) : (
                      "Publish Template"
                    )}
                  </Button>
                </form>
              </Form>
            </CardContent>
          </Card>
        </div>
      </div>
    );
  }

  // Show application form for new creators
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
            <form onSubmit={handleApplicationSubmit} className="space-y-6">
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
