import { useState, useEffect } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Separator } from "@/components/ui/separator";
import { Heart, MessageCircle, MapPin, Loader2, Send } from "lucide-react";
import { formatDistanceToNow } from "date-fns";
import type { User } from "@supabase/supabase-js";

interface Post {
  id: string;
  caption: string | null;
  media_url: string | null;
  location: string | null;
  likes_count: number | null;
  comments_count: number | null;
  created_at: string;
  user_id: string;
  profiles?: {
    full_name: string | null;
    username: string | null;
    avatar_url: string | null;
  };
}

interface Comment {
  id: string;
  content: string;
  created_at: string;
  user_id: string;
  profile?: {
    full_name: string | null;
    avatar_url: string | null;
  };
}

interface PostDetailModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  post: Post | null;
  user: User | null;
  onPostUpdated?: () => void;
}

const PostDetailModal = ({
  open,
  onOpenChange,
  post,
  user,
  onPostUpdated,
}: PostDetailModalProps) => {
  const [comments, setComments] = useState<Comment[]>([]);
  const [loadingComments, setLoadingComments] = useState(false);
  const [newComment, setNewComment] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const [liked, setLiked] = useState(false);
  const [likesCount, setLikesCount] = useState(0);
  const [commentsCount, setCommentsCount] = useState(0);
  const { toast } = useToast();

  useEffect(() => {
    if (open && post) {
      setLikesCount(post.likes_count || 0);
      setCommentsCount(post.comments_count || 0);
      fetchComments();
      if (user) checkIfLiked();
    }
  }, [open, post?.id]);

  const checkIfLiked = async () => {
    if (!user || !post) return;
    const { data } = await supabase
      .from("memorial_likes")
      .select("id")
      .eq("post_id", post.id)
      .eq("user_id", user.id)
      .maybeSingle();
    setLiked(!!data);
  };

  const fetchComments = async () => {
    if (!post) return;
    setLoadingComments(true);
    const { data, error } = await supabase
      .from("memorial_comments")
      .select("*")
      .eq("post_id", post.id)
      .order("created_at", { ascending: true });

    if (!error && data) {
      const withProfiles = await Promise.all(
        data.map(async (c) => {
          const { data: profile } = await supabase
            .from("public_profiles")
            .select("full_name, avatar_url")
            .eq("id", c.user_id)
            .maybeSingle();
          return { ...c, profile: profile || undefined };
        })
      );
      setComments(withProfiles);
    }
    setLoadingComments(false);
  };

  const handleLike = async () => {
    if (!user) {
      toast({ title: "Sign in to like posts", variant: "destructive" });
      return;
    }
    if (!post) return;

    if (liked) {
      await supabase
        .from("memorial_likes")
        .delete()
        .eq("post_id", post.id)
        .eq("user_id", user.id);
      setLiked(false);
      setLikesCount((c) => Math.max(0, c - 1));
    } else {
      await supabase
        .from("memorial_likes")
        .insert({ post_id: post.id, user_id: user.id });
      setLiked(true);
      setLikesCount((c) => c + 1);
    }
    onPostUpdated?.();
  };

  const handleSubmitComment = async () => {
    if (!user) {
      toast({ title: "Sign in to comment", variant: "destructive" });
      return;
    }
    if (!post || !newComment.trim()) return;

    setSubmitting(true);
    const { error } = await supabase
      .from("memorial_comments")
      .insert({ post_id: post.id, user_id: user.id, content: newComment.trim() });

    if (error) {
      toast({ title: "Error posting comment", description: error.message, variant: "destructive" });
    } else {
      setNewComment("");
      setCommentsCount((c) => c + 1);
      await fetchComments();
      onPostUpdated?.();
    }
    setSubmitting(false);
  };

  const getInitials = (name: string | null | undefined) => {
    if (!name) return "?";
    return name.split(" ").map((n) => n[0]).join("").toUpperCase().slice(0, 2);
  };

  if (!post) return null;

  const authorName = post.profiles?.full_name || post.profiles?.username || "Anonymous";

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-2xl max-h-[90vh] flex flex-col p-0 gap-0 overflow-hidden">
        {/* Header */}
        <DialogHeader className="px-6 pt-6 pb-4">
          <div className="flex items-center gap-3">
            <Avatar className="h-12 w-12">
              <AvatarImage src={post.profiles?.avatar_url || ""} />
              <AvatarFallback>{getInitials(authorName)}</AvatarFallback>
            </Avatar>
            <div className="flex-1">
              <DialogTitle className="text-base font-semibold">{authorName}</DialogTitle>
              <div className="flex items-center gap-2 text-sm text-muted-foreground">
                <span>{formatDistanceToNow(new Date(post.created_at), { addSuffix: true })}</span>
                {post.location && (
                  <>
                    <span>•</span>
                    <span className="flex items-center gap-1">
                      <MapPin className="h-3 w-3" />
                      {post.location}
                    </span>
                  </>
                )}
              </div>
            </div>
          </div>
        </DialogHeader>

        <ScrollArea className="flex-1 overflow-y-auto">
          <div className="px-6">
            {/* Caption */}
            {post.caption && (
              <p className="text-foreground leading-relaxed mb-4 text-base">
                {post.caption}
              </p>
            )}

            {/* Media */}
            {post.media_url && (
              <div className="rounded-lg overflow-hidden mb-4">
                <img
                  src={post.media_url}
                  alt="Memory"
                  className="w-full h-auto max-h-[400px] object-cover"
                />
              </div>
            )}

            {/* Like & Comment Counts */}
            <div className="flex items-center gap-6 py-3">
              <button
                onClick={handleLike}
                className={`flex items-center gap-2 transition-colors ${
                  liked ? "text-red-500" : "text-muted-foreground hover:text-red-500"
                }`}
              >
                <Heart className={`h-5 w-5 ${liked ? "fill-current" : ""}`} />
                <span className="text-sm font-medium">{likesCount}</span>
              </button>
              <div className="flex items-center gap-2 text-muted-foreground">
                <MessageCircle className="h-5 w-5" />
                <span className="text-sm font-medium">{commentsCount}</span>
              </div>
            </div>

            <Separator />

            {/* Comments Section */}
            <div className="py-4">
              <h4 className="text-sm font-semibold text-muted-foreground uppercase tracking-wide mb-4">
                Comments
              </h4>

              {loadingComments ? (
                <div className="flex justify-center py-6">
                  <Loader2 className="h-5 w-5 animate-spin text-primary" />
                </div>
              ) : comments.length === 0 ? (
                <p className="text-sm text-muted-foreground text-center py-6">
                  No comments yet. Be the first to share your thoughts.
                </p>
              ) : (
                <div className="space-y-4">
                  {comments.map((comment) => (
                    <div key={comment.id} className="flex gap-3">
                      <Avatar className="h-8 w-8">
                        <AvatarImage src={comment.profile?.avatar_url || ""} />
                        <AvatarFallback className="text-xs">
                          {getInitials(comment.profile?.full_name)}
                        </AvatarFallback>
                      </Avatar>
                      <div className="flex-1">
                        <div className="bg-muted/50 rounded-lg p-3">
                          <p className="font-semibold text-sm">
                            {comment.profile?.full_name || "Anonymous"}
                          </p>
                          <p className="text-foreground text-sm mt-1">{comment.content}</p>
                        </div>
                        <p className="text-xs text-muted-foreground mt-1 ml-3">
                          {formatDistanceToNow(new Date(comment.created_at), { addSuffix: true })}
                        </p>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          </div>
        </ScrollArea>

        {/* Comment Input */}
        {user ? (
          <div className="border-t px-6 py-4">
            <div className="flex gap-2">
              <Textarea
                placeholder="Write a comment..."
                value={newComment}
                onChange={(e) => setNewComment(e.target.value)}
                className="min-h-[60px] resize-none"
                onKeyDown={(e) => {
                  if (e.key === "Enter" && !e.shiftKey) {
                    e.preventDefault();
                    handleSubmitComment();
                  }
                }}
              />
              <Button
                onClick={handleSubmitComment}
                disabled={submitting || !newComment.trim()}
                size="icon"
                className="self-end h-10 w-10"
              >
                {submitting ? (
                  <Loader2 className="h-4 w-4 animate-spin" />
                ) : (
                  <Send className="h-4 w-4" />
                )}
              </Button>
            </div>
          </div>
        ) : (
          <div className="border-t px-6 py-4 text-center">
            <p className="text-sm text-muted-foreground">
              <a href="/login" className="text-primary hover:underline font-medium">Sign in</a> to like and comment
            </p>
          </div>
        )}
      </DialogContent>
    </Dialog>
  );
};

export default PostDetailModal;
