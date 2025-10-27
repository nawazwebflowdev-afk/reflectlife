import { Link, useNavigate } from "react-router-dom";
import { Plus, Calendar, Eye, Settings, Image, LogOut, Clock, Edit, Heart, FileText, ShoppingBag, Sparkles } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import portraitPlaceholder from "@/assets/portrait-placeholder.jpg";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";
import { useEffect, useState } from "react";
import type { User } from "@supabase/supabase-js";
import { CreateTimelineModal } from "@/components/CreateTimelineModal";
import CreatorDashboard from "@/components/CreatorDashboard";
import { ProfileEditModal } from "@/components/ProfileEditModal";

interface Profile {
  id: string;
  first_name: string | null;
  last_name: string | null;
  full_name: string | null;
  avatar_url: string | null;
  bio: string | null;
  country: string | null;
  color_theme: string | null;
}

interface Stats {
  totalMemories: number;
  templatesPurchased: number;
  likesReceived: number;
}

interface CreatorProfile {
  approved: boolean;
}

const Dashboard = () => {
  const navigate = useNavigate();
  const { toast } = useToast();
  const [user, setUser] = useState<User | null>(null);
  const [profile, setProfile] = useState<Profile | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [showCreateTimeline, setShowCreateTimeline] = useState(false);
  const [isCreator, setIsCreator] = useState(false);
  const [showEditProfile, setShowEditProfile] = useState(false);
  const [stats, setStats] = useState<Stats>({
    totalMemories: 0,
    templatesPurchased: 0,
    likesReceived: 0,
  });

  useEffect(() => {
    // Check authentication and fetch profile
    supabase.auth.getSession().then(({ data: { session } }) => {
      if (!session) {
        navigate("/auth");
        return;
      }
      setUser(session.user);
      fetchProfile(session.user.id);
    });

    const { data: { subscription } } = supabase.auth.onAuthStateChange(
      (_event, session) => {
        if (!session) {
          navigate("/auth");
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
        .select("approved")
        .eq("user_id", userId)
        .maybeSingle();

      if (creatorData?.approved) {
        setIsCreator(true);
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
      // Total memories posted
      const { count: memoriesCount } = await supabase
        .from("memorial_posts")
        .select("*", { count: "exact", head: true })
        .eq("user_id", userId);

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
        templatesPurchased: 0, // Placeholder for future implementation
        likesReceived: likesReceived,
      });
    } catch (error) {
      console.error("Error fetching stats:", error);
    }
  };

  const handleSignOut = async () => {
    await supabase.auth.signOut();
    toast({
      title: "Signed out",
      description: "You've been successfully signed out.",
    });
    navigate("/");
  };

  const memorials = [
    {
      id: "m-001",
      name: "Ada Johnson",
      years: "1948 - 2024",
      image: portraitPlaceholder,
      views: 142,
      tributeCount: 24,
      lastUpdated: "2 days ago",
    },
  ];

  if (isLoading) {
    return (
      <div className="min-h-screen py-8 flex items-center justify-center">
        <p className="text-muted-foreground">Loading...</p>
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
                  {profile?.full_name || `${profile?.first_name || ""} ${profile?.last_name || ""}`.trim() || user?.email?.split('@')[0] || "User"}
                </h1>
                {profile?.country && (
                  <p className="text-muted-foreground mb-2">📍 {profile.country}</p>
                )}
                {!profile?.first_name && !profile?.last_name && (
                  <p className="text-sm text-muted-foreground bg-muted/50 inline-block px-3 py-1 rounded-full">
                    Complete your profile to personalize your experience
                  </p>
                )}
              </div>

              <Button onClick={() => setShowEditProfile(true)} className="gap-2">
                <Edit className="h-4 w-4" />
                Edit Profile
              </Button>
            </div>
          </CardContent>
        </Card>

        {/* Stats Section */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-8 animate-fade-up">
          <Card className="hover:shadow-elegant transition-smooth">
            <CardHeader className="pb-3">
              <div className="flex items-center justify-between">
                <CardDescription>Total Memories Posted</CardDescription>
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
                <CardDescription>Templates Purchased</CardDescription>
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
                <CardDescription>Likes Received</CardDescription>
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
            <CardTitle className="font-serif">Quick Links</CardTitle>
            <CardDescription>Navigate to your favorite sections</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
              <Link to="/memorials">
                <Button variant="outline" className="w-full gap-2 h-auto py-4 hover:shadow-elegant transition-smooth">
                  <FileText className="h-5 w-5" />
                  <span>My Memorial Wall</span>
                </Button>
              </Link>
              <Link to="/timeline">
                <Button variant="outline" className="w-full gap-2 h-auto py-4 hover:shadow-elegant transition-smooth">
                  <Clock className="h-5 w-5" />
                  <span>My Timeline</span>
                </Button>
              </Link>
              <Link to="/templates">
                <Button variant="outline" className="w-full gap-2 h-auto py-4 hover:shadow-elegant transition-smooth">
                  <Image className="h-5 w-5" />
                  <span>My Templates</span>
                </Button>
              </Link>
              <Link to="/become-creator">
                <Button variant="outline" className="w-full gap-2 h-auto py-4 hover:shadow-elegant transition-smooth">
                  <Sparkles className="h-5 w-5" />
                  <span>Become a Creator</span>
                </Button>
              </Link>
            </div>
          </CardContent>
        </Card>

        {/* Main Content Tabs */}
        {isCreator ? (
          <Tabs defaultValue="memorials" className="space-y-6">
            <TabsList>
              <TabsTrigger value="memorials">My Memorials</TabsTrigger>
              <TabsTrigger value="templates">Creator Dashboard</TabsTrigger>
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
                            src={memorial.image}
                            alt={memorial.name}
                            className="w-full h-full object-cover rounded-lg"
                          />
                        </div>

                        {/* Info */}
                        <div className="flex-grow">
                          <h3 className="font-serif text-2xl font-semibold mb-1">
                            {memorial.name}
                          </h3>
                          <p className="text-muted-foreground mb-3">{memorial.years}</p>
                          
                          <div className="flex flex-wrap gap-4 text-sm text-muted-foreground mb-4">
                            <div className="flex items-center gap-1">
                              <Eye className="h-4 w-4" />
                              <span>{memorial.views} views</span>
                            </div>
                            <div className="flex items-center gap-1">
                              <Image className="h-4 w-4" />
                              <span>{memorial.tributeCount} tributes</span>
                            </div>
                            <div className="flex items-center gap-1">
                              <Calendar className="h-4 w-4" />
                              <span>Updated {memorial.lastUpdated}</span>
                            </div>
                          </div>

                          <div className="flex flex-wrap gap-3">
                            <Link to={`/memorial/${memorial.id}`}>
                              <Button variant="default" size="sm">
                                View Memorial
                              </Button>
                            </Link>
                            <Link to={`/memorial/${memorial.id}/edit`}>
                              <Button variant="outline" size="sm" className="gap-2">
                                <Settings className="h-4 w-4" />
                                Edit
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
                        No Memorials Yet
                      </h3>
                      <p className="text-muted-foreground mb-6">
                        Create your first memorial to start preserving precious memories and celebrating the lives of your loved ones.
                      </p>
                      <Link to="/memorial/new">
                        <Button size="lg" className="gap-2">
                          <Plus className="h-5 w-5" />
                          Create Your First Memorial
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
                          src={memorial.image}
                          alt={memorial.name}
                          className="w-full h-full object-cover rounded-lg"
                        />
                      </div>

                      {/* Info */}
                      <div className="flex-grow">
                        <h3 className="font-serif text-2xl font-semibold mb-1">
                          {memorial.name}
                        </h3>
                        <p className="text-muted-foreground mb-3">{memorial.years}</p>
                        
                        <div className="flex flex-wrap gap-4 text-sm text-muted-foreground mb-4">
                          <div className="flex items-center gap-1">
                            <Eye className="h-4 w-4" />
                            <span>{memorial.views} views</span>
                          </div>
                          <div className="flex items-center gap-1">
                            <Image className="h-4 w-4" />
                            <span>{memorial.tributeCount} tributes</span>
                          </div>
                          <div className="flex items-center gap-1">
                            <Calendar className="h-4 w-4" />
                            <span>Updated {memorial.lastUpdated}</span>
                          </div>
                        </div>

                        <div className="flex flex-wrap gap-3">
                          <Link to={`/memorial/${memorial.id}`}>
                            <Button variant="default" size="sm">
                              View Memorial
                            </Button>
                          </Link>
                          <Link to={`/memorial/${memorial.id}/edit`}>
                            <Button variant="outline" size="sm" className="gap-2">
                              <Settings className="h-4 w-4" />
                              Edit
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
                      No Memorials Yet
                    </h3>
                    <p className="text-muted-foreground mb-6">
                      Create your first memorial to start preserving precious memories and celebrating the lives of your loved ones.
                    </p>
                    <Link to="/memorial/new">
                      <Button size="lg" className="gap-2">
                        <Plus className="h-5 w-5" />
                        Create Your First Memorial
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
