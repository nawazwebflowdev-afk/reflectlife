import { useState, useEffect } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Loader2, Send } from "lucide-react";
import { formatDistanceToNow } from "@/lib/dateFormat";
import type { User } from "@supabase/supabase-js";

import { tr } from "@/i18n/tr";
interface Comment {
  id: string;
  post_id: string;
  user_id: string;
  content: string;
  created_at: string;
  profiles?: {
    full_name: string | null;
    avatar_url: string | null;
  };
}

interface CommentsModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  postId: string;
  user: User | null;
}

export const CommentsModal = ({ open, onOpenChange, postId, user }: CommentsModalProps) => {
  const [comments, setComments] = useState<Comment[]>([]);
  const [loading, setLoading] = useState(true);
  const [newComment, setNewComment] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const { toast } = useToast();

  useEffect(() => {
    if (open) {
      fetchComments();
      
      // Set up real-time subscription
      const channel = supabase
        .channel(`comments-${postId}`)
        .on(
          'postgres_changes',
          {
            event: '*',
            schema: 'public',
            table: 'memorial_comments',
            filter: `post_id=eq.${postId}`
          },
          () => {
            fetchComments();
          }
        )
        .subscribe();

      return () => {
        supabase.removeChannel(channel);
      };
    }
  }, [open, postId]);

  const fetchComments = async (showLoading = true) => {
    if (showLoading) setLoading(true);
    const { data, error } = await supabase
      .from("memorial_comments")
      .select("*")
      .eq("post_id", postId)
      .order("created_at", { ascending: true });

    if (error) {
      toast({
        title: tr("a.7f2f6a15cf"),
        description: tr("a.f9ed41b0fb"),
        variant: "destructive",
      });
    } else {
      // Fetch profile data for each comment
      const commentsWithProfiles = await Promise.all(
        (data || []).map(async (comment) => {
          const { data: profile } = await supabase
            .from("public_profiles")
            .select("full_name, avatar_url")
            .eq("id", comment.user_id)
            .single();
          
          return {
            ...comment,
            profiles: profile || { full_name: null, avatar_url: null }
          };
        })
      );
      setComments(commentsWithProfiles);
    }
    setLoading(false);
  };

  const handleSubmitComment = async () => {
    if (!user) {
      toast({
        title: tr("a.fbbe499440"),
        description: tr("a.1f8c2cd629"),
        variant: "destructive",
      });
      return;
    }

    if (!newComment.trim()) {
      toast({
        title: tr("a.02b254f09e"),
        description: tr("a.ace082b3a7"),
        variant: "destructive",
      });
      return;
    }

    setSubmitting(true);

    const { error } = await supabase
      .from("memorial_comments")
      .insert({
        post_id: postId,
        user_id: user.id,
        content: newComment.trim(),
      });

    if (error) {
      toast({
        title: tr("a.7f2f6a15cf"),
        description: tr("a.9008b63183"),
        variant: "destructive",
      });
    } else {
      setNewComment("");
      await fetchComments(false);
      toast({
        title: tr("a.2bf7635c36"),
        description: tr("a.4289e7d501"),
      });
    }

    setSubmitting(false);
  };

  const getUserInitials = (name: string | null) => {
    if (name) {
      return name.split(' ').map(n => n[0]).join('').toUpperCase().slice(0, 2);
    }
    return 'U';
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-2xl max-h-[80vh] flex flex-col backdrop-blur-lg bg-background/95 animate-fade-in">
        <DialogHeader>
          <DialogTitle>{tr("a.fce06e20e5")}</DialogTitle>
        </DialogHeader>

        <ScrollArea className="flex-1 pr-4">
          {loading ? (
            <div className="flex justify-center py-8">
              <Loader2 className="h-6 w-6 animate-spin text-primary" />
            </div>
          ) : comments.length === 0 ? (
            <div className="text-center py-8 text-muted-foreground">
              {tr("a.ba5c0dff08")}
            </div>
          ) : (
            <div className="space-y-4">
              {comments.map((comment) => (
                <div
                  key={comment.id}
                  className="flex gap-3 animate-fade-in"
                >
                  <Avatar className="h-10 w-10">
                    <AvatarImage src={comment.profiles?.avatar_url || ""} />
                    <AvatarFallback>
                      {getUserInitials(comment.profiles?.full_name || null)}
                    </AvatarFallback>
                  </Avatar>
                  <div className="flex-1">
                    <div className="bg-muted/50 rounded-lg p-3">
                      <p className="font-semibold text-sm">
                        {comment.profiles?.full_name || tr("a.9bed510400")}
                      </p>
                      <p className="text-foreground mt-1">{comment.content}</p>
                    </div>
                    <p className="text-xs text-muted-foreground mt-1 ml-3">
                      {formatDistanceToNow(new Date(comment.created_at), { addSuffix: true })}
                    </p>
                  </div>
                </div>
              ))}
            </div>
          )}
        </ScrollArea>

        {user && (
          <div className="border-t pt-4">
            <div className="flex gap-2">
              <Textarea
                placeholder={tr("a.7b01f9dc74")}
                value={newComment}
                onChange={(e) => setNewComment(e.target.value)}
                className="min-h-[80px] resize-none"
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
                className="self-end"
              >
                {submitting ? (
                  <Loader2 className="h-4 w-4 animate-spin" />
                ) : (
                  <Send className="h-4 w-4" />
                )}
              </Button>
            </div>
          </div>
        )}
      </DialogContent>
    </Dialog>
  );
};
