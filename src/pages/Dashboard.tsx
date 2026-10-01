import { Link, useNavigate } from "react-router-dom";
import { Plus, Calendar, Eye, Settings, Image, LogOut, Clock, Edit, Heart, FileText, ShoppingBag, Sparkles } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import portraitPlaceholder from "@/assets/portrait-placeholder.webp";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";
import { useEffect, useState } from "react";
import type { User } from "@supabase/supabase-js";
import { CreateTimelineModal } from "@/components/CreateTimelineModal";
import CreatorDashboard from "@/components/CreatorDashboard";
import { ProfileEditModal } from "@/components/ProfileEditModal";

import { tr } from "@/i18n/tr";
import { optimizedImageUrl } from "@/lib/imageUrl";
interface Profile {
  id: string;
  first_name: string | null;
  last_name: string | null;
  full_name: string | null;
  avatar_url: string | null;
  bio: string | null;
  country: string | null;
  color_theme: string | null;
  template_id: string | null;
}

interface Stats {
  totalMemories: number;
  templatesPurchased: number;
  likesReceived: number;
}

interface CreatorProfile {
  approved: boolean;
  id: string;
}

const Dashboard = () => {
  const navigate = useNavigate();
  const { toast } = useToast();
  const [user, setUser] = useState<User | null>(null);
  const [profile, setProfile] = useState<Profile | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [showCreateTimeline, setShowCreateTimeline] = useState(false);
  const [isCreator, setIsCreator] = useState(false);
  const [creatorProfile, setCreatorProfile] = useState<CreatorProfile | null>(null);
  const [showEditProfile, setShowEditProfile] = useState(false);
  const [activeTemplateName, setActiveTemplateName] = useState<string | null>(null);
  const [stats, setStats] = useState<Stats>({
    totalMemories: 0,
    templatesPurchased: 0,
    likesReceived: 0,
  });

  useEffect(() => {
    const initializeDashboard = async () => {
      await supabase.auth.refreshSession();

      const {
        data: { user },
      } = await supabase.auth.getUser();

      if (!user) {
        navigate("/login");
        return;
      }

      setUser(user);
      fetchProfile(user.id);
    };

    void initializeDashboard();

    const { data: { subscription } } = supabase.auth.onAuthStateChange(
      async (_event, session) => {
        if (!session) {
          navigate("/login");
        } else {
          setUser(session.user);
          fetchProfile(session.user.id);
        }
      }
    );

    return () => subscription.unsubscribe();
  }, [navigate]);

  const fetchProfile = async (userId: string) => {
    try {
      const { data, error } = await supabase
        .from("profiles")
        .select("*")
        .eq("id", userId)
        .maybeSingle();

      if (error) throw error;
      setProfile(data);

      // Check if user is an approved creator
      const { data: creatorData } = await supabase
        .from("template_creators")
        .select("*")
        .eq("user_id", userId)
        .maybeSingle();

      if (creatorData) {
        setCreatorProfile(creatorData);
        if (creatorData.approved) {
          setIsCreator(true);
        }
      }

      // Fetch active template name
      if (data?.template_id) {
        const { data: templateData } = await supabase
          .from("site_templates")
          .select("name")
          .eq("id", data.template_id)
          .single();
        if (templateData) {
          setActiveTemplateName(templateData.name);
        }
      }

      // Fetch stats
      await fetchStats(userId);
    } catch (error) {
      console.error("Error fetching profile:", error);
    } finally {
      setIsLoading(false);
    }
  };

  const fetchStats = async (userId: string) => {
    try {
      // Total memorials created
      const { count: memoriesCount } = await supabase
        .from("memorials")
        .select("*", { count: "exact", head: true })
        .eq("user_id", userId);

      // Templates purchased (only successful purchases)
      const { count: templatesCount } = await supabase
        .from("template_purchases")
        .select("*", { count: "exact", head: true })
        .eq("buyer_id", userId)
        .eq("payment_status", "success");

      // Likes received on user's posts
      const { data: userPosts } = await supabase
        .from("memorial_posts")
        .select("id")
        .eq("user_id", userId);

      let likesReceived = 0;
      if (userPosts && userPosts.length > 0) {
        const postIds = userPosts.map(p => p.id);
        const { count: likesCount } = await supabase
          .from("memorial_likes")
          .select("*", { count: "exact", head: true })
          .in("post_id", postIds);
        likesReceived = likesCount || 0;
      }

      setStats({
        totalMemories: memoriesCount || 0,
        templatesPurchased: templatesCount || 0,
        likesReceived: likesReceived,
      });
    } catch (error) {
      console.error("Error fetching stats:", error);
    }
  };

  const handleSignOut = async () => {
    await supabase.auth.signOut();
    toast({
      title: tr("a.1b8337c8ac"),
      description: tr("a.038669fd68"),
    });
    navigate("/");
  };

  const [memorials, setMemorials] = useState<any[]>([]);
  const [purchasedTemplates, setPurchasedTemplates] = useState<any[]>([]);

  useEffect(() => {
    if (user) {
      fetchUserMemorials(user.id);
      fetchPurchasedTemplates(user.id);
    }
  }, [user]);

  const fetchPurchasedTemplates = async (userId: string) => {
    try {
      // Fetch paid purchased templates
      const { data: purchases, error: purchaseError } = await supabase
        .from("template_purchases")
        .select("template_id, created_at")
        .eq("buyer_id", userId)
        .eq("payment_status", "success")
        .order("created_at", { ascending: false });

      if (purchaseError) throw purchaseError;

      const purchasedIds = [...new Set((purchases || []).map(p => p.template_id))];

      if (purchasedIds.length === 0) {
        setPurchasedTemplates([]);
        return;
      }

      // Fetch template details
      const { data: templateDetails, error: templateError } = await supabase
        .from("site_templates")
        .select("id, name, country, preview_url, price, is_free")
        .in("id", purchasedIds);

      if (templateError) throw templateError;
      setPurchasedTemplates(templateDetails || []);
    } catch (error) {
      console.error("Error fetching purchased templates:", error);
    }
  };

  const fetchUserMemorials = async (userId: string) => {
    try {
      const { data, error } = await supabase
        .from("memorials")
        .select("*")
        .eq("user_id", userId)
        .order("created_at", { ascending: false });

      if (error) throw error;
      setMemorials(data || []);
    } catch (error) {
      console.error("Error fetching memorials:", error);
    }
  };

  const formatYears = (dob: string | null, dod: string | null) => {
    if (!dob || !dod) return "Unknown";
    const birthYear = new Date(dob).getFullYear();
    const deathYear = new Date(dod).getFullYear();
    return `${birthYear} - ${deathYear}`;
  };

  if (isLoading) {
    return (
      <div className="min-h-screen py-8 flex items-center justify-center">
        <p className="text-muted-foreground">{tr("a.b04ba49f84")}</p>
      </div>
    );
  }

  const getInitials = () => {
    if (profile?.first_name && profile?.last_name) {
      return `${profile.first_name[0]}${profile.last_name[0]}`.toUpperCase();
    }
    return profile?.full_name?.[0]?.toUpperCase() || user?.email?.[0]?.toUpperCase() || "U";
  };

  return (
    <div className="min-h-screen py-8">
      <div className="container mx-auto px-4">
        {/* Profile Section */}
        <Card className="mb-8 animate-fade-in">
          <CardContent className="p-6">
            <div className="flex flex-col md:flex-row items-center md:items-start gap-6">
              <Avatar className="h-24 w-24 ring-4 ring-primary/10">
                <AvatarImage src={profile?.avatar_url || ""} />
                <AvatarFallback className="text-2xl bg-gradient-to-br from-primary to-primary/60 text-primary-foreground">
                  {getInitials()}
                </AvatarFallback>
              </Avatar>
              
              <div className="flex-grow text-center md:text-left">
                <h1 className="font-serif text-3xl font-bold mb-2">
                  {profile?.full_name || `${profile?.first_name || ""} ${profile?.last_name || ""}`.trim() || user?.email?.split('@')[0] || tr("a.9f8a2389a2")}
                </h1>
                {profile?.country && (
                  <p className="text-muted-foreground mb-2">📍 {profile.country}</p>
                )}
                {activeTemplateName && (
                  <p 
                    className="text-sm text-muted-foreground mb-2 cursor-pointer hover:text-primary transition-colors"
                    onClick={() => navigate("/templates?filter=owned")}
                  >
                    {tr("a.3ec023dad9")} <span className="font-medium text-foreground underline">{activeTemplateName}</span>
                  </p>
                )}
                {!profile?.first_name && !profile?.last_name && (
                  <p className="text-sm text-muted-foreground bg-muted/50 inline-block px-3 py-1 rounded-full">
                    {tr("a.50ef855f3b")}
                  </p>
                )}
              </div>

              <Button onClick={() => setShowEditProfile(true)} className="gap-2">
                <Edit className="h-4 w-4" />
                {tr("a.cd280a41f7")}
              </Button>
            </div>
          </CardContent>
        </Card>

        {/* Creator Application Status Banner */}
        {creatorProfile && !creatorProfile.approved && (
          <Card className="mb-8 border-primary/50 bg-primary/5 animate-fade-in">
            <CardContent className="p-4">
              <div className="flex items-center gap-3">
                <Clock className="h-5 w-5 text-primary animate-pulse" />
                <div>
                  <p className="font-semibold">{tr("a.7058445e7d")}</p>
                  <p className="text-sm text-muted-foreground">
                    {tr("a.6b0b74d80c")}
                  </p>
                </div>
              </div>
            </CardContent>
          </Card>
        )}

        {/* Stats Section */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-8 animate-fade-up">
          <Card className="hover:shadow-elegant transition-smooth">
            <CardHeader className="pb-3">
              <div className="flex items-center justify-between">
                <CardDescription>{tr("a.b5480b974c")}</CardDescription>
                <Heart className="h-5 w-5 text-primary" />
              </div>
              <CardTitle className="text-4xl font-serif bg-gradient-to-r from-primary to-primary/60 bg-clip-text text-transparent">
                {stats.totalMemories}
              </CardTitle>
            </CardHeader>
          </Card>

          <Card className="hover:shadow-elegant transition-smooth">
            <CardHeader className="pb-3">
              <div className="flex items-center justify-between">
                <CardDescription>{tr("a.154b4ffb7b")}</CardDescription>
                <ShoppingBag className="h-5 w-5 text-primary" />
              </div>
              <CardTitle className="text-4xl font-serif bg-gradient-to-r from-primary to-primary/60 bg-clip-text text-transparent">
                {stats.templatesPurchased}
              </CardTitle>
            </CardHeader>
          </Card>

          <Card className="hover:shadow-elegant transition-smooth">
            <CardHeader className="pb-3">
              <div className="flex items-center justify-between">
                <CardDescription>{tr("a.76af270609")}</CardDescription>
                <Sparkles className="h-5 w-5 text-primary" />
              </div>
              <CardTitle className="text-4xl font-serif bg-gradient-to-r from-primary to-primary/60 bg-clip-text text-transparent">
                {stats.likesReceived}
              </CardTitle>
            </CardHeader>
          </Card>
        </div>

        {/* Quick Links Section */}
        <Card className="mb-8 animate-fade-up">
          <CardHeader>
            <CardTitle className="font-serif">{tr("a.917bcf00a5")}</CardTitle>
            <CardDescription>{tr("a.40663b99bb")}</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
              <Link to="/memorials">
                <Button variant="outline" className="w-full gap-2 h-auto py-4 hover:shadow-elegant transition-smooth">
                  <FileText className="h-5 w-5" />
                  <span>{tr("a.16ccd9ab86")}</span>
                </Button>
              </Link>
              <Link to="/timeline">
                <Button variant="outline" className="w-full gap-2 h-auto py-4 hover:shadow-elegant transition-smooth">
                  <Clock className="h-5 w-5" />
                  <span>{tr("a.ab5f120e0a")}</span>
                </Button>
              </Link>
              <Link to="/templates?filter=owned">
                <Button variant="outline" className="w-full gap-2 h-auto py-4 hover:shadow-elegant transition-smooth">
                  <Image className="h-5 w-5" />
                  <span>{tr("a.17a8348930")}</span>
                </Button>
              </Link>
              <Link to="/become-creator">
                <Button variant="outline" className="w-full gap-2 h-auto py-4 hover:shadow-elegant transition-smooth">
                  <Sparkles className="h-5 w-5" />
                  <span>{tr("a.3183be0fbd")}</span>
                </Button>
              </Link>
            </div>
          </CardContent>
        </Card>

        {/* Purchased Templates Section */}
        {purchasedTemplates.length > 0 && (
          <Card className="mb-8 animate-fade-up">
            <CardHeader>
              <div className="flex items-center justify-between">
                <div>
                  <CardTitle className="font-serif">{tr("a.cde367f8bc")}</CardTitle>
                  <CardDescription>{tr("a.b5fbeda872")}</CardDescription>
                </div>
                <Link to="/templates?filter=owned">
                  <Button variant="outline" size="sm">{tr("a.efd8355920")}</Button>
                </Link>
              </div>
            </CardHeader>
            <CardContent>
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
                {purchasedTemplates.map((template) => {
                  const isActive = profile?.template_id === template.id;
                  return (
                    <Card
                      key={template.id}
                      className={`overflow-hidden cursor-pointer hover:shadow-elegant transition-smooth hover:-translate-y-1 ${isActive ? 'ring-2 ring-primary' : ''}`}
                      onClick={() => navigate("/templates?filter=owned")}
                    >
                      <div className="aspect-[3/4] overflow-hidden">
                        <img
                          src={optimizedImageUrl(template.preview_url) || "https://images.unsplash.com/photo-1485963631004-f2f00b1d6606?w=400"}
                          alt={template.name}
                          width={400}
                          height={533}
                          loading="lazy"
                          decoding="async"
                          className="w-full h-full object-cover"
                        />
                      </div>
                      <CardContent className="p-3">
                        <h4 className="font-serif font-semibold text-sm truncate">{template.name}</h4>
                        <p className="text-xs text-muted-foreground">{template.country}</p>
                        {isActive && (
                          <Badge className="mt-1 text-xs">{tr("a.a733b809d2")}</Badge>
                        )}
                      </CardContent>
                    </Card>
                  );
                })}
              </div>
            </CardContent>
          </Card>
        )}

        {/* Main Content Tabs */}
        {isCreator ? (
          <Tabs defaultValue="memorials" className="space-y-6">
            <TabsList>
              <TabsTrigger value="memorials">{tr("a.816ce5a094")}</TabsTrigger>
              <TabsTrigger value="templates">{tr("a.7df02aa31f")}</TabsTrigger>
            </TabsList>

            <TabsContent value="memorials" className="space-y-4">
              {memorials.length > 0 ? (
                memorials.map((memorial) => (
                  <Card key={memorial.id} className="hover:shadow-elegant transition-smooth">
                    <CardContent className="p-6">
                      <div className="flex flex-col md:flex-row gap-6">
                        {/* Image */}
                        <div className="w-24 h-24 flex-shrink-0">
                          <img
                            src={memorial.preview_image_url || portraitPlaceholder}
                            alt={memorial.name}
                            width={96}
                            height={96}
                            loading="lazy"
                            decoding="async"
                            className="w-full h-full object-cover rounded-lg"
                          />
                        </div>

                        {/* Info */}
                        <div className="flex-grow">
                          <h3 className="font-serif text-2xl font-semibold mb-1">
                            {memorial.name}
                          </h3>
                          <p className="text-muted-foreground mb-3">
                            {formatYears(memorial.date_of_birth, memorial.date_of_death)}
                          </p>
                          {memorial.location && (
                            <p className="text-sm text-muted-foreground mb-3">
                              📍 {memorial.location}
                            </p>
                          )}

                          <div className="flex flex-wrap gap-3">
                            <Link to={`/memorial/${memorial.id}`}>
                              <Button variant="default" size="sm">
                                {tr("a.034aaa38bf")}
                              </Button>
                            </Link>
                            <Link to={`/memorial/${memorial.id}/edit`}>
                              <Button variant="outline" size="sm" className="gap-2">
                                <Settings className="h-4 w-4" />
                                {tr("a.5301648dcf")}
                              </Button>
                            </Link>
                          </div>
                        </div>
                      </div>
                    </CardContent>
                  </Card>
                ))
              ) : (
                <Card className="text-center py-16">
                  <CardContent>
                    <div className="max-w-md mx-auto">
                      <div className="w-20 h-20 mx-auto mb-6 rounded-full bg-primary/10 flex items-center justify-center">
                        <Plus className="h-10 w-10 text-primary" />
                      </div>
                      <h3 className="font-serif text-2xl font-semibold mb-3">
                        {tr("a.efa16e6d64")}
                      </h3>
                      <p className="text-muted-foreground mb-6">
                        {tr("a.de26151070")}
                      </p>
                      <Link to="/memorial/new">
                        <Button size="lg" className="gap-2">
                          <Plus className="h-5 w-5" />
                          {tr("a.6a934fd301")}
                        </Button>
                      </Link>
                    </div>
                  </CardContent>
                </Card>
              )}
            </TabsContent>

            <TabsContent value="templates">
              <CreatorDashboard />
            </TabsContent>
          </Tabs>
        ) : (
          <div className="space-y-4">
            {memorials.length > 0 ? (
              memorials.map((memorial) => (
                <Card key={memorial.id} className="hover:shadow-elegant transition-smooth">
                  <CardContent className="p-6">
                    <div className="flex flex-col md:flex-row gap-6">
                        {/* Image */}
                        <div className="w-24 h-24 flex-shrink-0">
                          <img
                            src={memorial.preview_image_url || portraitPlaceholder}
                            alt={memorial.name}
                            width={96}
                            height={96}
                            loading="lazy"
                            decoding="async"
                            className="w-full h-full object-cover rounded-lg"
                          />
                        </div>

                        {/* Info */}
                        <div className="flex-grow">
                          <h3 className="font-serif text-2xl font-semibold mb-1">
                            {memorial.name}
                          </h3>
                          <p className="text-muted-foreground mb-3">
                            {formatYears(memorial.date_of_birth, memorial.date_of_death)}
                          </p>
                          {memorial.location && (
                            <p className="text-sm text-muted-foreground mb-3">
                              📍 {memorial.location}
                            </p>
                          )}

                        <div className="flex flex-wrap gap-3">
                          <Link to={`/memorial/${memorial.id}`}>
                            <Button variant="default" size="sm">
                              {tr("a.034aaa38bf")}
                            </Button>
                          </Link>
                          <Link to={`/memorial/${memorial.id}/edit`}>
                            <Button variant="outline" size="sm" className="gap-2">
                              <Settings className="h-4 w-4" />
                              {tr("a.5301648dcf")}
                            </Button>
                          </Link>
                        </div>
                      </div>
                    </div>
                  </CardContent>
                </Card>
              ))
            ) : (
              <Card className="text-center py-16">
                <CardContent>
                  <div className="max-w-md mx-auto">
                    <div className="w-20 h-20 mx-auto mb-6 rounded-full bg-primary/10 flex items-center justify-center">
                      <Plus className="h-10 w-10 text-primary" />
                    </div>
                    <h3 className="font-serif text-2xl font-semibold mb-3">
                      {tr("a.efa16e6d64")}
                    </h3>
                    <p className="text-muted-foreground mb-6">
                      {tr("a.de26151070")}
                    </p>
                    <Link to="/memorial/new">
                      <Button size="lg" className="gap-2">
                        <Plus className="h-5 w-5" />
                        {tr("a.6a934fd301")}
                      </Button>
                    </Link>
                  </div>
                </CardContent>
              </Card>
            )}
          </div>
        )}
      </div>

      {user && (
        <>
          <CreateTimelineModal
            open={showCreateTimeline}
            onOpenChange={setShowCreateTimeline}
            userId={user.id}
          />
          <ProfileEditModal
            open={showEditProfile}
            onOpenChange={setShowEditProfile}
            userId={user.id}
            onProfileUpdate={() => fetchProfile(user.id)}
          />
        </>
      )}
    </div>
  );
};

export default Dashboard;
