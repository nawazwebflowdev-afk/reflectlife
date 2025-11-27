import { useEffect, useState, useMemo } from "react";
import { useNavigate } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Loader2, Check, Search } from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import { getCountryFlag } from "@/lib/countryFlags";
import { useQuery } from "@tanstack/react-query";
import { LazyImage } from "@/components/LazyImage";

interface Template {
  id: string;
  name: string;
  country: string;
  preview_url: string | null;
  price: number;
  is_free: boolean;
  description: string | null;
  is_creator_template: boolean;
  creator_id: string | null;
  creator_name?: string;
}

const Templates = () => {
  const [selectedTemplateId, setSelectedTemplateId] = useState<string | null>(null);
  const [userId, setUserId] = useState<string | null>(null);
  const [filterType, setFilterType] = useState<"all" | "free" | "paid">("all");
  const [searchQuery, setSearchQuery] = useState("");
  const navigate = useNavigate();
  const { toast } = useToast();

  useEffect(() => {
    checkAuth();
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
      .maybeSingle();
    
    if (data?.template_id) {
      setSelectedTemplateId(data.template_id);
    }
  };

  // Fetch system templates with React Query
  const { data: templates = [], isLoading: loadingTemplates } = useQuery({
    queryKey: ['templates', 'system'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("site_templates")
        .select("id, name, country, preview_url, price, is_free, description, is_creator_template, creator_id")
        .is("creator_id", null)
        .order("is_free", { ascending: false })
        .order("created_at", { ascending: false });

      if (error) throw error;
      return data || [];
    },
    staleTime: 1000 * 60 * 10, // 10 minutes
    gcTime: 1000 * 60 * 30, // 30 minutes
  });

  // Fetch creator templates with React Query
  const { data: creatorTemplates = [], isLoading: loadingCreatorTemplates } = useQuery({
    queryKey: ['templates', 'creator'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("site_templates")
        .select(`
          id, name, country, preview_url, price, is_free, description, is_creator_template, creator_id,
          profiles!site_templates_creator_id_fkey(full_name, first_name, last_name)
        `)
        .not("creator_id", "is", null)
        .order("created_at", { ascending: false });

      if (error) throw error;
      
      return (data || []).map((template: any) => ({
        ...template,
        creator_name: template.profiles?.full_name || 
                     `${template.profiles?.first_name || ""} ${template.profiles?.last_name || ""}`.trim() ||
                     "Anonymous Creator"
      }));
    },
    staleTime: 1000 * 60 * 10,
    gcTime: 1000 * 60 * 30,
  });

  const loading = loadingTemplates || loadingCreatorTemplates;

  const handleSelectTemplate = async (templateId: string, isFree: boolean) => {
    if (!userId) {
      toast({
        title: "Sign in required",
        description: "Please sign in to select a template",
        variant: "destructive",
      });
      navigate("/login");
      return;
    }

    if (!isFree) {
      // Redirect to checkout page
      navigate(`/checkout/${templateId}`);
      return;
    }

    // For free templates, apply directly
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
        title: "Template Applied!",
        description: "Your template has been applied to your memorials",
      });
    }
  };


  const filteredTemplates = useMemo(() => {
    return templates.filter((template) => {
      // Filter by type
      if (filterType === "free" && !template.is_free) return false;
      if (filterType === "paid" && template.is_free) return false;

      // Filter by search query
      if (searchQuery) {
        const query = searchQuery.toLowerCase();
        return (
          template.name.toLowerCase().includes(query) ||
          template.country.toLowerCase().includes(query)
        );
      }

      return true;
    });
  }, [templates, filterType, searchQuery]);

  return (
    <div className="py-12 bg-gradient-subtle">
        <div className="container mx-auto px-4">
          <div className="text-center mb-12">
            <h1 className="font-serif text-4xl md:text-5xl font-bold mb-4">
              Memorial Templates
            </h1>
            <p className="text-lg text-muted-foreground max-w-2xl mx-auto">
              Choose a beautiful template to personalize your memorial wall and timeline
            </p>
          </div>

          {/* Featured Templates Section Header */}
          <div className="text-center mb-8 animate-fade-in">
            <h2 className="font-serif text-3xl md:text-4xl font-bold mb-4">
              Featured Templates
            </h2>
            <p className="text-muted-foreground">
              Handpicked designs curated by the ReflectLife team
            </p>
          </div>

          {loading ? (
            <div className="flex justify-center py-20">
              <Loader2 className="h-12 w-12 animate-spin text-primary" />
            </div>
          ) : (
            <>
              {/* Filter Bar */}
              <div className="mb-8 max-w-7xl mx-auto flex flex-col md:flex-row gap-4">
                <div className="relative flex-1">
                  <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                  <Input
                    placeholder="Search by country or name..."
                    value={searchQuery}
                    onChange={(e) => setSearchQuery(e.target.value)}
                    className="pl-10"
                  />
                </div>
                <Select value={filterType} onValueChange={(value: "all" | "free" | "paid") => setFilterType(value)}>
                  <SelectTrigger className="w-full md:w-[180px]">
                    <SelectValue placeholder="Filter by type" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">All Templates</SelectItem>
                    <SelectItem value="free">Free Only</SelectItem>
                    <SelectItem value="paid">Paid Only</SelectItem>
                  </SelectContent>
                </Select>
              </div>

              {/* Featured Templates Grid */}
              {filteredTemplates.length === 0 ? (
                <div className="text-center py-20 mb-16">
                  <p className="text-muted-foreground">No featured templates found matching your criteria.</p>
                </div>
              ) : (
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6 max-w-7xl mx-auto mb-16">
                  {filteredTemplates.map((template, index) => (
                    <Card
                      key={template.id}
                      className={`border-2 hover:shadow-elegant transition-smooth hover:-translate-y-1 bg-card overflow-hidden animate-fade-in ${
                        selectedTemplateId === template.id ? "border-primary" : ""
                      }`}
                      style={{ animationDelay: `${index * 0.05}s` }}
                    >
                      <div className="aspect-[3/4] overflow-hidden relative">
                        <LazyImage
                          src={template.preview_url || "https://images.unsplash.com/photo-1485963631004-f2f00b1d6606?w=400"}
                          alt={template.name}
                          className="w-full h-full object-cover"
                          containerClassName="w-full h-full"
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
                            <Badge variant="outline">€{template.price}</Badge>
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

              {/* Creator Templates Section */}
              <div className="text-center mb-8 mt-16 animate-fade-in">
                <h2 className="font-serif text-3xl md:text-4xl font-bold mb-4 bg-gradient-to-r from-primary to-primary/60 bg-clip-text text-transparent">
                  Creator Templates
                </h2>
                <p className="text-lg text-muted-foreground max-w-2xl mx-auto">
                  Unique designs from our community of talented creators • Updated in real-time
                </p>
              </div>

              {creatorTemplates.length === 0 ? (
                <div className="text-center py-20">
                  <p className="text-muted-foreground">No creator templates available yet. Check back soon!</p>
                </div>
              ) : (
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6 max-w-7xl mx-auto">
                  {creatorTemplates.map((template, index) => (
                      <Card
                        key={template.id}
                        className={`border-2 hover:shadow-elegant transition-smooth hover:-translate-y-1 bg-card overflow-hidden animate-fade-in ${
                          selectedTemplateId === template.id ? "border-primary" : ""
                        }`}
                        style={{ animationDelay: `${index * 0.05}s` }}
                      >
                        <div className="aspect-[3/4] overflow-hidden relative">
                          <LazyImage
                            src={template.preview_url || "https://images.unsplash.com/photo-1485963631004-f2f00b1d6606?w=400"}
                            alt={template.name}
                            className="w-full h-full object-cover"
                            containerClassName="w-full h-full"
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
                          <p className="text-xs text-muted-foreground mb-2">
                            By @{template.creator_name}
                          </p>
                          <p className="text-sm text-muted-foreground mb-3">
                            {template.description}
                          </p>
                          <div className="flex items-center justify-between">
                            {template.is_free ? (
                              <Badge variant="secondary">Free</Badge>
                            ) : (
                              <Badge variant="outline">€{template.price}</Badge>
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
              </>
            )}
        </div>
    </div>
  );
};

export default Templates;
