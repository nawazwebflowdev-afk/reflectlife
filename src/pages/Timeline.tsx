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
        title: "Error",
        description: "Failed to load posts",
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
    const fileName = `${user?.id}-${Date.now()}.${fileExt}`;
    const filePath = `posts/${fileName}`;

    const { error: uploadError } = await supabase.storage
      .from("memorial_uploads")
      .upload(filePath, file);

    if (uploadError) {
      toast({
        title: "Upload Error",
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
        title: "Authentication Required",
        description: "Please sign in to create posts",
        variant: "destructive",
      });
      return;
    }

    if (!caption && !mediaFile) {
      toast({
        title: "Content Required",
        description: "Please add a caption or media",
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
        title: "Error",
        description: "Failed to create post",
        variant: "destructive",
      });
    } else {
      toast({
        title: "Success",
        description: "Memory shared successfully!",
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
        title: "Authentication Required",
        description: "Please sign in to like posts",
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
          title: "Error",
          description: "Failed to unlike",
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
          title: "Error",
          description: "Failed to like",
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
            Timeline
          </h1>
          <p className="text-muted-foreground">Share and cherish memories together</p>
        </div>

        {/* Create Post Section */}
        {user && (
          <Card className="p-6 mb-8 shadow-elegant animate-scale-in">
            <h2 className="text-xl font-semibold mb-4">Share a Memory</h2>
            
            <div className="space-y-4">
              <Textarea
                placeholder="Write about your memory..."
                value={caption}
                onChange={(e) => setCaption(e.target.value)}
                className="min-h-[100px] resize-none"
              />

              <div className="flex gap-2">
                <div className="flex-1">
                  <div className="relative">
                    <MapPin className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                    <Input
                      placeholder="Add location"
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
                    Add Photo/Video
                  </Button>
                </label>

                {mediaPreview && (
                  <div className="relative rounded-lg overflow-hidden">
                    <img
                      src={mediaPreview}
                      alt="Preview"
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
                      Remove
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
                    Sharing...
                  </>
                ) : (
                  "Share Memory"
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
              <p className="text-muted-foreground mt-2">Loading memories...</p>
            </div>
          ) : posts.length === 0 ? (
            <Card className="p-12 text-center">
              <p className="text-muted-foreground">No memories shared yet. Be the first!</p>
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
                      {post.profiles?.full_name || "Anonymous"}
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
                      alt="Memory"
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
                            <span className="text-sm">Share</span>
                          </Button>
                        </TooltipTrigger>
                        {!user && (
                          <TooltipContent>
                            <p>Sign in to share memories</p>
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
            Go to Memorial Wall
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
    </div>
  );
};

export default Timeline;
