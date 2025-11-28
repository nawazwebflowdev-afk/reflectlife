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
import EditMemorialModal from "@/components/EditMemorialModal";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { LazyImage } from "@/components/LazyImage";
import { MemorialSkeleton } from "@/components/MemorialSkeleton";
import { useProfilePreload } from "@/hooks/useProfilePreload";
import { useUserData } from "@/hooks/useUserData";

const Dashboard = () => {
  const navigate = useNavigate();
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const [user, setUser] = useState<User | null>(null);
  const [showCreateTimeline, setShowCreateTimeline] = useState(false);
  const [showEditProfile, setShowEditProfile] = useState(false);
  const [editingMemorial, setEditingMemorial] = useState<any>(null);

  // Preload user data immediately
  useProfilePreload(user?.id);
  
  // Fetch all user data with single hook
  const { data: userData, isLoading } = useUserData(user?.id);

  useEffect(() => {
    // Check authentication
    supabase.auth.getSession().then(({ data: { session } }) => {
      if (!session) {
        navigate("/login");
        return;
      }
      setUser(session.user);
    });

    const { data: { subscription } } = supabase.auth.onAuthStateChange(
      (_event, session) => {
        if (!session) {
          navigate("/login");
        } else {
          setUser(session.user);
        }
      }
    );

    return () => subscription.unsubscribe();
  }, [navigate]);

  const handleSignOut = async () => {
    await supabase.auth.signOut();
    toast({
      title: "Signed out",
      description: "You've been successfully signed out.",
    });
    navigate("/");
  };

  // Fetch memorials with React Query
  const { data: memorials = [], isLoading: memorialsLoading, error: memorialsError, refetch: refetchMemorials } = useQuery({
    queryKey: ['memorials', user?.id],
    queryFn: async () => {
      if (!user?.id) return [];
      const { data, error } = await supabase
        .from("memorials")
        .select("id, name, date_of_birth, date_of_death, location, preview_image_url")
        .eq("user_id", user.id)
        .order("created_at", { ascending: false })
        .limit(20);

      if (error) {
        console.error('Error fetching memorials:', error);
        throw error;
      }
      return data || [];
    },
    enabled: !!user?.id,
    staleTime: 1000 * 60 * 5,
    gcTime: 1000 * 60 * 30,
  });

  const formatYears = (dob: string | null, dod: string | null) => {
    if (!dob || !dod) return "Unknown";
    const birthYear = new Date(dob).getFullYear();
    const deathYear = new Date(dod).getFullYear();
    return `${birthYear} - ${deathYear}`;
  };

  if (isLoading) {
    return (
      <div className="min-h-screen py-8">
        <div className="container mx-auto px-4">
          <div className="mb-8">
            <div className="h-24 w-24 bg-muted rounded-full animate-pulse mx-auto md:mx-0 mb-4"></div>
            <div className="h-8 w-48 bg-muted rounded animate-pulse mx-auto md:mx-0 mb-4"></div>
          </div>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-8">
            {[1, 2, 3].map((i) => (
              <div key={i} className="h-32 bg-muted rounded-lg animate-pulse"></div>
            ))}
          </div>
          <div className="grid grid-cols-1 gap-6">
            {[1, 2].map((i) => (
              <MemorialSkeleton key={i} />
            ))}
          </div>
        </div>
      </div>
    );
  }

  const getInitials = () => {
    const profile = userData?.profile;
    if (profile?.first_name && profile?.last_name) {
      return `${profile.first_name[0]}${profile.last_name[0]}`.toUpperCase();
    }
    return profile?.full_name?.[0]?.toUpperCase() || user?.email?.[0]?.toUpperCase() || "U";
  };

  const profile = userData?.profile;
  const stats = userData?.stats || { totalMemories: 0, templatesPurchased: 0, likesReceived: 0 };
  const isCreator = userData?.isCreator || false;
  const creatorProfile = userData?.creatorProfile;

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

        {/* Creator Application Status Banner */}
        {creatorProfile && !creatorProfile.approved && (
          <Card className="mb-8 border-primary/50 bg-primary/5 animate-fade-in">
            <CardContent className="p-4">
              <div className="flex items-center gap-3">
                <Clock className="h-5 w-5 text-primary animate-pulse" />
                <div>
                  <p className="font-semibold">Creator Application Pending Review</p>
                  <p className="text-sm text-muted-foreground">
                    Your application is under review. You'll gain access to template uploads once approved.
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
            {memorialsLoading ? (
              <>
                <MemorialSkeleton />
                <MemorialSkeleton />
                <MemorialSkeleton />
              </>
            ) : memorialsError ? (
              <Card className="col-span-full">
                <CardContent className="p-6 text-center">
                  <p className="text-muted-foreground mb-4">Failed to load memorials</p>
                  <Button onClick={() => refetchMemorials()}>Retry</Button>
                </CardContent>
              </Card>
            ) : memorials.length > 0 ? (
              memorials.map((memorial) => (
                <Card key={memorial.id} className="hover:shadow-elegant transition-smooth">
                  <CardContent className="p-6">
                    <div className="flex flex-col md:flex-row gap-6">
                      {/* Image */}
                      <div className="w-24 h-24 flex-shrink-0">
                        <LazyImage
                          src={memorial.preview_image_url || portraitPlaceholder}
                          alt={memorial.name}
                          fallback={portraitPlaceholder}
                          className="w-full h-full object-cover rounded-lg"
                          containerClassName="w-full h-full"
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
                          <LazyImage
                            src={memorial.preview_image_url || portraitPlaceholder}
                            alt={memorial.name}
                            fallback={portraitPlaceholder}
                            className="w-full h-full object-cover rounded-lg"
                            containerClassName="w-full h-full"
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
                              View Memorial
                            </Button>
                          </Link>
                          <Button 
                            variant="outline" 
                            size="sm" 
                            className="gap-2"
                            onClick={() => setEditingMemorial(memorial)}
                          >
                            <Settings className="h-4 w-4" />
                            Edit
                          </Button>
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
            onProfileUpdate={() => {
              // Invalidate user data cache to refetch
              queryClient.invalidateQueries({ queryKey: ['user-data', user.id] });
            }}
          />
          <EditMemorialModal
            open={!!editingMemorial}
            onOpenChange={(open) => !open && setEditingMemorial(null)}
            memorial={editingMemorial}
            onMemorialUpdated={() => {
              refetchMemorials();
              setEditingMemorial(null);
            }}
          />
        </>
      )}
    </div>
  );
};

export default Dashboard;
