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

import { tr } from "@/i18n/tr";
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
        title: tr("a.934d2a9003"),
        description: tr("a.4fca9545ae"),
        variant: "destructive",
      });
      navigate("/login");
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
        title: tr("a.c4c1914255"),
        description: tr("a.8a97e25e04"),
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
        title: tr("a.7f2f6a15cf"),
        description: tr("a.1e190ae3cf"),
        variant: "destructive",
      });
    } else {
      // Send confirmation email to applicant and notify admin
      supabase.functions.invoke("send-creator-application", {
        body: {
          applicantEmail: email,
          displayName,
          country,
          description,
        },
      }).catch((err) => console.error("Email notification failed:", err));

      toast({
        title: tr("a.9c2639158f"),
        description: tr("a.4370903190"),
      });
      navigate("/dashboard");
    }
  };

  const handleTemplateSubmit = async (values: TemplateFormValues) => {
    if (!previewFile) {
      toast({
        title: tr("a.544c70e706"),
        description: tr("a.5e67b4c3c9"),
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
        throw new Error(tr("a.a833b59cab"));
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
        title: tr("a.42a8f651d7"),
        description: tr("a.775423b43f"),
      });

      form.reset();
      setPreviewFile(null);
      setUploadProgress(0);
    } catch (error: any) {
      toast({
        title: tr("a.88c104b376"),
        description: error.message || tr("a.0f48d75b93"),
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  };

  const benefits = [
    {
      icon: Palette,
      title: tr("a.2c058a4308"),
      description: tr("a.f4cee16016"),
    },
    {
      icon: TrendingUp,
      title: tr("a.78f4a45f7d"),
      description: tr("a.8c6785da6b"),
    },
    {
      icon: DollarSign,
      title: tr("a.1c4f21d861"),
      description: tr("a.4298c569f3"),
    },
  ];

  // Show pending state
  if (isPending) {
    return (
      <div className="min-h-screen bg-gradient-to-b from-background to-secondary/20 flex items-center justify-center">
        <Card className="max-w-md mx-4">
          <CardHeader>
            <CardTitle className="text-center font-serif">{tr("a.8a07e65bef")}</CardTitle>
          </CardHeader>
          <CardContent className="text-center">
            <p className="text-muted-foreground mb-6">
              {tr("a.e38c976479")}
            </p>
            <Button onClick={() => navigate("/dashboard")}>
              {tr("a.8fb719081e")}
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
              {tr("a.23d1da117e")}
            </h1>
            <p className="text-lg text-muted-foreground">
              {tr("a.c7202507dd")}
            </p>
          </div>

          <Card className="shadow-elegant">
            <CardHeader>
              <CardTitle className="font-serif text-2xl">{tr("a.5bcdf81701")}</CardTitle>
              <CardDescription>
                {tr("a.88f0c74c65")}
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
                        <FormLabel>{tr("a.48c5544ff8")}</FormLabel>
                        <FormControl>
                          <Input placeholder={tr("a.aec03a9f44")} {...field} />
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
                        <FormLabel>{tr("a.55f8ebc805")}</FormLabel>
                        <FormControl>
                          <Textarea 
                            placeholder={tr("a.9ccca73c94")}
                            className="min-h-[100px]"
                            {...field}
                          />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />

                  <div className="space-y-2">
                    <Label htmlFor="preview_image">{tr("a.14b6118edd")}</Label>
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
                                title: tr("a.a0704a4eaa"),
                                description: tr("a.7b2cdf2257"),
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
                        {tr("a.2e0844789c")} {previewFile.name}
                      </p>
                    )}
                  </div>

                  <FormField
                    control={form.control}
                    name="price"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>{tr("a.72877a5274")}</FormLabel>
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
                        {tr("a.d281c9f37a")}
                      </>
                    ) : (
                      tr("a.8bf821ff59")
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
            {tr("a.d6954f9f73")}
          </h1>
          <p className="text-lg text-muted-foreground">
            {tr("a.3b8877ae7c")}
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
            <CardTitle className="font-serif text-2xl">{tr("a.aa6e574cb8")}</CardTitle>
          </CardHeader>
          <CardContent>
            <form onSubmit={handleApplicationSubmit} className="space-y-6">
              <div>
                <Label htmlFor="displayName">{tr("a.2c006c5db0")}</Label>
                <Input
                  id="displayName"
                  value={displayName}
                  onChange={(e) => setDisplayName(e.target.value)}
                  placeholder={tr("a.e7af5696f4")}
                  required
                />
              </div>

              <div>
                <Label htmlFor="email">{tr("a.604e4bff22")}</Label>
                <Input
                  id="email"
                  type="email"
                  value={email}
                  disabled
                  className="bg-muted"
                />
              </div>

              <div>
                <Label htmlFor="country">{tr("a.0f96626285")}</Label>
                <Select value={country} onValueChange={setCountry} required>
                  <SelectTrigger>
                    <SelectValue placeholder={tr("a.5536b471cb")} />
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
                <Label htmlFor="portfolio">{tr("a.411fcfa1b0")}</Label>
                <Input
                  id="portfolio"
                  type="url"
                  value={portfolio}
                  onChange={(e) => setPortfolio(e.target.value)}
                  placeholder="https://your-portfolio.com"
                />
              </div>

              <div>
                <Label htmlFor="description">{tr("a.27ebe10f20")}</Label>
                <Textarea
                  id="description"
                  value={description}
                  onChange={(e) => setDescription(e.target.value)}
                  placeholder={tr("a.30034279f7")}
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
                  {tr("a.469347ba55")}
                </Label>
              </div>

              <Button type="submit" size="lg" className="w-full" disabled={loading}>
                {loading ? tr("a.46a1a6919d") : tr("a.f326633a19")}
              </Button>
            </form>
          </CardContent>
        </Card>
      </div>
    </div>
  );
};

export default BecomeCreator;
