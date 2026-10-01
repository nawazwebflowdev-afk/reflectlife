import { useState, useEffect } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Heart, MessageCircle, Image as ImageIcon, MapPin, Calendar, Loader2, Share2 } from "lucide-react";
import { formatDistanceToNow } from "date-fns";
import type { User } from "@supabase/supabase-js";
import { CommentsModal } from "@/components/CommentsModal";
import { SharePostModal } from "@/components/SharePostModal";
import { cn } from "@/utils";
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from "@/components/ui/tooltip";

import { tr } from "@/i18n/tr";
interface Post {
  id: string;
  user_id: string;
  media_url: string | null;
  caption: string | null;
  location: string | null;
  created_at: string;
  likes_count: number;
  comments_count: number;
  profiles?: {
    full_name: string | null;
    avatar_url: string | null;
  };
  isLikedByUser?: boolean;
}

const Timeline = () => {
  const [user, setUser] = useState<User | null>(null);
  const [posts, setPosts] = useState<Post[]>([]);
  const [loading, setLoading] = useState(true);
  const [uploading, setUploading] = useState(false);
  const [caption, setCaption] = useState("");
  const [location, setLocation] = useState("");
  const [mediaFile, setMediaFile] = useState<File | null>(null);
  const [mediaPreview, setMediaPreview] = useState<string | null>(null);
  const [selectedPostForComments, setSelectedPostForComments] = useState<string | null>(null);
  const [selectedPostForShare, setSelectedPostForShare] = useState<Post | null>(null);
  const { toast } = useToast();

  // Auto-detect location
  useEffect(() => {
    if (navigator.geolocation) {
      navigator.geolocation.getCurrentPosition(
        async (position) => {
          try {
            const { latitude, longitude } = position.coords;
            const res = await fetch(
              `https://nominatim.openstreetmap.org/reverse?lat=${latitude}&lon=${longitude}&format=json&accept-language=en`
            );
            const data = await res.json();
            const addr = data.address;
            const city = addr.city || addr.town || addr.village || addr.municipality || "";
            const country = addr.country || "";
            if (city || country) {
              setLocation([city, country].filter(Boolean).join(", "));
            }
          } catch (e) {
            // Silently fail - location is optional
          }
        },
        () => {}, // User denied - silently fail
        { timeout: 5000 }
      );
    }
  }, []);

  useEffect(() => {
    // Get current user
    supabase.auth.getSession().then(({ data: { session } }) => {
      setUser(session?.user ?? null);
    });

    const { data: { subscription } } = supabase.auth.onAuthStateChange(
      (_event, session) => {
        setUser(session?.user ?? null);
      }
    );

    fetchPosts();

    // Set up real-time subscription for posts
    const channel = supabase
      .channel('memorial-posts-changes')
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'memorial_posts'
        },
        () => {
          fetchPosts();
        }
      )
      .subscribe();

    return () => {
      subscription.unsubscribe();
      supabase.removeChannel(channel);
    };
  }, []);

  const fetchPosts = async () => {
    setLoading(true);
    const { data, error } = await supabase
      .from("memorial_posts")
      .select("*")
      .order("created_at", { ascending: false });

    if (error) {
      toast({
        title: tr("a.7f2f6a15cf"),
        description: tr("a.c1f2701818"),
        variant: "destructive",
      });
    } else {
      // Fetch profile data and like status for each post
      const postsWithProfiles = await Promise.all(
        (data || []).map(async (post) => {
          const { data: profile } = await supabase
            .from("public_profiles")
            .select("full_name, avatar_url")
            .eq("id", post.user_id)
            .single();
          
          // Check if current user has liked this post
          let isLikedByUser = false;
          if (user) {
            const { data: likeData } = await supabase
              .from("memorial_likes")
              .select("id")
              .eq("post_id", post.id)
              .eq("user_id", user.id)
              .single();
            
            isLikedByUser = !!likeData;
          }
          
          return {
            ...post,
            profiles: profile || { full_name: null, avatar_url: null },
            isLikedByUser
          };
        })
      );
      setPosts(postsWithProfiles);
    }
    setLoading(false);
  };

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      setMediaFile(file);
      const reader = new FileReader();
      reader.onloadend = () => {
        setMediaPreview(reader.result as string);
      };
      reader.readAsDataURL(file);
    }
  };

  const uploadMedia = async (file: File): Promise<string | null> => {
    const fileExt = file.name.split(".").pop();
    const fileName = `${Date.now()}-${crypto.randomUUID()}.${fileExt}`;
    const filePath = `${user?.id}/posts/${fileName}`;

    const { error: uploadError } = await supabase.storage
      .from("memorial_uploads")
      .upload(filePath, file);

    if (uploadError) {
      toast({
        title: tr("a.19699254ac"),
        description: uploadError.message,
        variant: "destructive",
      });
      return null;
    }

    const { data } = supabase.storage
      .from("memorial_uploads")
      .getPublicUrl(filePath);

    return data.publicUrl;
  };

  const handleCreatePost = async () => {
    if (!user) {
      toast({
        title: tr("a.fbbe499440"),
        description: tr("a.db07b31f7c"),
        variant: "destructive",
      });
      return;
    }

    if (!caption && !mediaFile) {
      toast({
        title: tr("a.4ef1340d96"),
        description: tr("a.3f686dcfc9"),
        variant: "destructive",
      });
      return;
    }

    setUploading(true);

    let mediaUrl = null;
    if (mediaFile) {
      mediaUrl = await uploadMedia(mediaFile);
      if (!mediaUrl) {
        setUploading(false);
        return;
      }
    }

    const { error } = await supabase
      .from("memorial_posts")
      .insert({
        user_id: user.id,
        caption,
        location: location || null,
        media_url: mediaUrl,
      });

    if (error) {
      toast({
        title: tr("a.7f2f6a15cf"),
        description: tr("a.3350fd7062"),
        variant: "destructive",
      });
    } else {
      toast({
        title: tr("a.42a8f651d7"),
        description: tr("a.31d9e7c042"),
      });
      setCaption("");
      setLocation("");
      setMediaFile(null);
      setMediaPreview(null);
      fetchPosts();
    }

    setUploading(false);
  };

  const handleToggleLike = async (postId: string, isLiked: boolean) => {
    if (!user) {
      toast({
        title: tr("a.fbbe499440"),
        description: tr("a.a4ee9ce209"),
        variant: "destructive",
      });
      return;
    }

    if (isLiked) {
      // Unlike
      const { error } = await supabase
        .from("memorial_likes")
        .delete()
        .eq("post_id", postId)
        .eq("user_id", user.id);

      if (error) {
        toast({
          title: tr("a.7f2f6a15cf"),
          description: tr("a.e094518e68"),
          variant: "destructive",
        });
      }
    } else {
      // Like
      const { error } = await supabase
        .from("memorial_likes")
        .insert({
          post_id: postId,
          user_id: user.id,
        });

      if (error) {
        toast({
          title: tr("a.7f2f6a15cf"),
          description: tr("a.ad0e341a0a"),
          variant: "destructive",
        });
      }
    }

    // Refresh posts to update like counts
    fetchPosts();
  };

  const getUserInitials = (name: string | null, email?: string) => {
    if (name) {
      return name.split(' ').map(n => n[0]).join('').toUpperCase().slice(0, 2);
    }
    return email?.[0].toUpperCase() || 'U';
  };

  return (
    <div className="min-h-screen bg-gradient-to-b from-background to-muted/20">
      <div className="container mx-auto px-4 py-8 max-w-4xl">
        {/* Header */}
        <div className="text-center mb-8 animate-fade-in">
          <h1 className="text-4xl font-bold mb-2 bg-gradient-to-r from-primary to-primary/60 bg-clip-text text-transparent">
            {tr("a.018514a3d5")}
          </h1>
          <p className="text-muted-foreground">{tr("a.86e6d48cfc")}</p>
        </div>

        {/* Create Post Section */}
        {user && (
          <Card className="p-6 mb-8 shadow-elegant animate-scale-in">
            <h2 className="text-xl font-semibold mb-4">{tr("a.f57ba92cd5")}</h2>
            
            <div className="space-y-4">
              <Textarea
                placeholder={tr("a.cfa2fa30aa")}
                value={caption}
                onChange={(e) => setCaption(e.target.value)}
                className="min-h-[100px] resize-none"
              />

              <div className="flex gap-2">
                <div className="flex-1">
                  <div className="relative">
                    <MapPin className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                    <Input
                      placeholder={tr("a.80fb1d443b")}
                      value={location}
                      onChange={(e) => setLocation(e.target.value)}
                      className="pl-10"
                    />
                  </div>
                </div>
              </div>

              <div className="space-y-2">
                <label className="flex items-center gap-2 cursor-pointer">
                  <input
                    type="file"
                    accept="image/*,video/*"
                    onChange={handleFileChange}
                    className="hidden"
                    id="media-upload"
                  />
                  <Button
                    type="button"
                    variant="outline"
                    size="sm"
                    onClick={() => document.getElementById("media-upload")?.click()}
                  >
                    <ImageIcon className="h-4 w-4 mr-2" />
                    {tr("a.ede788a98f")}
                  </Button>
                </label>

                {mediaPreview && (
                  <div className="relative rounded-lg overflow-hidden">
                    <img
                      src={mediaPreview}
                      alt={tr("a.f1fbb2b43d")}
                      className="w-full h-48 object-cover"
                    />
                    <Button
                      variant="destructive"
                      size="sm"
                      className="absolute top-2 right-2"
                      onClick={() => {
                        setMediaFile(null);
                        setMediaPreview(null);
                      }}
                    >
                      {tr("a.e963907dac")}
                    </Button>
                  </div>
                )}
              </div>

              <Button
                onClick={handleCreatePost}
                disabled={uploading}
                className="w-full"
              >
                {uploading ? (
                  <>
                    <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                    {tr("a.5b25b6526d")}
                  </>
                ) : (
                  tr("a.1659a83bd3")
                )}
              </Button>
            </div>
          </Card>
        )}

        {/* Posts Feed */}
        <div className="space-y-6">
          {loading ? (
            <div className="text-center py-12">
              <Loader2 className="h-8 w-8 animate-spin mx-auto text-primary" />
              <p className="text-muted-foreground mt-2">{tr("a.81024242cd")}</p>
            </div>
          ) : posts.length === 0 ? (
            <Card className="p-12 text-center">
              <p className="text-muted-foreground">{tr("a.7bc6db8146")}</p>
            </Card>
          ) : (
            posts.map((post, index) => (
              <Card
                key={post.id}
                className="overflow-hidden shadow-elegant hover:shadow-lg transition-all duration-300 animate-fade-in"
                style={{ animationDelay: `${index * 100}ms` }}
              >
                {/* Post Header */}
                <div className="p-4 flex items-center gap-3">
                  <Avatar className="h-10 w-10">
                    <AvatarImage src={post.profiles?.avatar_url || ""} />
                    <AvatarFallback>
                      {getUserInitials(post.profiles?.full_name || null)}
                    </AvatarFallback>
                  </Avatar>
                  <div className="flex-1">
                    <p className="font-semibold">
                      {post.profiles?.full_name || tr("a.9bed510400")}
                    </p>
                    <p className="text-sm text-muted-foreground">
                      {formatDistanceToNow(new Date(post.created_at), { addSuffix: true })}
                    </p>
                  </div>
                </div>

                {/* Post Media */}
                {post.media_url && (
                  <div className="relative">
                    <img
                      src={post.media_url}
                      alt={tr("a.89c8a2851d")}
                      className="w-full h-auto max-h-[500px] object-cover"
                    />
                  </div>
                )}

                {/* Post Content */}
                <div className="p-4 space-y-3">
                  {post.caption && (
                    <p className="text-foreground whitespace-pre-wrap">{post.caption}</p>
                  )}

                  {post.location && (
                    <div className="flex items-center gap-2 text-muted-foreground text-sm">
                      <MapPin className="h-4 w-4" />
                      <span>{post.location}</span>
                    </div>
                  )}

                  {/* Post Actions */}
                  <div className="flex items-center gap-4 pt-2 border-t border-border">
                    <Button
                      variant="ghost"
                      size="sm"
                      className={cn(
                        "gap-2 transition-all duration-200 hover:scale-110",
                        post.isLikedByUser && "text-red-500"
                      )}
                      onClick={() => handleToggleLike(post.id, post.isLikedByUser || false)}
                    >
                      <Heart
                        className={cn(
                          "h-4 w-4 transition-all",
                          post.isLikedByUser && "fill-current"
                        )}
                      />
                      <span className="text-sm">{post.likes_count}</span>
                    </Button>
                    <Button
                      variant="ghost"
                      size="sm"
                      className="gap-2 transition-all duration-200 hover:scale-110"
                      onClick={() => setSelectedPostForComments(post.id)}
                    >
                      <MessageCircle className="h-4 w-4" />
                      <span className="text-sm">{post.comments_count}</span>
                    </Button>
                    <TooltipProvider>
                      <Tooltip>
                        <TooltipTrigger asChild>
                          <Button
                            variant="ghost"
                            size="sm"
                            onClick={() => user ? setSelectedPostForShare(post) : null}
                            disabled={!user}
                            className="gap-2 transition-all duration-200 hover:scale-110"
                          >
                            <Share2 className="h-4 w-4" />
                            <span className="text-sm">{tr("a.09ca55ca52")}</span>
                          </Button>
                        </TooltipTrigger>
                        {!user && (
                          <TooltipContent>
                            <p>{tr("a.da87c0fbd5")}</p>
                          </TooltipContent>
                        )}
                      </Tooltip>
                    </TooltipProvider>
                      </div>
                </div>
              </Card>
            ))
          )}
        </div>

        {/* Link to Memorial Wall */}
        <div className="text-center mt-12">
          <Button variant="outline" onClick={() => window.location.href = "/memorials"}>
            {tr("a.9643588f17")}
          </Button>
        </div>
      </div>

      {/* Comments Modal */}
      <CommentsModal
        open={!!selectedPostForComments}
        onOpenChange={(open) => !open && setSelectedPostForComments(null)}
        postId={selectedPostForComments || ""}
        user={user}
      />

      {/* Share Modal */}
      <SharePostModal
        open={!!selectedPostForShare}
        onOpenChange={(open) => !open && setSelectedPostForShare(null)}
        postId={selectedPostForShare?.id || ""}
        postCaption={selectedPostForShare?.caption || ""}
      />
    </div>
  );
};

export default Timeline;
