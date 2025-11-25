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
import { Mail, MessageCircle, Users, Loader2 } from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import { supabase } from "@/integrations/supabase/client";
import { z } from "zod";

interface ShareMemorialModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  memorialId: string;
  memorialName: string;
  memorialDescription?: string;
}

const emailSchema = z.string().email("Please enter a valid email address");

export const ShareMemorialModal = ({
  open,
  onOpenChange,
  memorialId,
  memorialName,
  memorialDescription,
}: ShareMemorialModalProps) => {
  const [shareMethod, setShareMethod] = useState<"email" | "whatsapp" | "internal" | null>(null);
  const [recipientEmail, setRecipientEmail] = useState("");
  const [loading, setLoading] = useState(false);
  const { toast } = useToast();

  const memorialUrl = `${window.location.origin}/memorial/${memorialId}`;

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
      
      const { error } = await supabase.functions.invoke("send-memorial-invitation", {
        body: {
          recipientEmail,
          memorialId,
          memorialName,
          memorialDescription: memorialDescription || "",
          memorialUrl,
          senderName: user?.user_metadata?.full_name || "A Reflectlife user",
        },
      });

      if (error) throw error;

      toast({
        title: "Memorial shared successfully! 💌",
        description: `Invitation sent to ${recipientEmail}`,
      });
      onOpenChange(false);
      setRecipientEmail("");
    } catch (error: any) {
      toast({
        title: "Unable to send invitation",
        description: error.message || "Failed to share memorial. Please try again.",
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  };

  const handleWhatsAppShare = () => {
    const message = encodeURIComponent(
      `I'd like to share this memorial with you from Reflectlife:\n\n${memorialName}\n\n${memorialDescription ? memorialDescription + '\n\n' : ''}View and add your tribute here: ${memorialUrl}`
    );
    window.open(`https://wa.me/?text=${message}`, "_blank");
    toast({
      title: "Memorial shared successfully! 💌",
      description: "Opening WhatsApp to complete sharing",
    });
    onOpenChange(false);
  };

  const handleInternalShare = async () => {
    try {
      setLoading(true);
      
      // Check if recipient exists in the system
      const { data: recipientProfile, error: profileError } = await supabase
        .from("profiles")
        .select("id, email")
        .eq("email", recipientEmail)
        .single();

      if (profileError || !recipientProfile) {
        toast({
          title: "User not found",
          description: "This email is not registered on Reflectlife. Use Email Share to invite them.",
          variant: "destructive",
        });
        setLoading(false);
        return;
      }

      const { data: { user } } = await supabase.auth.getUser();

      // Create notification
      const { error: notificationError } = await supabase
        .from("notifications")
        .insert({
          user_id: recipientProfile.id,
          actor_id: user?.id,
          type: "memorial_share",
          post_id: memorialId,
        });

      if (notificationError) throw notificationError;

      // Also send email
      const { error: emailError } = await supabase.functions.invoke("send-memorial-invitation", {
        body: {
          recipientEmail,
          memorialId,
          memorialName,
          memorialDescription: memorialDescription || "",
          memorialUrl,
          senderName: user?.user_metadata?.full_name || "A Reflectlife user",
        },
      });

      if (emailError) console.error("Email send error:", emailError);

      toast({
        title: "Memorial shared successfully! 💌",
        description: `Notification sent to ${recipientProfile.email}`,
      });
      onOpenChange(false);
      setRecipientEmail("");
    } catch (error: any) {
      toast({
        title: "Unable to share",
        description: error.message || "Failed to share memorial. Please try again.",
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
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
          <DialogTitle>Share Memorial</DialogTitle>
          <DialogDescription>
            Invite others to view and honor {memorialName}
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
                  Send invitation to anyone via email
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

            <Button
              onClick={() => setShareMethod("internal")}
              className="w-full justify-start gap-3 h-auto py-4"
              variant="outline"
            >
              <Users className="h-5 w-5" />
              <div className="text-left">
                <div className="font-semibold">Share with Reflectlife User</div>
                <div className="text-xs text-muted-foreground">
                  Notify a registered user on the platform
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
                Send Invitation
              </Button>
            </div>
          </div>
        ) : shareMethod === "internal" ? (
          <div className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="internal-email">User's Email</Label>
              <Input
                id="internal-email"
                type="email"
                placeholder="user@example.com"
                value={recipientEmail}
                onChange={(e) => setRecipientEmail(e.target.value)}
                disabled={loading}
              />
              <p className="text-xs text-muted-foreground">
                This will send both an in-app notification and an email
              </p>
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
                onClick={handleInternalShare}
                disabled={loading || !recipientEmail}
                className="flex-1"
              >
                {loading && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                Send Notification
              </Button>
            </div>
          </div>
        ) : (
          <div className="space-y-4">
            <p className="text-sm text-muted-foreground">
              Clicking continue will open WhatsApp with a pre-filled invitation message.
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
