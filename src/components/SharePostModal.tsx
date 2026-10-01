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

import { tr } from "@/i18n/tr";
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
          title: tr("a.cb7cce3a8e"),
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
        title: tr("a.c2b0814eff"),
        description: `Email sent to ${recipientEmail}`,
      });
      onOpenChange(false);
      setRecipientEmail("");
    } catch (error: any) {
      toast({
        title: tr("a.75f2455759"),
        description: error.message || tr("a.d3845b060d"),
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
      title: tr("a.c2b0814eff"),
      description: tr("a.64f74760f2"),
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
          <DialogTitle>{tr("a.1659a83bd3")}</DialogTitle>
          <DialogDescription>
            {tr("a.552fe443da")}
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
                <div className="font-semibold">{tr("a.03b277b752")}</div>
                <div className="text-xs text-muted-foreground">
                  {tr("a.e6fcdc96c7")}
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
                <div className="font-semibold">{tr("a.6f3eb997a8")}</div>
                <div className="text-xs text-muted-foreground">
                  {tr("a.93d31c66ff")}
                </div>
              </div>
            </Button>
          </div>
        ) : shareMethod === "email" ? (
          <div className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="email">{tr("a.d0f57d77f6")}</Label>
              <Input
                id="email"
                type="email"
                placeholder={tr("a.c7363c9f0a")}
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
                {tr("a.b52b36b726")}
              </Button>
              <Button
                onClick={handleEmailShare}
                disabled={loading || !recipientEmail}
                className="flex-1"
              >
                {loading && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                {tr("a.be4e8e2d03")}
              </Button>
            </div>
          </div>
        ) : (
          <div className="space-y-4">
            <p className="text-sm text-muted-foreground">
              {tr("a.37e866b490")}
            </p>
            <div className="flex gap-2">
              <Button
                variant="outline"
                onClick={resetModal}
                className="flex-1"
              >
                {tr("a.b52b36b726")}
              </Button>
              <Button onClick={handleWhatsAppShare} className="flex-1">
                {tr("a.8f8dd5e3eb")}
              </Button>
            </div>
          </div>
        )}
      </DialogContent>
    </Dialog>
  );
};
