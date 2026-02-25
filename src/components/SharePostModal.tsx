import { useState } from "react";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Mail, MessageCircle, Loader2 } from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import { supabase } from "@/integrations/supabase/client";
import { z } from "zod";

interface SharePostModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  postId: string;
  postCaption: string;
}

const emailSchema = z.string().email("Please enter a valid email address");

export const SharePostModal = ({
  open,
  onOpenChange,
  postId,
  postCaption,
}: SharePostModalProps) => {
  const [shareMethod, setShareMethod] = useState<"email" | "whatsapp" | null>(null);
  const [recipientEmail, setRecipientEmail] = useState("");
  const [loading, setLoading] = useState(false);
  const { toast } = useToast();

  const handleEmailShare = async () => {
    try {
      const validation = emailSchema.safeParse(recipientEmail);
      if (!validation.success) {
        toast({
          title: "Invalid Email",
          description: validation.error.errors[0].message,
          variant: "destructive",
        });
        return;
      }

      setLoading(true);
      const { data: { user } } = await supabase.auth.getUser();
      
      const { error } = await supabase.functions.invoke("send-share-email", {
        body: {
          recipientEmail,
          postId,
          postCaption,
          senderName: user?.user_metadata?.full_name || "A Reflectlife user",
        },
      });

      if (error) throw error;

      toast({
        title: "Post shared successfully! 💌",
        description: `Email sent to ${recipientEmail}`,
      });
      onOpenChange(false);
      setRecipientEmail("");
    } catch (error: any) {
      toast({
        title: "Unable to send message",
        description: error.message || "Failed to share via email. Please try again.",
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  };

  const handleWhatsAppShare = () => {
    const postUrl = `${window.location.origin}/timeline#post-${postId}`;
    const message = encodeURIComponent(
      `I'd like to share this memory with you from Reflectlife:\n\n${postCaption || "A special memory"}\n\n${postUrl}`
    );
    window.open(`https://wa.me/?text=${message}`, "_blank");
    toast({
      title: "Post shared successfully! 💌",
      description: "Opening WhatsApp to complete sharing",
    });
    onOpenChange(false);
  };

  const resetModal = () => {
    setShareMethod(null);
    setRecipientEmail("");
  };

  return (
    <Dialog open={open} onOpenChange={(isOpen) => {
      onOpenChange(isOpen);
      if (!isOpen) resetModal();
    }}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle>Share Memory</DialogTitle>
          <DialogDescription>
            Choose how you'd like to share this special memory
          </DialogDescription>
        </DialogHeader>

        {!shareMethod ? (
          <div className="flex flex-col gap-3">
            <Button
              onClick={() => setShareMethod("email")}
              className="w-full justify-start gap-3 h-auto py-4"
              variant="outline"
            >
              <Mail className="h-5 w-5" />
              <div className="text-left">
                <div className="font-semibold">Share via Email</div>
                <div className="text-xs text-muted-foreground">
                  Send this memory to a friend's inbox
                </div>
              </div>
            </Button>

            <Button
              onClick={() => setShareMethod("whatsapp")}
              className="w-full justify-start gap-3 h-auto py-4"
              variant="outline"
            >
              <MessageCircle className="h-5 w-5" />
              <div className="text-left">
                <div className="font-semibold">Share via WhatsApp</div>
                <div className="text-xs text-muted-foreground">
                  Share instantly through WhatsApp
                </div>
              </div>
            </Button>
          </div>
        ) : shareMethod === "email" ? (
          <div className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="email">Recipient's Email</Label>
              <Input
                id="email"
                type="email"
                placeholder="friend@example.com"
                value={recipientEmail}
                onChange={(e) => setRecipientEmail(e.target.value)}
                disabled={loading}
              />
            </div>
            <div className="flex gap-2">
              <Button
                variant="outline"
                onClick={resetModal}
                disabled={loading}
                className="flex-1"
              >
                Back
              </Button>
              <Button
                onClick={handleEmailShare}
                disabled={loading || !recipientEmail}
                className="flex-1"
              >
                {loading && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                Send Email
              </Button>
            </div>
          </div>
        ) : (
          <div className="space-y-4">
            <p className="text-sm text-muted-foreground">
              Clicking continue will open WhatsApp with a pre-filled message containing
              this memory.
            </p>
            <div className="flex gap-2">
              <Button
                variant="outline"
                onClick={resetModal}
                className="flex-1"
              >
                Back
              </Button>
              <Button onClick={handleWhatsAppShare} className="flex-1">
                Continue to WhatsApp
              </Button>
            </div>
          </div>
        )}
      </DialogContent>
    </Dialog>
  );
};
