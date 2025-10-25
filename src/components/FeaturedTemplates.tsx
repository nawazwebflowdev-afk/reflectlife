import { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Loader2 } from "lucide-react";

interface Template {
  id: string;
  name: string;
  country: string;
  preview_url: string | null;
}

const FeaturedTemplates = () => {
  const [templates, setTemplates] = useState<Template[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetchFreeTemplates();
  }, []);

  const fetchFreeTemplates = async () => {
    const { data, error } = await supabase
      .from("site_templates")
      .select("id, name, country, preview_url")
      .eq("is_free", true)
      .limit(4);

    if (data && !error) {
      setTemplates(data);
    }
    setLoading(false);
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
            <CardContent className="p-4">
              <div className="flex items-center gap-2 mb-2">
                <span className="text-2xl">{getCountryFlag(template.country)}</span>
                <h3 className="font-serif text-lg font-semibold">{template.name}</h3>
              </div>
              <p className="text-sm text-muted-foreground">{template.country}</p>
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

export default FeaturedTemplates;
