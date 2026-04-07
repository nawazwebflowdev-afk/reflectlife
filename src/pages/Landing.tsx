import { useState, useEffect } from "react";
import { Link, useLocation } from "react-router-dom";
import { Heart, Share2, Clock, Shield } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { AvatarDisplay } from "@/components/EmojiAvatarSelector";
import heroBanner from "@/assets/hero-banner.png";
import portraitPlaceholder from "@/assets/portrait-placeholder.jpg";
import FeaturedTemplates from "@/components/FeaturedTemplates";
import PostDetailModal from "@/components/PostDetailModal";
import { supabase } from "@/integrations/supabase/client";
import { useTranslation } from "react-i18next";

const Landing = () => {
  const location = useLocation();
  const { t } = useTranslation();
  const [user, setUser] = useState<any>(null);
  const [timelinePosts, setTimelinePosts] = useState<any[]>([]);
  const [loadingPosts, setLoadingPosts] = useState(false);
  const [selectedPost, setSelectedPost] = useState<any>(null);
  const [publicMemorials, setPublicMemorials] = useState<any[]>([]);

  useEffect(() => {
    checkUser();
    fetchPublicMemorials();
  }, [location.key]);

  const checkUser = async () => {
    const { data: { user } } = await supabase.auth.getUser();
    setUser(user);
    if (user) fetchTimelinePosts();
  };

  const fetchPublicMemorials = async () => {
    try {
      const { data } = await supabase
        .from('memorials')
        .select('id, name, date_of_birth, date_of_death, preview_image_url')
        .eq('is_public', true)
        .eq('privacy_level', 'public')
        .order('created_at', { ascending: false })
        .limit(6);
      setPublicMemorials(data || []);
    } catch (error) {
      console.error('Error fetching public memorials:', error);
    }
  };

  const fetchTimelinePosts = async () => {
    setLoadingPosts(true);
    try {
      const { data, error } = await supabase
        .from('memorial_posts')
        .select(`*, profiles:user_id (username, full_name, avatar_url)`)
        .order('created_at', { ascending: false })
        .limit(10);
      if (error) throw error;
      setTimelinePosts(data || []);
    } catch (error) {
      console.error("Error fetching timeline posts:", error);
    } finally {
      setLoadingPosts(false);
    }
  };

  const features = [
    { icon: Heart, titleKey: "features.createMemorial", descKey: "features.createMemorialDesc", isCreate: true },
    { icon: Share2, titleKey: "features.celebrateJourney", descKey: "features.celebrateJourneyDesc" },
    { icon: Clock, titleKey: "features.keepLegacy", descKey: "features.keepLegacyDesc" },
  ];

  const testimonials = [
    { quoteKey: "testimonials.sarah", name: "Sarah M.", avatarIndex: 0 },
    { quoteKey: "testimonials.michael", name: "Michael T.", avatarIndex: 5 },
    { quoteKey: "testimonials.linda", name: "Linda K.", avatarIndex: 12 },
    { quoteKey: "testimonials.james", name: "James R.", avatarIndex: 18 },
  ];

  return (
    <div className="min-h-screen">
      {/* Hero Banner */}
      <section className="relative w-full">
        <div className="relative w-full h-[500px] md:h-[600px] overflow-hidden">
          <img src={heroBanner} alt="Reflectlife floral memorial banner" className="w-full h-full object-cover" />
          <div className="absolute inset-0 bg-gradient-to-b from-black/30 via-black/20 to-black/40" />
          <div className="absolute inset-0 flex flex-col items-center justify-center px-4 text-center">
            <h1 className="font-serif text-4xl md:text-6xl lg:text-7xl font-bold text-white mb-4 md:mb-6 drop-shadow-lg animate-fade-in">
              {t("landing.heroTitle")}
            </h1>
            <p className="text-lg md:text-xl lg:text-2xl text-white/95 mb-8 md:mb-10 max-w-2xl drop-shadow-md animate-fade-in" style={{ animationDelay: '200ms' }}>
              {t("landing.heroSubtitle")}
            </p>
            <Link to={user ? "/memorials" : "/signup"}>
              <Button size="lg" className="px-8 md:px-12 py-6 text-base md:text-lg shadow-elegant-lg animate-fade-in" style={{ animationDelay: '400ms' }}>
                {t("landing.heroCta")}
              </Button>
            </Link>
          </div>
        </div>
      </section>

      {/* Sign In Prompt */}
      {!user && (
        <section className="py-20 bg-gradient-subtle border-y">
          <div className="container mx-auto px-4">
            <Card className="max-w-2xl mx-auto text-center shadow-elegant">
              <CardContent className="p-12">
                <Heart className="h-16 w-16 mx-auto mb-6 text-primary opacity-80" />
                <h2 className="font-serif text-3xl font-bold mb-4">{t("landing.joinTitle")}</h2>
                <p className="text-muted-foreground text-lg mb-6 leading-relaxed">{t("landing.joinDesc")}</p>
                <div className="flex gap-4 justify-center">
                  <Link to="/login"><Button size="lg" variant="outline">{t("nav.signIn")}</Button></Link>
                  <Link to="/signup"><Button size="lg">{t("landing.signUp")}</Button></Link>
                </div>
              </CardContent>
            </Card>
          </div>
        </section>
      )}

      {/* Memorial Wall CTA */}
      <section className="py-16 bg-background">
        <div className="container mx-auto px-4 text-center">
          <h2 className="font-serif text-3xl md:text-4xl font-bold mb-4">{t("landing.memorialWallTitle")}</h2>
          <p className="text-muted-foreground text-lg max-w-2xl mx-auto mb-8 leading-relaxed">{t("landing.memorialWallDesc")}</p>

          {publicMemorials.length > 0 && (
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6 max-w-5xl mx-auto mb-10">
              {publicMemorials.map((memorial) => {
                const birthYear = memorial.date_of_birth ? new Date(memorial.date_of_birth).getFullYear() : '?';
                const deathYear = memorial.date_of_death ? new Date(memorial.date_of_death).getFullYear() : '?';
                return (
                  <Link key={memorial.id} to={`/memorial/${memorial.id}`}>
                    <Card className="overflow-hidden hover:shadow-elegant-lg transition-smooth group">
                      <div className="aspect-square overflow-hidden bg-muted">
                        <img src={memorial.preview_image_url || portraitPlaceholder} alt={memorial.name} className="w-full h-full object-cover group-hover:scale-105 transition-smooth" />
                      </div>
                      <CardContent className="p-4">
                        <h3 className="font-serif text-lg font-semibold mb-1">{memorial.name}</h3>
                        <p className="text-muted-foreground text-sm">{birthYear} - {deathYear}</p>
                      </CardContent>
                    </Card>
                  </Link>
                );
              })}
            </div>
          )}

          <Link to="/memorials">
            <Button size="lg" className="px-10 py-6 text-base md:text-lg shadow-elegant-lg gap-2">
              <Heart className="h-5 w-5" />
              {t("landing.memorialWallBtn")}
            </Button>
          </Link>
        </div>
      </section>

      {/* About / How It Works */}
      <section className="py-20 bg-gradient-subtle">
        <div className="container mx-auto px-4">
          <div className="text-center mb-16 animate-fade-in">
            <h2 className="font-serif text-3xl md:text-4xl font-bold mb-6">{t("landing.howItWorksTitle")}</h2>
            <p className="text-muted-foreground text-lg max-w-2xl mx-auto leading-relaxed">{t("landing.howItWorksDesc")}</p>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-8 max-w-5xl mx-auto">
            {features.map((feature, index) => (
              <Card
                key={index}
                className="border-2 hover:shadow-elegant transition-smooth hover:-translate-y-1 bg-card animate-fade-in cursor-pointer"
                style={{ animationDelay: `${index * 150}ms` }}
                onClick={() => {
                  if (feature.isCreate) window.location.href = user ? "/memorials" : "/signup";
                }}
              >
                <CardContent className="p-8 text-center">
                  <div className="w-16 h-16 mx-auto mb-6 rounded-full bg-primary/10 flex items-center justify-center">
                    <feature.icon className="h-8 w-8 text-primary" />
                  </div>
                  <h3 className="font-serif text-xl font-semibold mb-3">{t(feature.titleKey)}</h3>
                  <p className="text-muted-foreground leading-relaxed">{t(feature.descKey)}</p>
                </CardContent>
              </Card>
            ))}
          </div>
        </div>
      </section>

      {/* Testimonials */}
      <section className="py-20 bg-background">
        <div className="container mx-auto px-4">
          <div className="text-center mb-16">
            <h2 className="font-serif text-3xl md:text-4xl font-bold mb-4">{t("landing.testimonialsTitle")}</h2>
          </div>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6 max-w-5xl mx-auto">
            {testimonials.map((testimonial, index) => (
              <Card key={index} className="bg-card/50 border-2 hover:shadow-elegant transition-smooth animate-fade-in" style={{ animationDelay: `${index * 100}ms` }}>
                <CardContent className="p-8">
                  <div className="flex flex-col items-center text-center">
                    <AvatarDisplay avatarIndex={testimonial.avatarIndex} size="lg" className="mb-4" />
                    <p className="text-muted-foreground italic mb-4 leading-relaxed">"{t(testimonial.quoteKey)}"</p>
                    <p className="font-serif font-semibold text-foreground">— {testimonial.name}</p>
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>
        </div>
      </section>

      {/* Featured Templates */}
      <section className="py-20 bg-gradient-subtle">
        <div className="container mx-auto px-4">
          <div className="text-center mb-16">
            <h2 className="font-serif text-3xl md:text-4xl font-bold mb-4">{t("landing.featuredTemplatesTitle")}</h2>
            <p className="text-muted-foreground text-lg max-w-2xl mx-auto leading-relaxed">{t("landing.featuredTemplatesDesc")}</p>
          </div>
          <FeaturedTemplates />
        </div>
      </section>

      {/* CTA */}
      <section className="py-20 gradient-hero">
        <div className="container mx-auto px-4">
          <div className="max-w-3xl mx-auto text-center text-primary-foreground">
            <Shield className="h-16 w-16 mx-auto mb-6 opacity-90" />
            <h2 className="font-serif text-3xl md:text-4xl font-bold mb-4">{t("landing.ctaTitle")}</h2>
            <p className="text-lg mb-8 opacity-90">{t("landing.ctaDesc")}</p>
            <Link to={user ? "/memorials" : "/signup"}>
              <Button size="lg" variant="secondary" className="px-12 shadow-elegant-lg">{t("landing.ctaBtn")}</Button>
            </Link>
          </div>
        </div>
      </section>

      <PostDetailModal
        open={!!selectedPost}
        onOpenChange={(open) => !open && setSelectedPost(null)}
        post={selectedPost}
        user={user}
        onPostUpdated={fetchTimelinePosts}
      />
    </div>
  );
};

export default Landing;
