import { useState, useEffect } from "react";
import { Link, useNavigate } from "react-router-dom";
import { Search, Users, Plus, Loader2, Eye, EyeOff } from "lucide-react";
import { Input } from "@/components/ui/input";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";
import { useTemplateTheme } from "@/hooks/useTemplateTheme";
import CreateMemorialModal from "@/components/CreateMemorialModal";
import PageTemplateSelector from "@/components/PageTemplateSelector";
import portraitPlaceholder from "@/assets/portrait-placeholder.jpg";
import timelineBg from "@/assets/timeline-bg.jpg";
import { format } from "date-fns";
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from "@/components/ui/tooltip";

interface Memorial {
  id: string;
  name: string;
  date_of_birth: string | null;
  date_of_death: string | null;
  location: string | null;
  preview_image_url: string | null;
  bio: string | null;
  user_id: string;
  is_public: boolean | null;
  privacy_level: string | null;
}

const Memorials = () => {
  const navigate = useNavigate();
  const { toast } = useToast();
  const [memorialTemplateId, setMemorialTemplateId] = useState<string | null>(null);
  const templateTheme = useTemplateTheme(memorialTemplateId, { fallbackToProfile: false });
  const [searchQuery, setSearchQuery] = useState("");
  const [memorials, setMemorials] = useState<Memorial[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [isCreateModalOpen, setIsCreateModalOpen] = useState(false);
  const [user, setUser] = useState<any>(null);

  useEffect(() => {
    checkUser();
    fetchMemorials();
  }, []);

  const checkUser = async () => {
    const { data: { user } } = await supabase.auth.getUser();
    setUser(user);
    if (user) {
      const { data: profile } = await supabase
        .from("profiles")
        .select("memorial_template_id")
        .eq("id", user.id)
        .single();
      if (profile?.memorial_template_id) {
        setMemorialTemplateId(profile.memorial_template_id);
      }
    }
  };

  const fetchMemorials = async () => {
    setIsLoading(true);
    try {
      const { data: { user: currentUser } } = await supabase.auth.getUser();
      
      // Only fetch public memorials + user's own
      let query = supabase
        .from('memorials')
        .select('*')
        .order('created_at', { ascending: false });

      if (currentUser) {
        // Show public memorials OR user's own (regardless of privacy)
        query = query.or(`and(is_public.eq.true,privacy_level.eq.public),user_id.eq.${currentUser.id}`);
      } else {
        // Anonymous: only public
        query = query.eq('is_public', true).eq('privacy_level', 'public');
      }

      const { data, error } = await query;
      if (error) throw error;
      setMemorials(data || []);
    } catch (error: any) {
      console.error('Error fetching memorials:', error);
      toast({
        title: "Error loading memorials",
        description: error.message,
        variant: "destructive",
      });
    } finally {
      setIsLoading(false);
    }
  };

  const handleCreateClick = () => {
    if (!user) {
      navigate('/login');
    } else {
      setIsCreateModalOpen(true);
    }
  };

  const toggleVisibility = async (e: React.MouseEvent, memorial: Memorial) => {
    e.preventDefault();
    e.stopPropagation();
    const newIsPublic = !memorial.is_public;
    const newPrivacy = newIsPublic ? 'public' : 'private';
    try {
      const { error } = await supabase
        .from('memorials')
        .update({ is_public: newIsPublic, privacy_level: newPrivacy })
        .eq('id', memorial.id);
      if (error) throw error;
      setMemorials(prev => prev.map(m => m.id === memorial.id ? { ...m, is_public: newIsPublic, privacy_level: newPrivacy } : m));
      toast({
        title: newIsPublic ? "Memorial is now public" : "Memorial is now private",
        description: newIsPublic ? "This memorial will appear on the homepage." : "This memorial is hidden from public view.",
      });
    } catch (error: any) {
      toast({ title: "Error updating visibility", description: error.message, variant: "destructive" });
    }
  };

  const formatYears = (dob: string | null, dod: string | null) => {
    const birthYear = dob ? format(new Date(dob), 'yyyy') : '?';
    const deathYear = dod ? format(new Date(dod), 'yyyy') : '?';
    return `${birthYear} - ${deathYear}`;
  };

  const filteredMemorials = memorials.filter((memorial) =>
    memorial.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
    memorial.location?.toLowerCase().includes(searchQuery.toLowerCase())
  );

  const backgroundImage = templateTheme.backgroundUrl || timelineBg;

  return (
    <div
      className="min-h-screen"
      style={{
        backgroundImage: templateTheme.backgroundUrl
          ? `linear-gradient(rgba(255,255,255,0.85), rgba(255,255,255,0.85)), url(${templateTheme.backgroundUrl})`
          : undefined,
        backgroundSize: "cover",
        backgroundPosition: "center",
        backgroundAttachment: "fixed",
      }}
    >
      {/* Hero Header with Template Background */}
      <section 
        className="relative h-[400px] flex items-center transition-smooth"
        style={{
          backgroundImage: `linear-gradient(rgba(0,0,0,0.5), rgba(0,0,0,0.5)), url(${backgroundImage})`,
          backgroundSize: "cover",
          backgroundPosition: "center",
        }}
      >
        <div className="absolute inset-0 bg-gradient-to-b from-transparent via-background/40 to-background" />
        
        <div className="relative container mx-auto px-4 text-center">
          <h1 className="font-serif text-4xl md:text-6xl font-bold mb-4 text-white drop-shadow-lg animate-fade-in">
            Memorial Wall
          </h1>
          <p className="text-lg md:text-xl text-white/90 max-w-2xl mx-auto mb-8 drop-shadow-md">
            Celebrating lives and preserving legacies. Browse memorials or create one for your loved one.
          </p>

          {/* Search */}
          <div className="max-w-xl mx-auto mb-6">
            <div className="relative">
              <Search className="absolute left-3 top-3 h-5 w-5 text-muted-foreground" />
              <Input
                type="text"
                placeholder="Search by name, location, or date..."
                className="pl-10 h-12 bg-background/90 backdrop-blur-sm"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
              />
            </div>
          </div>

          {/* Action Buttons */}
          <div className="flex items-center justify-center gap-3 flex-wrap">
            <Button 
              onClick={handleCreateClick}
              size="lg"
              className="gap-2 shadow-lg"
            >
              <Plus className="h-5 w-5" />
              Create a Memorial
            </Button>
            {user && (
              <PageTemplateSelector
                pageType="memorial"
                currentTemplateId={memorialTemplateId}
                onTemplateChange={setMemorialTemplateId}
                triggerVariant="outline"
              />
            )}
          </div>
        </div>
      </section>

      <div className="container mx-auto px-4 py-12">
        {/* Memorials Grid */}
        {isLoading ? (
          <div className="flex justify-center items-center py-20">
            <Loader2 className="h-12 w-12 animate-spin text-primary" />
          </div>
        ) : filteredMemorials.length > 0 ? (
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6">
            {filteredMemorials.map((memorial, index) => (
              <Link key={memorial.id} to={`/memorial/${memorial.id}`}>
                <Card 
                  className="overflow-hidden hover:shadow-elegant-lg transition-smooth group animate-fade-up relative"
                  style={{ animationDelay: `${index * 50}ms` }}
                >
                  {user && user.id === memorial.user_id && (
                    <TooltipProvider>
                      <Tooltip>
                        <TooltipTrigger asChild>
                          <button
                            onClick={(e) => toggleVisibility(e, memorial)}
                            className="absolute top-3 right-3 z-10 p-2 rounded-full bg-background/80 backdrop-blur-sm shadow-md hover:bg-background transition-smooth"
                          >
                            {memorial.is_public ? (
                              <Eye className="h-4 w-4 text-primary" />
                            ) : (
                              <EyeOff className="h-4 w-4 text-muted-foreground" />
                            )}
                          </button>
                        </TooltipTrigger>
                        <TooltipContent>
                          {memorial.is_public ? "Public — visible on homepage" : "Private — hidden from public"}
                        </TooltipContent>
                      </Tooltip>
                    </TooltipProvider>
                  )}
                  <div className="aspect-square overflow-hidden bg-muted">
                    <img
                      src={memorial.preview_image_url || portraitPlaceholder}
                      alt={memorial.name}
                      className="w-full h-full object-cover group-hover:scale-105 transition-smooth"
                    />
                  </div>
                  <CardContent className="p-4 sm:p-6">
                    <h3 className="font-serif text-lg sm:text-xl font-semibold mb-1">
                      {memorial.name}
                    </h3>
                    <p className="text-muted-foreground text-sm mb-2">
                      {formatYears(memorial.date_of_birth, memorial.date_of_death)}
                    </p>
                    {memorial.location && (
                      <p className="text-muted-foreground text-sm mb-2">
                        📍 {memorial.location}
                      </p>
                    )}
                  </CardContent>
                </Card>
              </Link>
            ))}
          </div>
        ) : (
          <Card className="text-center py-16 max-w-2xl mx-auto">
            <CardContent>
              <div className="w-20 h-20 mx-auto mb-6 rounded-full bg-muted flex items-center justify-center">
                <Search className="h-10 w-10 text-muted-foreground" />
              </div>
              <h3 className="font-serif text-2xl font-semibold mb-3">
                No Results Found
              </h3>
              <p className="text-muted-foreground mb-6">
                We couldn't find any memorials matching "{searchQuery}". Try a different search term or create a new memorial.
              </p>
              <Button onClick={() => setSearchQuery("")} variant="outline">
                Clear Search
              </Button>
            </CardContent>
          </Card>
        )}

        {/* Create Memorial Modal */}
        <CreateMemorialModal
          open={isCreateModalOpen}
          onOpenChange={setIsCreateModalOpen}
          onMemorialCreated={fetchMemorials}
        />
      </div>
    </div>
  );
};

export default Memorials;
