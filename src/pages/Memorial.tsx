import { useState, useEffect } from "react";
import { useParams, Link, useNavigate } from "react-router-dom";
import { Calendar, MapPin, Heart, MessageCircle, Image as ImageIcon, Edit, Palette, Loader2, Plus, Upload } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { useTemplateTheme } from "@/hooks/useTemplateTheme";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";
import portraitPlaceholder from "@/assets/portrait-placeholder.jpg";
import timelineBg from "@/assets/timeline-bg.jpg";
import EditMemorialModal from "@/components/EditMemorialModal";
import { AddMemoryModal } from "@/components/AddMemoryModal";
import { CandleSection } from "@/components/candle/CandleSection";
import ShareMemorial from "@/components/ShareMemorial";
import RemembranceSection from "@/components/remembrance/RemembranceSection";
import DonateInMemory from "@/components/donation/DonateInMemory";
import PrintButton from "@/components/PrintButton";
import { useTranslation } from "react-i18next";
import { MemorialDateReminders } from "@/components/remembrance/MemorialDateReminders";

import { tr } from "@/i18n/tr";
import { formatDate as formatLongDate } from "@/lib/dateFormat";
const Memorial = () => {
  const { id } = useParams();
  const navigate = useNavigate();
  const { toast } = useToast();
  const templateTheme = useTemplateTheme();
  const { i18n } = useTranslation();
  const [memorial, setMemorial] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [currentUserId, setCurrentUserId] = useState<string | null>(null);
  const [likeCount, setLikeCount] = useState(0);
  const [isLiked, setIsLiked] = useState(false);
  const [isEditModalOpen, setIsEditModalOpen] = useState(false);
  const [showAddMemoryModal, setShowAddMemoryModal] = useState(false);
  const [galleryUploading, setGalleryUploading] = useState(false);
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

      if (!id) {
        setMemorial(null);
        return;
      }

      const isUuid = /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i.test(id);
      const query = supabase.from("memorials").select("*");
      const { data, error } = await (isUuid ? query.eq("id", id) : query.eq("slug", id)).maybeSingle();

      if (error) throw error;

      if (!data) {
        setMemorial(null);
        return;
      }

      // Fetch creator profile separately using public_profiles view
      let profileData = null;
      if (data.user_id) {
        const { data: profile } = await supabase
          .from("public_profiles")
          .select("full_name, first_name, last_name")
          .eq("id", data.user_id)
          .maybeSingle();

        profileData = profile ?? null;
      }

      setMemorial({ ...data, profiles: profileData });
    } catch (error: any) {
      console.error("Error fetching memorial:", error);
      toast({
        title: tr("a.7f2f6a15cf"),
        description: tr("a.2598406ac3"),
        variant: "destructive",
      });
      setMemorial(null);
    } finally {
      setLoading(false);
    }
  };

  const isCreator = currentUserId && memorial?.user_id === currentUserId;
  const [timelineEntries, setTimelineEntries] = useState<any[]>([]);
  const [tributePosts, setTributePosts] = useState<any[]>([]);
  const [galleryMedia, setGalleryMedia] = useState<any[]>([]);
  const [showTributeModal, setShowTributeModal] = useState(false);
  const [tribute, setTribute] = useState("");

  useEffect(() => {
    if (memorial?.id) {
      fetchTimelineData();
      fetchTributes();
      fetchGalleryMedia();
    }
  }, [memorial?.id]);

  const fetchTimelineData = async () => {
    try {
      // Fetch real timeline entries from memorial_entries table
      const { data, error } = await supabase
        .from("memorial_entries")
        .select("*")
        .eq("timeline_id", memorial?.id)
        .order("event_date", { ascending: false });

      if (error) throw error;
      setTimelineEntries(data || []);
    } catch (error) {
      console.error("Error fetching timeline:", error);
    }
  };

  const fetchTributes = async () => {
    try {
      // Fetch real tributes from tributes table
      const { data, error } = await supabase
        .from("tributes" as any)
        .select(`
          *,
          profiles:user_id (
            full_name,
            avatar_url
          )
        `)
        .eq("memorial_id", memorial?.id)
        .order("created_at", { ascending: false });

      if (error) throw error;
      setTributePosts(data || []);
    } catch (error) {
      console.error("Error fetching tributes:", error);
    }
  };

  const handleSubmitTribute = async () => {
    const { data: { user } } = await supabase.auth.getUser();

    if (!user) {
      toast({
        title: tr("a.682810de81"),
        description: tr("a.59a9eb72c7"),
        variant: "destructive",
      });
      return;
    }

    if (!tribute.trim()) {
      toast({
        title: tr("a.6972d4c7c9"),
        description: tr("a.93316ec0c7"),
        variant: "destructive",
      });
      return;
    }

    const { error } = await supabase
      .from("tributes" as any)
      .insert({
        user_id: user.id,
        memorial_id: memorial.id,
        tribute_text: tribute,
      });

    if (error) {
      console.error(error);
      toast({
        title: tr("a.7f2f6a15cf"),
        description: tr("a.893803bc0a"),
        variant: "destructive",
      });
      return;
    }

    toast({
      title: tr("a.42a8f651d7"),
      description: tr("a.fefde4d03c"),
    });

    setTribute("");
    setShowTributeModal(false);
    fetchTributes();
  };

  const fetchGalleryMedia = async () => {
    try {
      // Fetch real media from memorial_media table
      const { data, error } = await supabase
        .from("memorial_media")
        .select("*")
        .eq("memorial_id", memorial?.id)
        .order("uploaded_at", { ascending: false });

      if (error) throw error;
      setGalleryMedia(data || []);
    } catch (error) {
      console.error("Error fetching gallery:", error);
    }
  };

  const [heartBusy, setHeartBusy] = useState(false);

  const getGuestKey = () => {
    let key = localStorage.getItem("reflectlife_guest_key");
    if (!key) {
      key = crypto.randomUUID();
      localStorage.setItem("reflectlife_guest_key", key);
    }
    return key;
  };

  useEffect(() => {
    if (!memorial?.id) return;
    let active = true;
    (async () => {
      const { count } = await supabase
        .from("memorial_hearts")
        .select("id", { count: "exact", head: true })
        .eq("memorial_id", memorial.id);
      if (!active) return;
      setLikeCount(count ?? 0);

      const query = supabase
        .from("memorial_hearts")
        .select("id")
        .eq("memorial_id", memorial.id)
        .limit(1);
      const { data: mine } = currentUserId
        ? await query.eq("user_id", currentUserId)
        : await query.eq("guest_key", getGuestKey());
      if (active) setIsLiked((mine?.length ?? 0) > 0);
    })();
    return () => {
      active = false;
    };
  }, [memorial?.id, currentUserId]);

  const handleLike = async () => {
    if (!memorial?.id || heartBusy) return;
    const wasLiked = isLiked;
    // Optimistic update
    setIsLiked(!wasLiked);
    setLikeCount((c) => Math.max(0, c + (wasLiked ? -1 : 1)));
    setHeartBusy(true);
    try {
      if (wasLiked) {
        if (!currentUserId) {
          // Guests keep their heart for the memorial
          setIsLiked(true);
          setLikeCount((c) => c + 1);
          return;
        }
        const { error } = await supabase
          .from("memorial_hearts")
          .delete()
          .eq("memorial_id", memorial.id)
          .eq("user_id", currentUserId);
        if (error) throw error;
      } else {
        const { error } = await supabase.from("memorial_hearts").insert(
          currentUserId
            ? { memorial_id: memorial.id, user_id: currentUserId }
            : { memorial_id: memorial.id, guest_key: getGuestKey() }
        );
        if (error && error.code !== "23505") throw error;
      }
    } catch (error) {
      console.error("Error updating heart:", error);
      setIsLiked(wasLiked);
      setLikeCount((c) => Math.max(0, c + (wasLiked ? 1 : -1)));
      toast({
        title: tr("a.82d897a0de"),
        description: tr("a.a917db7af2"),
        variant: "destructive",
      });
    } finally {
      setHeartBusy(false);
    }
  };


  const handleGalleryUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    if (!e.target.files || !e.target.files[0] || !memorial) return;

    const file = e.target.files[0];
    setGalleryUploading(true);

    try {
      const { data: refreshed, error: refreshError } = await supabase.auth.refreshSession();
      const user = refreshed.session?.user ?? null;

      if (refreshError || !user) {
        throw new Error(tr("a.ce6d6f1c66"));
      }

      if (memorial.user_id !== user.id) {
        throw new Error(tr("a.a0d824a617"));
      }

      const fileExt = file.name.split(".").pop() || "jpg";
      const fileName = `${user.id}/memorials/${memorial.id}/${Date.now()}-${crypto.randomUUID()}.${fileExt}`;

      const { error: uploadError } = await supabase.storage
        .from("memorial_uploads")
        .upload(fileName, file, { upsert: false });
      if (uploadError) throw uploadError;

      const { data: { publicUrl } } = supabase.storage
        .from("memorial_uploads")
        .getPublicUrl(fileName);

      const mediaType = file.type.startsWith("video") ? "video" : "image";
      const { error } = await supabase
        .from("memorial_media")
        .insert({
          memorial_id: memorial.id,
          media_url: publicUrl,
          media_type: mediaType,
        });
      if (error) throw error;

      toast({ title: tr("a.352aad6e72"), description: tr("a.b91c9b1bf5") });
      fetchGalleryMedia();
    } catch (error: any) {
      const rawMessage = error?.message || "Upload failed";
      const friendlyMessage = rawMessage.toLowerCase().includes("row-level security")
        ? tr("a.2b4293120d")
        : rawMessage;

      toast({ title: tr("a.ad0d0603e2"), description: friendlyMessage, variant: "destructive" });
    } finally {
      setGalleryUploading(false);
      e.target.value = "";
    }
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
            <h2 className="font-serif text-2xl mb-2">{tr("a.3b2c4ceb1a")}</h2>
            <p className="text-muted-foreground mb-4">{tr("a.81a6028417")}</p>
            <Button onClick={() => navigate("/memorials")}>{tr("a.7c9ebf1cc1")}</Button>
          </CardContent>
        </Card>
      </div>
    );
  }

  const formatDate = (date: string | null) => {
    if (!date) return tr("a.unknown");
    return formatLongDate(date);
  };

  return (
    <div 
      className="min-h-screen transition-smooth"
      style={{
        '--template-accent': templateTheme.accentColor,
        backgroundImage: `linear-gradient(rgba(255,255,255,0.85), rgba(255,255,255,0.85)), url(${backgroundImage})`,
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
        
        {memorial.memorial_type !== "defender_of_ukraine" && templateTheme.templateName && (
          <div className="absolute top-6 left-6 text-white/90 text-sm font-medium bg-black/30 backdrop-blur-sm px-3 py-2 rounded-lg border border-white/20">
            {tr("a.0485a02659")} {templateTheme.templateName}
          </div>
        )}
        
        {memorial.memorial_type !== "defender_of_ukraine" && <div className="absolute top-6 right-6">
          <Link to="/templates">
            <Button variant="outline" className="gap-2 bg-background/80 backdrop-blur-sm">
              <Palette className="h-4 w-4" />
              {tr("a.5b98d0a6f0")}
            </Button>
          </Link>
        </div>}
        
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
              {memorial.memorial_type === "defender_of_ukraine" && <div className="mb-3 flex flex-wrap justify-center gap-2 lg:justify-start"><span className="rounded-full border border-primary/40 bg-primary/10 px-3 py-1 text-sm font-semibold">{memorial.defender_label === "defender_female" ? "Захисниця України" : "Захисник України"}</span>{memorial.service_unit && <span className="rounded-full border px-3 py-1 text-sm">{memorial.service_unit}</span>}{memorial.service_place && <span className="rounded-full border px-3 py-1 text-sm">{memorial.service_place}</span>}</div>}
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
                  {tr("a.5d73cc3051")} {memorial.profiles.full_name || 
                    `${memorial.profiles.first_name || ''} ${memorial.profiles.last_name || ''}`.trim() || 
                    tr("a.9bed510400")}
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
                <Button 
                  variant="outline" 
                  size="sm" 
                  className="gap-2"
                  onClick={() => setIsEditModalOpen(true)}
                >
                  <Edit className="h-4 w-4" />
                  {tr("a.5301648dcf")}
                </Button>
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

        {memorial?.id && <CandleSection memorialId={memorial.id} memorialName={memorial.name} isOwner={!!isCreator} guestEnabled={memorial.guest_candles_enabled !== false} isDefender={memorial.memorial_type === "defender_of_ukraine"} />}
        <MemorialDateReminders memorialId={memorial.id} ownerId={memorial.user_id} isOwner={!!isCreator} dateOfDeath={memorial.date_of_death} />

        {memorial?.id && memorial?.name && (
          <RemembranceSection
            memorialId={memorial.id}
            memorialName={memorial.name}
            isOwner={!!isCreator}
            hasAccess={false}
            actionSlot={
              <DonateInMemory
                memorialId={memorial.id}
                memorialName={memorial.name}
                isOwner={!!isCreator}
                previewImage={memorial.preview_image_url}
              />
            }
          />
        )}

        {memorial?.name && (
          <ShareMemorial
            name={memorial.name}
            shareUrl={`https://reflectlife.net/memorial/${memorial.slug || memorial.id}`}
            shareText={i18n.language === "uk" ? `Світла пам'ять про ${memorial.name}` : `Remembering ${memorial.name}`}
          />
        )}


        {/* Tabs */}
        <Tabs defaultValue="timeline" className="w-full">
          <TabsList className="mb-6">
            <TabsTrigger value="timeline">{tr("a.018514a3d5")}</TabsTrigger>
            <TabsTrigger value="tributes">
              {tr("a.b9429f77d8")}{tributePosts.length})
            </TabsTrigger>
            <TabsTrigger value="gallery">{tr("a.242683fb39")}{galleryMedia.length})</TabsTrigger>
          </TabsList>

          {/* Timeline */}
          <TabsContent value="timeline" className="space-y-6">
            {isCreator && (
              <div className="flex justify-end">
                <Button className="gap-2" onClick={() => setShowAddMemoryModal(true)}>
                  <Plus className="h-4 w-4" />
                  {tr("a.22012e09a4")}
                </Button>
              </div>
            )}
            {timelineEntries.length > 0 ? (
              timelineEntries.map((entry) => (
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
                        {entry.content_type === "photo" ? (
                          <ImageIcon className="h-5 w-5" style={{ color: templateTheme.accentColor }} />
                        ) : entry.content_type === "video" ? (
                          <MessageCircle className="h-5 w-5" style={{ color: templateTheme.accentColor }} />
                        ) : (
                          <MessageCircle className="h-5 w-5" style={{ color: templateTheme.accentColor }} />
                        )}
                      </div>

                      <div className="flex-grow">
                        <div className="flex items-center gap-2 mb-2">
                          <Calendar className="h-4 w-4 text-muted-foreground" />
                          <span className="text-sm text-muted-foreground">
                            {entry.event_date ? formatDate(entry.event_date) : tr("a.acb6273eca")}
                          </span>
                        </div>
                        {entry.caption && (
                          <p className="text-muted-foreground mb-4">{entry.caption}</p>
                        )}
                        
                        {entry.content_url && entry.content_type === "photo" && (
                          <div className="rounded-lg overflow-hidden max-w-md">
                            <img
                              src={entry.content_url}
                              alt={entry.caption || tr("a.89c8a2851d")}
                              className="w-full h-auto"
                            />
                          </div>
                        )}
                        
                        {entry.content_url && entry.content_type === "video" && (
                          <div className="rounded-lg overflow-hidden max-w-md">
                            <video
                              src={entry.content_url}
                              controls
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
                  <p className="text-muted-foreground mb-4">
                    {tr("a.d15329a213")}
                  </p>
                  {isCreator && (
                    <Button className="gap-2" onClick={() => setShowAddMemoryModal(true)}>
                      <Plus className="h-4 w-4" />
                      {tr("a.5faf5f9827")}
                    </Button>
                  )}
                </CardContent>
              </Card>
            )}
          </TabsContent>

          {/* Tributes */}
          <TabsContent value="tributes" className="space-y-6">
            {tributePosts.length > 0 ? (
              tributePosts.map((tribute) => (
                <Card key={tribute.id} className="shadow-elegant">
                  <CardContent className="p-6">
                    <div className="flex items-start gap-4">
                      <div className="w-10 h-10 rounded-full bg-accent/20 flex items-center justify-center flex-shrink-0">
                        {tribute.profiles?.avatar_url ? (
                          <img 
                            src={tribute.profiles.avatar_url} 
                            alt={tribute.profiles.full_name || tr("a.9f8a2389a2")}
                            className="w-full h-full object-cover rounded-full"
                          />
                        ) : (
                          <span className="text-accent font-semibold">
                            {tribute.profiles?.full_name?.charAt(0) || 'A'}
                          </span>
                        )}
                      </div>
                      <div className="flex-grow">
                        <div className="flex items-center gap-2 mb-1">
                          <span className="font-semibold">
                            {tribute.profiles?.full_name || tr("a.9bed510400")}
                          </span>
                          <span className="text-sm text-muted-foreground">•</span>
                          <span className="text-sm text-muted-foreground">
                            {formatDate(tribute.created_at)}
                          </span>
                        </div>
                        {tribute.tribute_text && (
                          <p className="text-muted-foreground mb-3">{tribute.tribute_text}</p>
                        )}
                      </div>
                    </div>
                  </CardContent>
                </Card>
              ))
            ) : (
              <Card className="text-center py-12">
                <CardContent>
                  <p className="text-muted-foreground mb-4">
                    {tr("a.1efba6a412")}
                  </p>
                </CardContent>
              </Card>
            )}

            <Card className="border-2 border-dashed">
              <CardContent className="p-6 text-center">
                <Button className="gap-2" onClick={() => setShowTributeModal(true)}>
                  <MessageCircle className="h-4 w-4" />
                  {tr("a.f57ba92cd5")}
                </Button>
              </CardContent>
            </Card>

            {/* Tribute Modal */}
            {showTributeModal && (
              <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50">
                <div className="bg-background p-6 rounded-xl max-w-lg w-full mx-4 shadow-lg">
                  <h2 className="text-xl font-bold mb-4">{tr("a.3109569be5")}</h2>

                  <textarea
                    className="w-full border border-input rounded-md p-3 bg-background text-foreground focus:outline-none focus:ring-2 focus:ring-ring"
                    rows={4}
                    value={tribute}
                    onChange={(e) => setTribute(e.target.value)}
                    placeholder={tr("a.8e02f8ee0c")}
                  />

                  <div className="flex justify-end gap-3 mt-4">
                    <Button variant="ghost" onClick={() => setShowTributeModal(false)}>
                      {tr("a.77dfd2135f")}
                    </Button>

                    <Button onClick={handleSubmitTribute}>
                      {tr("a.acf56f325b")}
                    </Button>
                  </div>
                </div>
              </div>
            )}
          </TabsContent>

          {/* Gallery */}
          <TabsContent value="gallery">
            {isCreator && (
              <div className="flex justify-end mb-4">
                <Button className="gap-2" asChild disabled={galleryUploading}>
                  <label className="cursor-pointer">
                    <Upload className="h-4 w-4" />
                    {galleryUploading ? tr("a.070e328ec8") : tr("a.7718b73ae9")}
                    <input
                      type="file"
                      accept="image/*,video/*"
                      className="hidden"
                      onChange={handleGalleryUpload}
                    />
                  </label>
                </Button>
              </div>
            )}
            {galleryMedia.length > 0 ? (
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
                {galleryMedia.map((media) => (
                  <Card key={media.id} className="overflow-hidden shadow-elegant">
                    <CardContent className="p-0">
                      {media.media_type === 'photo' || media.media_type === 'image' ? (
                        <img
                          src={media.media_url}
                          alt={media.caption || tr("a.10c2eb504b")}
                          className="w-full h-64 object-cover"
                        />
                      ) : (
                        <video
                          src={media.media_url}
                          controls
                          className="w-full h-64 object-cover"
                        />
                      )}
                      {media.caption && (
                        <div className="p-3">
                          <p className="text-sm text-muted-foreground">{media.caption}</p>
                        </div>
                      )}
                    </CardContent>
                  </Card>
                ))}
              </div>
            ) : (
              <Card className="text-center py-12">
                <CardContent>
                  <ImageIcon className="h-16 w-16 mx-auto mb-4 text-muted-foreground/50" />
                  <p className="text-muted-foreground mb-4">
                    {tr("a.203df629d0")}
                  </p>
                  {isCreator && (
                    <Button className="gap-2" asChild>
                      <label className="cursor-pointer">
                        <Upload className="h-4 w-4" />
                        {tr("a.17f6ffecb3")}
                        <input
                          type="file"
                          accept="image/*,video/*"
                          className="hidden"
                          onChange={handleGalleryUpload}
                        />
                      </label>
                    </Button>
                  )}
                </CardContent>
              </Card>
            )}
          </TabsContent>
        </Tabs>
      </div>

      {/* Edit Modal */}
      <EditMemorialModal
        open={isEditModalOpen}
        onOpenChange={setIsEditModalOpen}
        memorial={memorial}
        onMemorialUpdated={fetchMemorial}
      />

      {/* Add Memory Modal */}
      {currentUserId && memorial && (
        <AddMemoryModal
          open={showAddMemoryModal}
          onOpenChange={setShowAddMemoryModal}
          timelineId={memorial.id}
          userId={currentUserId}
          onMemoryAdded={fetchTimelineData}
        />
      )}
      <PrintButton />
    </div>
  );
};

export default Memorial;
