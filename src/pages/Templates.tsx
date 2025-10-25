import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Loader2, Check } from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import Navigation from "@/components/Navigation";
import Footer from "@/components/Footer";

interface Template {
  id: string;
  name: string;
  country: string;
  preview_url: string | null;
  price: number;
  is_free: boolean;
  description: string | null;
}

const Templates = () => {
  const [templates, setTemplates] = useState<Template[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedTemplateId, setSelectedTemplateId] = useState<string | null>(null);
  const [userId, setUserId] = useState<string | null>(null);
  const navigate = useNavigate();
  const { toast } = useToast();

  useEffect(() => {
    checkAuth();
    fetchTemplates();
  }, []);

  const checkAuth = async () => {
    const { data: { session } } = await supabase.auth.getSession();
    if (session?.user) {
      setUserId(session.user.id);
      fetchUserTemplate(session.user.id);
    }
  };

  const fetchUserTemplate = async (uid: string) => {
    const { data } = await supabase
      .from("profiles")
      .select("template_id")
      .eq("id", uid)
      .single();
    
    if (data?.template_id) {
      setSelectedTemplateId(data.template_id);
    }
  };

  const fetchTemplates = async () => {
    const { data, error } = await supabase
      .from("site_templates")
      .select("*")
      .order("is_free", { ascending: false })
      .order("created_at", { ascending: true });

    if (data && !error) {
      setTemplates(data);
    }
    setLoading(false);
  };

  const handleSelectTemplate = async (templateId: string, isFree: boolean) => {
    if (!userId) {
      toast({
        title: "Sign in required",
        description: "Please sign in to select a template",
        variant: "destructive",
      });
      navigate("/auth");
      return;
    }

    if (!isFree) {
      toast({
        title: "Purchase Required",
        description: "Payment integration coming soon!",
      });
      return;
    }

    const { error } = await supabase
      .from("profiles")
      .update({ template_id: templateId })
      .eq("id", userId);

    if (error) {
      toast({
        title: "Error",
        description: "Failed to select template",
        variant: "destructive",
      });
    } else {
      setSelectedTemplateId(templateId);
      toast({
        title: "Template Selected",
        description: "Your template has been applied to your memorials",
      });
    }
  };

  const getCountryFlag = (country: string): string => {
    const flags: Record<string, string> = {
      "United States": "🇺🇸",
      "United Kingdom": "🇬🇧",
      "France": "🇫🇷",
      "Japan": "🇯🇵",
      "Italy": "🇮🇹",
      "Spain": "🇪🇸",
      "Germany": "🇩🇪",
      "India": "🇮🇳",
      "Brazil": "🇧🇷",
      "Australia": "🇦🇺",
    };
    return flags[country] || "🌍";
  };

  return (
    <div className="min-h-screen flex flex-col">
      <Navigation />
      
      <main className="flex-1 py-12 bg-gradient-subtle">
        <div className="container mx-auto px-4">
          <div className="text-center mb-12">
            <h1 className="font-serif text-4xl md:text-5xl font-bold mb-4">
              Memorial Templates
            </h1>
            <p className="text-lg text-muted-foreground max-w-2xl mx-auto">
              Choose a beautiful template to personalize your memorial wall and timeline
            </p>
          </div>

          {loading ? (
            <div className="flex justify-center py-20">
              <Loader2 className="h-12 w-12 animate-spin text-primary" />
            </div>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6 max-w-7xl mx-auto">
              {templates.map((template) => (
                <Card
                  key={template.id}
                  className={`border-2 hover:shadow-elegant transition-smooth hover:-translate-y-1 bg-card overflow-hidden ${
                    selectedTemplateId === template.id ? "border-primary" : ""
                  }`}
                >
                  <div className="aspect-[3/4] overflow-hidden relative">
                    <img
                      src={template.preview_url || "https://images.unsplash.com/photo-1485963631004-f2f00b1d6606?w=400"}
                      alt={template.name}
                      className="w-full h-full object-cover"
                    />
                    {selectedTemplateId === template.id && (
                      <div className="absolute top-2 right-2 bg-primary text-primary-foreground rounded-full p-2">
                        <Check className="h-4 w-4" />
                      </div>
                    )}
                  </div>
                  <CardContent className="p-4">
                    <div className="flex items-center gap-2 mb-2">
                      <span className="text-2xl">{getCountryFlag(template.country)}</span>
                      <h3 className="font-serif text-lg font-semibold">{template.name}</h3>
                    </div>
                    <p className="text-sm text-muted-foreground mb-3">
                      {template.description}
                    </p>
                    <div className="flex items-center justify-between">
                      {template.is_free ? (
                        <Badge variant="secondary">Free</Badge>
                      ) : (
                        <Badge variant="outline">${template.price}</Badge>
                      )}
                      <Button
                        size="sm"
                        variant={selectedTemplateId === template.id ? "outline" : "default"}
                        onClick={() => handleSelectTemplate(template.id, template.is_free)}
                        disabled={selectedTemplateId === template.id}
                      >
                        {selectedTemplateId === template.id
                          ? "Selected"
                          : template.is_free
                          ? "Use Template"
                          : "Buy Template"}
                      </Button>
                    </div>
                  </CardContent>
                </Card>
              ))}
            </div>
          )}
        </div>
      </main>

      <Footer />
    </div>
  );
};

export default Templates;
