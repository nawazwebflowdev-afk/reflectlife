import { useEffect, useState } from "react";
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";
import { Upload, Loader2, Mail } from "lucide-react";
import { AvatarSelector, AvatarDisplay } from "@/components/EmojiAvatarSelector";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { AVATARS } from "@/config/avatars";

import { tr } from "@/i18n/tr";
const familyRelationships = [
  "Mother", "Father", "Sister", "Brother", "Spouse",
  "Daughter", "Son", "Grandmother", "Grandfather",
  "Granddaughter", "Grandson", "Cousin", "Aunt",
  "Uncle", "Niece", "Nephew", "Other Relative",
];

const friendshipRelationships = [
  "Friend", "Best Friend", "Mentor", "Classmate",
  "Colleague", "Partner", "Acquaintance", "Other",
];

interface AddChildConnectionModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  parentConnectionId: string;
  parentConnectionType?: "family" | "friendship";
  onUpdate: () => void;
}

export const AddChildConnectionModal = ({
  open,
  onOpenChange,
  parentConnectionId,
  parentConnectionType = "family",
  onUpdate,
}: AddChildConnectionModalProps) => {
  const { toast } = useToast();
  const [loading, setLoading] = useState(false);
  const [uploading, setUploading] = useState(false);
  const [sendingInvite, setSendingInvite] = useState(false);
  const [name, setName] = useState("");
  const [relationship, setRelationship] = useState("");
  const [customRelationship, setCustomRelationship] = useState("");
  const [notes, setNotes] = useState("");
  const [details, setDetails] = useState("");
  const [imageUrl, setImageUrl] = useState("");
  const [avatarIndex, setAvatarIndex] = useState(0);
  const [connectionType, setConnectionType] = useState<"family" | "friendship">(parentConnectionType);
  const [didManuallySetConnectionType, setDidManuallySetConnectionType] = useState(false);
  const [inviteEmail, setInviteEmail] = useState("");

  const handleImageUpload = async (event: React.ChangeEvent<HTMLInputElement>) => {
    try {
      setUploading(true);
      const file = event.target.files?.[0];
      if (!file) return;

      if (!file.type.startsWith('image/')) {
        toast({
          title: tr("a.56f848f49e"),
          description: tr("a.ea5e446104"),
          variant: "destructive",
        });
        return;
      }

      const { data: { user } } = await supabase.auth.getUser();
      if (!user) throw new Error(tr("a.0c91acbae2"));

      const fileExt = file.name.split(".").pop();
      const filePath = `${user.id}/connections/${Date.now()}.${fileExt}`;

      const { error: uploadError } = await supabase.storage
        .from("profile-pictures")
        .upload(filePath, file);

      if (uploadError) throw uploadError;

      const { data: { publicUrl } } = supabase.storage
        .from("profile-pictures")
        .getPublicUrl(filePath);

      setImageUrl(publicUrl);
      toast({
        title: tr("a.82dd62753e"),
        description: tr("a.3ea18bea46"),
      });
    } catch (error: any) {
      toast({
        title: tr("a.ad0d0603e2"),
        description: error.message,
        variant: "destructive",
      });
    } finally {
      setUploading(false);
    }
  };

  useEffect(() => {
    if (!open) return;
    setConnectionType(parentConnectionType);
    setDidManuallySetConnectionType(false);
  }, [open, parentConnectionType]);

  const handleSendInvitation = async () => {
    if (!inviteEmail.trim()) {
      toast({
        title: tr("a.887c8dbb94"),
        description: tr("a.23b8381506"),
        variant: "destructive",
      });
      return;
    }

    setSendingInvite(true);
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) throw new Error(tr("a.0c91acbae2"));

      const { data: profile } = await supabase
        .from("profiles")
        .select("full_name")
        .eq("id", user.id)
        .single();

      const { data, error } = await supabase.functions.invoke("send-invitation", {
        body: {
          recipientEmail: inviteEmail,
          personName: name || "a loved one",
          senderName: profile?.full_name || "Someone",
          connectionId: parentConnectionId,
          senderId: user.id,
        },
      });

      if (error) throw error;

      toast({
        title: tr("a.bc6a44ee4f"),
        description: `${inviteEmail} will receive an invitation to contribute`,
      });
      setInviteEmail("");
    } catch (error: any) {
      toast({
        title: tr("a.b3b04ef8c1"),
        description: error.message,
        variant: "destructive",
      });
    } finally {
      setSendingInvite(false);
    }
  };

  const handleSubmit = async () => {
    const finalRelationship = relationship === "__custom" ? customRelationship.trim() : relationship;
    if (!name.trim() || !finalRelationship) {
      toast({
        title: tr("a.67cc34b1cd"),
        description: tr("a.d5ca2188b0"),
        variant: "destructive",
      });
      return;
    }

    setLoading(true);
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) throw new Error(tr("a.0c91acbae2"));

      // Ensure parent exists before creating child connection
      const { data: parentConnection, error: parentError } = await supabase
        .from("connections")
        .select("id")
        .eq("id", parentConnectionId)
        .maybeSingle();

      if (parentError) throw parentError;
      if (!parentConnection) throw new Error(tr("a.96b47e672f"));

      let finalImageUrl = imageUrl;
      
      // If no uploaded image but avatar selected, upload avatar to storage
      if (!finalImageUrl && avatarIndex >= 0) {
        try {
          const avatarSrc = AVATARS[avatarIndex % AVATARS.length];
          const response = await fetch(avatarSrc);
          const blob = await response.blob();
          const filePath = `${user.id}/connections/${Date.now()}.png`;
          const { error: uploadError } = await supabase.storage
            .from("profile-pictures")
            .upload(filePath, blob, { upsert: true });
          if (!uploadError) {
            const { data: urlData } = supabase.storage
              .from("profile-pictures")
              .getPublicUrl(filePath);
            finalImageUrl = urlData.publicUrl;
          }
        } catch (e) {
          console.error("Avatar upload error:", e);
        }
      }

      const { error } = await supabase.from("connections").insert({
        owner_id: user.id,
        parent_connection_id: parentConnectionId,
        related_person_name: name,
        relationship_type: finalRelationship,
        connection_type: connectionType,
        image_url: finalImageUrl,
        x_pos: null,
        y_pos: null,
      });

      if (error) throw error;

      toast({
        title: tr("a.bc5dd14b31"),
        description: `${name} has been added to the tree`,
      });

      onUpdate();
      onOpenChange(false);
      resetForm();
    } catch (error: any) {
      toast({
        title: tr("a.f49805ab54"),
        description: error.message,
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  };

  const resetForm = () => {
    setName("");
    setRelationship("");
    setCustomRelationship("");
    setNotes("");
    setDetails("");
    setImageUrl("");
    setAvatarIndex(0);
    setInviteEmail("");
    setConnectionType(parentConnectionType);
    setDidManuallySetConnectionType(false);
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-[550px] max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>{tr("a.f8516b6bc6")}</DialogTitle>
          <DialogDescription>
            {tr("a.c27a243db3")}
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-6 py-4">
          {/* Avatar/Image Section */}
          <div className="flex flex-col items-center gap-4">
            {imageUrl ? (
              <Avatar className="h-20 w-20">
                <AvatarImage src={imageUrl} />
                <AvatarFallback>{name[0] || "?"}</AvatarFallback>
              </Avatar>
            ) : (
              <div className="h-20 w-20 rounded-full bg-muted flex items-center justify-center">
                <span className="text-muted-foreground text-sm">{tr("a.fc5e5bdcd5")}</span>
              </div>
            )}
            
            <div className="flex gap-2">
              <Label htmlFor="image-upload" className="cursor-pointer">
                <Button type="button" variant="outline" size="sm" disabled={uploading} asChild>
                  <span>
                    <Upload className="h-4 w-4 mr-2" />
                    {uploading ? tr("a.070e328ec8") : tr("a.84f26e4f34")}
                  </span>
                </Button>
              </Label>
              <Input
                id="image-upload"
                type="file"
                accept="image/*"
                className="hidden"
                onChange={handleImageUpload}
              />
            </div>
          </div>

          {/* Avatar Selector */}
          <div className="space-y-2">
            <Label>{tr("a.66574c0ec3")}</Label>
            <AvatarSelector
              selectedAvatar={avatarIndex}
              onSelectAvatar={setAvatarIndex}
              size="sm"
            />
          </div>

          {/* Form Fields */}
          <div className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="name">{tr("a.d145bb8309")}</Label>
              <Input
                id="name"
                value={name}
                onChange={(e) => setName(e.target.value)}
                placeholder={tr("a.29362f24d4")}
              />
            </div>

            <div className="space-y-2">
              <Label>{tr("a.901dacc248")}</Label>
              <Select
                value={relationship}
                onValueChange={(value) => {
                  setRelationship(value);
                  if (value !== "__custom") {
                    setCustomRelationship("");
                    if (!didManuallySetConnectionType) {
                      if (familyRelationships.includes(value)) {
                        setConnectionType("family");
                      } else if (friendshipRelationships.includes(value)) {
                        setConnectionType("friendship");
                      }
                    }
                  }
                }}
              >
                <SelectTrigger>
                  <SelectValue placeholder={tr("a.d7587196fd")} />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="__family_header" disabled className="font-semibold text-xs uppercase tracking-wider opacity-60">{tr("a.4efb6cb7c0")}</SelectItem>
                  {familyRelationships.map((rel) => (
                    <SelectItem key={rel} value={rel}>{rel}</SelectItem>
                  ))}
                  <SelectItem value="__friend_header" disabled className="font-semibold text-xs uppercase tracking-wider opacity-60 mt-2">{tr("a.743dfd77ca")}</SelectItem>
                  {friendshipRelationships.map((rel) => (
                    <SelectItem key={rel} value={rel}>{rel}</SelectItem>
                  ))}
                  <SelectItem value="__custom" className="font-medium mt-1 border-t pt-1">{tr("a.a047f82a1b")}</SelectItem>
                </SelectContent>
              </Select>
              {relationship === "__custom" && (
                <Input
                  value={customRelationship}
                  onChange={(e) => setCustomRelationship(e.target.value)}
                  placeholder={tr("a.a89dc8ef8e")}
                  className="mt-2"
                />
              )}
            </div>

            <div className="space-y-2">
              <Label htmlFor="connection-type">{tr("a.1d86d4c525")}</Label>
              <Select
                value={connectionType}
                onValueChange={(value: "family" | "friendship") => {
                  setConnectionType(value);
                  setDidManuallySetConnectionType(true);
                }}
              >
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="family">{tr("a.4efb6cb7c0")}</SelectItem>
                  <SelectItem value="friendship">{tr("a.743dfd77ca")}</SelectItem>
                </SelectContent>
              </Select>
              <p className="text-xs text-muted-foreground">
                {tr("a.0ddc6e33d0")}
              </p>
            </div>

            <div className="space-y-2">
              <Label htmlFor="notes">{tr("a.70440046a3")}</Label>
              <Textarea
                id="notes"
                value={notes}
                onChange={(e) => setNotes(e.target.value)}
                placeholder={tr("a.c278e2fa21")}
                rows={3}
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="details">{tr("a.cc7b272da6")}</Label>
              <Textarea
                id="details"
                value={details}
                onChange={(e) => setDetails(e.target.value)}
                placeholder={tr("a.a7c345f909")}
                rows={2}
              />
            </div>
          </div>

          {/* Invitation Section */}
          <div className="border-t pt-4 space-y-3">
            <Label className="text-sm font-medium">{tr("a.3486bb5b56")}</Label>
            <p className="text-xs text-muted-foreground">
              {tr("a.6494fc1202")}
            </p>
            <div className="flex gap-2">
              <Input
                type="email"
                value={inviteEmail}
                onChange={(e) => setInviteEmail(e.target.value)}
                placeholder={tr("a.c7363c9f0a")}
              />
              <Button
                type="button"
                variant="outline"
                onClick={handleSendInvitation}
                disabled={sendingInvite || !inviteEmail.trim()}
              >
                {sendingInvite ? (
                  <Loader2 className="h-4 w-4 animate-spin" />
                ) : (
                  <>
                    <Mail className="h-4 w-4 mr-2" />
                    {tr("a.9bc2575c39")}
                  </>
                )}
              </Button>
            </div>
          </div>
        </div>

        <div className="flex justify-end gap-2">
          <Button variant="outline" onClick={() => onOpenChange(false)}>
            {tr("a.77dfd2135f")}
          </Button>
          <Button onClick={handleSubmit} disabled={loading}>
            {loading ? (
              <>
                <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                {tr("a.268c06a28a")}
              </>
            ) : (
              tr("a.18d2cf5498")
            )}
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
};
