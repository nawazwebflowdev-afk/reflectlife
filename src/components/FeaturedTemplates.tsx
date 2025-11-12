import { useEffect, useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Loader2 } from "lucide-react";
import { getCountryFlag } from "@/lib/countryFlags";
import { useToast } from "@/hooks/use-toast";

interface Template {
  id: string;
  name: string;
  country: string;
  preview_url: string | null;
  is_free: boolean;
  price: number;
}

const FeaturedTemplates = () => {
  const [templates, setTemplates] = useState<Template[]>([]);
  const [loading, setLoading] = useState(true);
  const [userId, setUserId] = useState<string | null>(null);
  const navigate = useNavigate();
  const { toast } = useToast();

  useEffect(() => {
    checkAuth();
    fetchFreeTemplates();
  }, []);

  const checkAuth = async () => {
    const { data: { session } } = await supabase.auth.getSession();
    if (session?.user) {
      setUserId(session.user.id);
    }
  };

  const fetchFreeTemplates = async () => {
    // Fetch 2 free templates
    const { data: freeTemplates } = await supabase
      .from("site_templates")
      .select("id, name, country, preview_url, is_free, price")
      .eq("is_free", true)
      .order("created_at", { ascending: false })
      .limit(2);

    // Fetch 2 paid templates
    const { data: paidTemplates } = await supabase
      .from("site_templates")
      .select("id, name, country, preview_url, is_free, price")
      .eq("is_free", false)
      .order("created_at", { ascending: false })
      .limit(2);

    if (freeTemplates && paidTemplates) {
      setTemplates([...freeTemplates, ...paidTemplates]);
    }
    setLoading(false);
  };

  const handleBuyTemplate = (templateId: string, isFree: boolean) => {
    if (!userId) {
      toast({
        title: "Sign in required",
        description: "Please sign in to purchase a template",
        variant: "destructive",
      });
      navigate("/login");
      return;
    }

    if (isFree) {
      navigate("/templates");
      return;
    }

    // Redirect to checkout page
    navigate(`/checkout/${templateId}`);
  };

  if (loading) {
    return (
      <div className="flex justify-center py-12">
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
      </div>
    );
  }

  return (
    <>
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 max-w-6xl mx-auto mb-8">
        {templates.map((template, index) => (
          <Card
            key={template.id}
            className="border-2 hover:shadow-elegant transition-smooth hover:-translate-y-1 bg-card animate-fade-in overflow-hidden"
            style={{ animationDelay: `${index * 100}ms` }}
          >
            <div className="aspect-[3/4] overflow-hidden">
              <img
                src={template.preview_url || "https://images.unsplash.com/photo-1485963631004-f2f00b1d6606?w=400"}
                alt={template.name}
                className="w-full h-full object-cover hover:scale-105 transition-smooth"
              />
            </div>
            <CardContent className="p-4 space-y-3">
              <div className="flex items-center gap-2">
                <span className="text-2xl">{getCountryFlag(template.country)}</span>
                <h3 className="font-serif text-lg font-semibold">{template.name}</h3>
              </div>
              <p className="text-sm text-muted-foreground">{template.country}</p>
              <div className="flex items-center justify-between pt-2">
                <span className="font-semibold text-lg">
                  {template.is_free ? "Free" : `€${template.price.toFixed(2)}`}
                </span>
                <Button 
                  variant="secondary" 
                  size="sm"
                  onClick={() => handleBuyTemplate(template.id, template.is_free)}
                >
                  {template.is_free ? "View Template" : "Buy Template"}
                </Button>
              </div>
            </CardContent>
          </Card>
        ))}
      </div>

      <div className="text-center">
        <Link to="/templates">
          <Button size="lg" className="px-8 shadow-elegant">
            View All Templates
          </Button>
        </Link>
      </div>
    </>
  );
};

export default FeaturedTemplates;
