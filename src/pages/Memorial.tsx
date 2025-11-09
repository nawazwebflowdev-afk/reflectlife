import { useState, useEffect } from "react";
import { useParams, Link, useNavigate } from "react-router-dom";
import { Calendar, MapPin, Heart, MessageCircle, Image as ImageIcon, Edit, Palette, Loader2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { useTemplateTheme } from "@/hooks/useTemplateTheme";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";
import portraitPlaceholder from "@/assets/portrait-placeholder.jpg";
import timelineBg from "@/assets/timeline-bg.jpg";

const Memorial = () => {
  const { id } = useParams();
  const navigate = useNavigate();
  const { toast } = useToast();
  const templateTheme = useTemplateTheme();
  const [memorial, setMemorial] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [currentUserId, setCurrentUserId] = useState<string | null>(null);
  const [likeCount, setLikeCount] = useState(0);
  const [isLiked, setIsLiked] = useState(false);

  useEffect(() => {
    fetchMemorial();
    checkAuth();
  }, [id]);

  const checkAuth = async () => {
    const { data: { user } } = await supabase.auth.getUser();
    setCurrentUserId(user?.id || null);
  };

  const fetchMemorial = async () => {
    try {
      setLoading(true);
      const { data, error } = await supabase
        .from("memorials")
        .select(`
          *,
          profiles:user_id (
            full_name,
            first_name,
            last_name
          )
        `)
        .eq("id", id)
        .single();

      if (error) throw error;
      setMemorial(data);
    } catch (error: any) {
      console.error("Error fetching memorial:", error);
      toast({
        title: "Error",
        description: "Failed to load memorial",
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  };

  const isCreator = currentUserId && memorial?.user_id === currentUserId;

  const timeline = [
    {
      id: "t-001",
      date: "June 10, 1968",
      type: "photo",
      title: "Graduation Day",
      text: "Ada at her university graduation, ready to change the world through education.",
      mediaUrl: portraitPlaceholder,
    },
    {
      id: "t-002",
      date: "November 1, 1990",
      type: "diary",
      title: "A Note to Family",
      text: "Remember to always laugh together. Life is precious, and the moments we share with loved ones are what truly matter. Cherish each day and find joy in the simple things.",
    },
  ];

  const tributes = [
    {
      id: "tr-001",
      author: "David Adries",
      date: "2 days ago",
      text: "Mom, your love and guidance continue to inspire us every day. You taught us the meaning of kindness and compassion. We miss you deeply.",
    },
  ];

  const handleLike = () => {
    setIsLiked(!isLiked);
    setLikeCount(isLiked ? likeCount - 1 : likeCount + 1);
  };

  const backgroundImage = templateTheme.backgroundUrl || timelineBg;

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <Loader2 className="h-12 w-12 animate-spin text-primary" />
      </div>
    );
  }

  if (!memorial) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <Card className="max-w-md">
          <CardContent className="p-6 text-center">
            <h2 className="font-serif text-2xl mb-2">Memorial Not Found</h2>
            <p className="text-muted-foreground mb-4">This memorial doesn't exist or has been removed.</p>
            <Button onClick={() => navigate("/memorials")}>View All Memorials</Button>
          </CardContent>
        </Card>
      </div>
    );
  }

  const formatDate = (date: string | null) => {
    if (!date) return "Unknown";
    return new Date(date).toLocaleDateString('en-US', { year: 'numeric', month: 'long', day: 'numeric' });
  };

  return (
    <div 
      className="min-h-screen transition-smooth"
      style={{
        '--template-accent': templateTheme.accentColor,
        backgroundImage: `linear-gradient(rgba(255,255,255,0.95), rgba(255,255,255,0.95)), url(${backgroundImage})`,
        backgroundSize: 'cover',
        backgroundPosition: 'center',
        backgroundAttachment: 'fixed',
      } as React.CSSProperties}
    >
      {/* Hero Section */}
      <section 
        className="relative h-[400px] flex items-end transition-smooth"
        style={{
          backgroundImage: `linear-gradient(rgba(0,0,0,0.5), rgba(0,0,0,0.5)), url(${backgroundImage})`,
          backgroundSize: "cover",
          backgroundPosition: "center",
        }}
      >
        <div className="absolute inset-0 bg-gradient-to-t from-background via-background/60 to-transparent" />
        
        {templateTheme.templateName && (
          <div className="absolute top-6 left-6 text-white/90 text-sm font-medium bg-black/30 backdrop-blur-sm px-3 py-2 rounded-lg border border-white/20">
            Theme: {templateTheme.templateName}
          </div>
        )}
        
        <div className="absolute top-6 right-6">
          <Link to="/templates">
            <Button variant="outline" className="gap-2 bg-background/80 backdrop-blur-sm">
              <Palette className="h-4 w-4" />
              Change Template
            </Button>
          </Link>
        </div>
        
        <div className="relative container mx-auto px-4 pb-8">
          <div className="flex flex-col lg:flex-row items-center lg:items-end gap-4 lg:gap-6">
            {/* Portrait */}
            <div 
              className="w-32 h-32 sm:w-40 sm:h-40 rounded-2xl overflow-hidden border-4 border-background shadow-elegant-lg flex-shrink-0 transition-smooth"
              style={{
                boxShadow: `0 0 30px ${templateTheme.accentColor}40`,
              }}
            >
              <img
                src={memorial.preview_image_url || portraitPlaceholder}
                alt={memorial.name}
                className="w-full h-full object-cover"
              />
            </div>

            {/* Info */}
            <div className="flex-grow pb-2 text-center lg:text-left">
              <h1 className="font-serif text-3xl sm:text-4xl lg:text-5xl font-bold mb-2 text-foreground">
                {memorial.name}
              </h1>
              <p className="text-base sm:text-lg text-muted-foreground mb-3">
                {formatDate(memorial.date_of_birth)} – {formatDate(memorial.date_of_death)}
              </p>
              {memorial.location && (
                <div className="flex items-center gap-2 text-muted-foreground justify-center lg:justify-start">
                  <MapPin className="h-4 w-4" />
                  <span>{memorial.location}</span>
                </div>
              )}
              {memorial.profiles && (
                <p className="text-sm text-muted-foreground/70 mt-2">
                  Created by {memorial.profiles.full_name || 
                    `${memorial.profiles.first_name || ''} ${memorial.profiles.last_name || ''}`.trim() || 
                    'Anonymous'}
                </p>
              )}
            </div>

            {/* Actions */}
            <div className="flex gap-3 pb-2">
              <Button
                variant={isLiked ? "default" : "outline"}
                size="sm"
                onClick={handleLike}
                className="gap-2"
              >
                <Heart className={`h-4 w-4 ${isLiked ? "fill-current" : ""}`} />
                {likeCount}
              </Button>
              {isCreator && (
                <Link to={`/memorial/${id}/edit`}>
                  <Button variant="outline" size="sm" className="gap-2">
                    <Edit className="h-4 w-4" />
                    Edit
                  </Button>
                </Link>
              )}
            </div>
          </div>
        </div>
      </section>

      {/* Content */}
      <div className="container mx-auto px-4 py-12">
        {/* Bio */}
        {memorial.bio && (
          <Card className="mb-8 shadow-elegant">
            <CardContent className="p-6">
              <p className="text-lg leading-relaxed text-muted-foreground">
                {memorial.bio}
              </p>
            </CardContent>
          </Card>
        )}

        {/* Tabs */}
        <Tabs defaultValue="timeline" className="w-full">
          <TabsList className="mb-6">
            <TabsTrigger value="timeline">Timeline</TabsTrigger>
            <TabsTrigger value="tributes">
              Tributes ({tributes.length})
            </TabsTrigger>
            <TabsTrigger value="gallery">Gallery</TabsTrigger>
          </TabsList>

          {/* Timeline */}
          <TabsContent value="timeline" className="space-y-6">
            {timeline.length > 0 ? (
              timeline.map((entry) => (
                <Card 
                  key={entry.id} 
                  className="shadow-elegant hover:shadow-elegant-lg transition-smooth border-l-4"
                  style={{ 
                    borderLeftColor: templateTheme.accentColor,
                  }}
                >
                  <CardContent className="p-6">
                    <div className="flex items-start gap-4">
                      <div 
                        className="w-12 h-12 rounded-full flex items-center justify-center flex-shrink-0"
                        style={{ backgroundColor: `${templateTheme.accentColor}20` }}
                      >
                        {entry.type === "photo" ? (
                          <ImageIcon className="h-5 w-5" style={{ color: templateTheme.accentColor }} />
                        ) : (
                          <MessageCircle className="h-5 w-5" style={{ color: templateTheme.accentColor }} />
                        )}
                      </div>

                      <div className="flex-grow">
                        <div className="flex items-center gap-2 mb-2">
                          <Calendar className="h-4 w-4 text-muted-foreground" />
                          <span className="text-sm text-muted-foreground">{entry.date}</span>
                        </div>
                        <h3 className="font-serif text-xl font-semibold mb-2">
                          {entry.title}
                        </h3>
                        <p className="text-muted-foreground mb-4">{entry.text}</p>
                        
                        {entry.mediaUrl && (
                          <div className="rounded-lg overflow-hidden max-w-md">
                            <img
                              src={entry.mediaUrl}
                              alt={entry.title}
                              className="w-full h-auto"
                            />
                          </div>
                        )}
                      </div>
                    </div>
                  </CardContent>
                </Card>
              ))
            ) : (
              <Card className="text-center py-12">
                <CardContent>
                  <p className="text-muted-foreground">
                    No memories yet. Start by adding a story, photo, or video — small details keep memories alive.
                  </p>
                </CardContent>
              </Card>
            )}
          </TabsContent>

          {/* Tributes */}
          <TabsContent value="tributes" className="space-y-6">
            {tributes.map((tribute) => (
              <Card key={tribute.id} className="shadow-elegant">
                <CardContent className="p-6">
                  <div className="flex items-start gap-4">
                    <div className="w-10 h-10 rounded-full bg-accent/20 flex items-center justify-center flex-shrink-0">
                      <span className="text-accent font-semibold">
                        {tribute.author.charAt(0)}
                      </span>
                    </div>
                    <div className="flex-grow">
                      <div className="flex items-center gap-2 mb-1">
                        <span className="font-semibold">{tribute.author}</span>
                        <span className="text-sm text-muted-foreground">•</span>
                        <span className="text-sm text-muted-foreground">{tribute.date}</span>
                      </div>
                      <p className="text-muted-foreground">{tribute.text}</p>
                    </div>
                  </div>
                </CardContent>
              </Card>
            ))}

            <Card className="border-2 border-dashed">
              <CardContent className="p-6 text-center">
                <Button className="gap-2">
                  <MessageCircle className="h-4 w-4" />
                  Share a Memory
                </Button>
              </CardContent>
            </Card>
          </TabsContent>

          {/* Gallery */}
          <TabsContent value="gallery">
            <Card className="text-center py-12">
              <CardContent>
                <div className="w-16 h-16 mx-auto mb-4 rounded-full bg-muted flex items-center justify-center">
                  <ImageIcon className="h-8 w-8 text-muted-foreground" />
                </div>
                <p className="text-muted-foreground mb-4">No photos yet</p>
                <Button variant="outline">Add Photos</Button>
              </CardContent>
            </Card>
          </TabsContent>
        </Tabs>
      </div>
    </div>
  );
};

export default Memorial;
