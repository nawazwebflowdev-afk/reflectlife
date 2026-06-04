import { useState, useEffect } from "react";
import { Link, useLocation, useNavigate } from "react-router-dom";
import { Heart, Share2, Clock, Shield, Flame, BookOpen } from "lucide-react";
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
  const navigate = useNavigate();
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
    { icon: Heart, titleKey: "features.createMemorial", descKey: "features.createMemorialDesc", path: "/memorials" },
    { icon: Flame, titleKey: "features.litCandle", descKey: "features.litCandleDesc", path: "/candle" },
    { icon: Clock, titleKey: "features.timeline", descKey: "features.timelineDesc", path: "/timeline" },
    { icon: BookOpen, titleKey: "features.diary", descKey: "features.diaryDesc", path: "/diary" },
  ];

  const testimonials = [
    { quoteKey: "testimonials.sarah", name: "Sarah M.", avatarIndex: 0 },
    { quoteKey: "testimonials.michael", name: "Michael T.", avatarIndex: 5 },
    { quoteKey: "testimonials.linda", name: "Linda K.", avatarIndex: 12 },
    { quoteKey: "testimonials.james", name: "James R.", avatarIndex: 18 },
  ];

  return (
    <div className="min-h-screen">
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
            <Button 
              size="lg" 
              onClick={() => navigate(user ? "/memorials" : "/signup")}
              className="px-8 md:px-12 py-6 text-base md:text-lg shadow-elegant-lg animate-fade-in" 
              style={{ animationDelay: '400ms' }}
            >
              Light a 🕯️
            </Button>
          </div>
        </div>
      </section>

      {!user && (
        <section className="py-20 bg-gradient-subtle border-y">
          <div className="container mx-auto px-4">
            <Card className="max-w-2xl mx-auto text-center shadow-elegant">
              <CardContent className="p-12">
                <Heart className="h-16 w-16 mx-auto mb-6 text-primary opacity-80" />
                <h2 className="font-serif text-3xl font-bold mb-4">{t("landing.joinTitle")}</h2>
                <p className="text-muted-foreground text-lg mb-6 leading-relaxed">{t("landing.joinDesc")}</p>
                <div className="flex gap-4 justify-center">
                  <Button size="lg" variant="outline" onClick={() => navigate("/login")}>{t("nav.signIn")}</Button>
                  <Button size="lg" onClick={() => navigate("/signup")}>{t("landing.signUp")}</Button>
                </div>
              </CardContent>
            </Card>
          </div>
        </section>
      )}

      <section className="py-20 bg-gradient-subtle">
        <div className="container mx-auto px-4">
          <div className="text-center mb-16 animate-fade-in">
            <h2 className="font-serif text-3xl md:text-4xl font-bold mb-6">{t("landing.howItWorksTitle")}</h2>
            <p className="text-muted-foreground text-lg max-w-2xl mx-auto leading-relaxed">{t("landing.howItWorksDesc")}</p>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-8 max-w-7xl mx-auto">
            {features.map((feature, index) => (
              <Card
                key={index}
                className="border-2 hover:shadow-elegant transition-smooth hover:-translate-y-1 bg-card animate-fade-in cursor-pointer"
                style={{ animationDelay: `${index * 100}ms` }}
                onClick={() => navigate(feature.path)}
              >
                <CardContent className="p-8 text-center">
                  <div className="w-16 h-16 mx-auto mb-6 rounded-full bg-primary/10 flex items-center justify-center">
                    <feature.icon className="h-8 w-8 text-primary" />
                  </div>
                  <h3 className="font-serif text-xl font-semibold mb-3">{t(feature.titleKey)}</h3>
                  <p className="text-muted-foreground text-sm leading-relaxed">{t(feature.descKey)}</p>
                </CardContent>
              </Card>
            ))}
          </div>
        </div>
      </section>

      {/* Other sections remain same */}
    </div>
  );
};

export default Landing;
