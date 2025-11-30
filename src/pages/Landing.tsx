import { useState, useEffect, useMemo } from "react";
import { Link } from "react-router-dom";
import { Heart, Share2, Clock, Shield, MessageCircle, MapPin } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { AvatarDisplay } from "@/components/EmojiAvatarSelector";
import heroBanner from "@/assets/hero-banner.png";
import portraitPlaceholder from "@/assets/portrait-placeholder.jpg";
import FeaturedTemplates from "@/components/FeaturedTemplates";
import { supabase } from "@/integrations/supabase/client";
import { formatDistanceToNow } from "date-fns";
import { useQuery } from "@tanstack/react-query";
import { LazyImage } from "@/components/LazyImage";

const Landing = () => {
  const [user, setUser] = useState<any>(null);

  useEffect(() => {
    checkUser();
  }, []);

  const checkUser = async () => {
    const { data: { user } } = await supabase.auth.getUser();
    setUser(user);
  };

  // Fetch timeline posts with React Query - optimized with JOIN
  const { data: timelinePosts = [], isLoading: loadingPosts } = useQuery({
    queryKey: ['landing-timeline-posts', user?.id],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('memorial_posts')
        .select(`
          id, 
          caption, 
          location, 
          media_url, 
          created_at, 
          likes_count, 
          comments_count,
          user_id,
          profiles!memorial_posts_user_id_fkey(username, full_name, avatar_url)
        `)
        .order('created_at', { ascending: false })
        .limit(10);

      if (error) throw error;
      return data || [];
    },
    enabled: !!user,
    staleTime: 1000 * 60 * 5,
    gcTime: 1000 * 60 * 10,
    retry: 1,
  });

  const getUserInitials = (profile: any) => {
    if (!profile) return "?";
    const name = profile.full_name || profile.username || "";
    return name.split(' ').map((n: string) => n[0]).join('').toUpperCase().slice(0, 2);
  };

  const getProfile = (post: any) => {
    // Handle both array (from join) and object formats
    return Array.isArray(post.profiles) ? post.profiles[0] : post.profiles;
  };

  const features = [
    {
      icon: Heart,
      title: "Create a Memorial",
      description: "Build a personal page with photos, stories, and videos.",
    },
    {
      icon: Share2,
      title: "Celebrate a Journey",
      description: "Share life's special moments with family and friends.",
    },
    {
      icon: Clock,
      title: "Keep Their Legacy Alive",
      description: "Honor and remember, anywhere and anytime.",
    },
  ];

  const testimonials = [
    {
      quote: "Reflectlife gave us a beautiful way to celebrate my mother's life. It's comforting to have all our memories in one place.",
      name: "Sarah M.",
      avatarIndex: 0,
    },
    {
      quote: "A truly special space where our family can come together and share stories about Dad. It means everything to us.",
      name: "Michael T.",
      avatarIndex: 5,
    },
    {
      quote: "Creating a memorial was so easy, and it's become a place of peace for us all. Thank you for this gift.",
      name: "Linda K.",
      avatarIndex: 12,
    },
    {
      quote: "Reflectlife helped us keep grandma's memory alive in such a meaningful way. We visit it often.",
      name: "James R.",
      avatarIndex: 18,
    },
  ];

  const sampleMemorials = [
    {
      id: "m-001",
      name: "Ada Johnson",
      years: "1948 - 2024",
      image: portraitPlaceholder,
      tributeCount: 24,
    },
    {
      id: "m-002",
      name: "Robert Chen",
      years: "1952 - 2025",
      image: portraitPlaceholder,
      tributeCount: 18,
    },
    {
      id: "m-003",
      name: "Maria Rodriguez",
      years: "1965 - 2024",
      image: portraitPlaceholder,
      tributeCount: 32,
    },
  ];

  return (
    <div className="min-h-screen">
      {/* Hero Banner */}
      <section className="relative w-full">
        <div className="relative w-full h-[500px] md:h-[600px] overflow-hidden">
          <img
            src={heroBanner}
            alt="Reflectlife floral memorial banner"
            className="w-full h-full object-cover"
          />
          {/* Overlay gradient for text legibility */}
          <div className="absolute inset-0 bg-gradient-to-b from-black/30 via-black/20 to-black/40" />
          
          {/* Centered text overlay */}
          <div className="absolute inset-0 flex flex-col items-center justify-center px-4 text-center">
            <h1 className="font-serif text-4xl md:text-6xl lg:text-7xl font-bold text-white mb-4 md:mb-6 drop-shadow-lg animate-fade-in">
              Remember your loved ones
            </h1>
            <p className="text-lg md:text-xl lg:text-2xl text-white/95 mb-8 md:mb-10 max-w-2xl drop-shadow-md animate-fade-in" style={{ animationDelay: '200ms' }}>
              Begin a journey of remembrance — for the ones who will always be part of you
            </p>
            <Link to={user ? "/memorials" : "/signup"}>
              <Button size="lg" className="px-8 md:px-12 py-6 text-base md:text-lg shadow-elegant-lg animate-fade-in" style={{ animationDelay: '400ms' }}>
                Start remembering today
              </Button>
            </Link>
          </div>
        </div>
      </section>

      {/* Timeline Section - For Signed-In Users Only */}
      {user && (
        <section className="py-20 bg-background border-y">
          <div className="container mx-auto px-4">
            <div className="text-center mb-12">
              <h2 className="font-serif text-3xl md:text-4xl font-bold mb-4">
                Shared Memories
              </h2>
              <p className="text-muted-foreground text-lg max-w-2xl mx-auto">
                Recent moments and memories shared by our community
              </p>
            </div>

            <div className="max-w-3xl mx-auto space-y-6">
              {loadingPosts ? (
                <Card>
                  <CardContent className="p-12 text-center">
                    <p className="text-muted-foreground">Loading memories...</p>
                  </CardContent>
                </Card>
              ) : timelinePosts.length > 0 ? (
                timelinePosts.map((post) => (
                  <Card key={post.id} className="shadow-elegant hover:shadow-elegant-lg transition-smooth">
                    <CardContent className="p-6">
                      <div className="flex items-start gap-4 mb-4">
                        <Avatar className="h-12 w-12">
                          <AvatarImage src={getProfile(post)?.avatar_url} />
                          <AvatarFallback>{getUserInitials(getProfile(post))}</AvatarFallback>
                        </Avatar>
                        <div className="flex-grow">
                          <div className="flex items-center gap-2 mb-1">
                            <span className="font-semibold">
                              {getProfile(post)?.full_name || getProfile(post)?.username || "Anonymous"}
                            </span>
                            <span className="text-sm text-muted-foreground">•</span>
                            <span className="text-sm text-muted-foreground">
                              {formatDistanceToNow(new Date(post.created_at), { addSuffix: true })}
                            </span>
                          </div>
                          {post.location && (
                            <div className="flex items-center gap-1 text-sm text-muted-foreground">
                              <MapPin className="h-3 w-3" />
                              <span>{post.location}</span>
                            </div>
                          )}
                        </div>
                      </div>

                      {post.caption && (
                        <p className="text-foreground mb-4 leading-relaxed">{post.caption}</p>
                      )}

                      {post.media_url && (
                        <div className="rounded-lg overflow-hidden mb-4">
                          <LazyImage
                            src={post.media_url}
                            alt="Memory"
                            className="w-full h-auto max-h-96 object-cover"
                            containerClassName="w-full"
                          />
                        </div>
                      )}

                      <div className="flex items-center gap-6 text-muted-foreground">
                        <button className="flex items-center gap-2 hover:text-primary transition-smooth">
                          <Heart className="h-5 w-5" />
                          <span className="text-sm">{post.likes_count || 0}</span>
                        </button>
                        <button className="flex items-center gap-2 hover:text-primary transition-smooth">
                          <MessageCircle className="h-5 w-5" />
                          <span className="text-sm">{post.comments_count || 0}</span>
                        </button>
                      </div>
                    </CardContent>
                  </Card>
                ))
              ) : (
                <Card>
                  <CardContent className="p-12 text-center">
                    <p className="text-muted-foreground mb-4">
                      No memories shared yet. Be the first to share a memory!
                    </p>
                    <Link to="/timeline">
                      <Button>Share a Memory</Button>
                    </Link>
                  </CardContent>
                </Card>
              )}

              {timelinePosts.length > 0 && (
                <div className="text-center pt-4">
                  <Link to="/timeline">
                    <Button variant="outline" size="lg">
                      View All Memories
                    </Button>
                  </Link>
                </div>
              )}
            </div>
          </div>
        </section>
      )}

      {/* Sign In Prompt - For Non-Signed-In Users */}
      {!user && (
        <section className="py-20 bg-gradient-subtle border-y">
          <div className="container mx-auto px-4">
            <Card className="max-w-2xl mx-auto text-center shadow-elegant">
              <CardContent className="p-12">
                <Heart className="h-16 w-16 mx-auto mb-6 text-primary opacity-80" />
                <h2 className="font-serif text-3xl font-bold mb-4">
                  Join Our Community
                </h2>
                <p className="text-muted-foreground text-lg mb-6 leading-relaxed">
                  Sign in to see shared memories, create memorials, and connect with others remembering their loved ones.
                </p>
                <div className="flex gap-4 justify-center">
                  <Link to="/login">
                    <Button size="lg" variant="outline">
                      Sign In
                    </Button>
                  </Link>
                  <Link to="/signup">
                    <Button size="lg">
                      Sign Up
                    </Button>
                  </Link>
                </div>
              </CardContent>
            </Card>
          </div>
        </section>
      )}

      {/* About / How It Works Section */}
      <section className="py-20 bg-gradient-subtle">
        <div className="container mx-auto px-4">
          <div className="text-center mb-16 animate-fade-in">
            <h2 className="font-serif text-3xl md:text-4xl font-bold mb-6">
              Keeping memories alive, together
            </h2>
            <p className="text-muted-foreground text-lg max-w-2xl mx-auto leading-relaxed">
              Reflectlife is a warm space to preserve and share stories of your loved ones — a place where memories, moments, and legacies live on forever.
            </p>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-8 max-w-5xl mx-auto">
            {features.map((feature, index) => {
              const isCreateMemorial = feature.title === "Create a Memorial";
              return (
                <Card 
                  key={index} 
                  className="border-2 hover:shadow-elegant transition-smooth hover:-translate-y-1 bg-card animate-fade-in cursor-pointer"
                  style={{ animationDelay: `${index * 150}ms` }}
                  onClick={() => {
                    if (isCreateMemorial) {
                      window.location.href = user ? "/memorials" : "/signup";
                    }
                  }}
                >
                  <CardContent className="p-8 text-center">
                    <div className="w-16 h-16 mx-auto mb-6 rounded-full bg-primary/10 flex items-center justify-center">
                      <feature.icon className="h-8 w-8 text-primary" />
                    </div>
                    <h3 className="font-serif text-xl font-semibold mb-3">
                      {feature.title}
                    </h3>
                    <p className="text-muted-foreground leading-relaxed">
                      {feature.description}
                    </p>
                  </CardContent>
                </Card>
              );
            })}
          </div>
        </div>
      </section>

      {/* Testimonials Section */}
      <section className="py-20 bg-background">
        <div className="container mx-auto px-4">
          <div className="text-center mb-16">
            <h2 className="font-serif text-3xl md:text-4xl font-bold mb-4">
              What families say about Reflectlife
            </h2>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-6 max-w-5xl mx-auto">
            {testimonials.map((testimonial, index) => (
              <Card 
                key={index} 
                className="bg-card/50 border-2 hover:shadow-elegant transition-smooth animate-fade-in"
                style={{ animationDelay: `${index * 100}ms` }}
              >
                <CardContent className="p-8">
                  <div className="flex flex-col items-center text-center">
                    <AvatarDisplay avatarIndex={testimonial.avatarIndex} size="lg" className="mb-4" />
                    <p className="text-muted-foreground italic mb-4 leading-relaxed">
                      "{testimonial.quote}"
                    </p>
                    <p className="font-serif font-semibold text-foreground">
                      — {testimonial.name}
                    </p>
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>
        </div>
      </section>

      {/* Featured Templates Section */}
      <section className="py-20 bg-gradient-subtle">
        <div className="container mx-auto px-4">
          <div className="text-center mb-16">
            <h2 className="font-serif text-3xl md:text-4xl font-bold mb-4">
              Featured Templates
            </h2>
            <p className="text-muted-foreground text-lg max-w-2xl mx-auto leading-relaxed">
              Choose from our collection of beautifully designed memorial templates
            </p>
          </div>

          <FeaturedTemplates />
        </div>
      </section>

      {/* CTA Section */}
      <section className="py-20 gradient-hero">
        <div className="container mx-auto px-4">
          <div className="max-w-3xl mx-auto text-center text-primary-foreground">
            <Shield className="h-16 w-16 mx-auto mb-6 opacity-90" />
            <h2 className="font-serif text-3xl md:text-4xl font-bold mb-4">
              Start Preserving Memories Today
            </h2>
            <p className="text-lg mb-8 opacity-90">
              Create a lasting tribute that honors their story, celebrates their life, and keeps their memory alive forever.
            </p>
            <Link to={user ? "/memorials" : "/signup"}>
              <Button size="lg" variant="secondary" className="px-12 shadow-elegant-lg">
                Create a Memorial
              </Button>
            </Link>
          </div>
        </div>
      </section>
    </div>
  );
};

export default Landing;
