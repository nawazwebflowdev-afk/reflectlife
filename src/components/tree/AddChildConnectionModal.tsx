import { useState } from "react";
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

interface AddChildConnectionModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  parentConnectionId: string;
  onUpdate: () => void;
}

export const AddChildConnectionModal = ({
  open,
  onOpenChange,
  parentConnectionId,
  onUpdate,
}: AddChildConnectionModalProps) => {
  const { toast } = useToast();
  const [loading, setLoading] = useState(false);
  const [uploading, setUploading] = useState(false);
  const [sendingInvite, setSendingInvite] = useState(false);
  const [name, setName] = useState("");
  const [relationship, setRelationship] = useState("");
  const [notes, setNotes] = useState("");
  const [details, setDetails] = useState("");
  const [imageUrl, setImageUrl] = useState("");
  const [avatarIndex, setAvatarIndex] = useState(0);
  const [connectionType, setConnectionType] = useState<"family" | "friendship">("family");
  const [inviteEmail, setInviteEmail] = useState("");

  const handleImageUpload = async (event: React.ChangeEvent<HTMLInputElement>) => {
    try {
      setUploading(true);
      const file = event.target.files?.[0];
      if (!file) return;

      if (!file.type.startsWith('image/')) {
        toast({
          title: "Invalid file type",
          description: "Please upload an image file",
          variant: "destructive",
        });
        return;
      }

      const fileExt = file.name.split(".").pop();
      const filePath = `connection-images/${Date.now()}.${fileExt}`;

      const { error: uploadError } = await supabase.storage
        .from("memorial_uploads")
        .upload(filePath, file);

      if (uploadError) throw uploadError;

      const { data: { publicUrl } } = supabase.storage
        .from("memorial_uploads")
        .getPublicUrl(filePath);

      setImageUrl(publicUrl);
      toast({
        title: "Image uploaded",
        description: "Profile image uploaded successfully",
      });
    } catch (error: any) {
      toast({
        title: "Upload failed",
        description: error.message,
        variant: "destructive",
      });
    } finally {
      setUploading(false);
    }
  };

  const handleSendInvitation = async () => {
    if (!inviteEmail.trim()) {
      toast({
        title: "Email required",
        description: "Please enter an email address",
        variant: "destructive",
      });
      return;
    }

    setSendingInvite(true);
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) throw new Error("Not authenticated");

      const { data: profile } = await supabase
        .from("profiles")
        .select("full_name")
        .eq("id", user.id)
        .single();

      // Create invitation record to generate token
      const { data: invitation, error: inviteError } = await supabase
        .from("memorial_invitations")
        .insert({
          inviter_id: user.id,
          invitee_email: inviteEmail,
          connection_id: parentConnectionId,
          status: "pending",
        })
        .select()
        .single();

      if (inviteError) throw inviteError;

      // Generate invitation URL with token
      const invitationUrl = `${window.location.origin}/guest-tribute/${invitation.id}`;

      const { error } = await supabase.functions.invoke("send-invitation", {
        body: {
          recipientEmail: inviteEmail,
          personName: name || "a loved one",
          senderName: profile?.full_name || "Someone",
          invitationUrl,
          senderId: user.id,
        },
      });

      if (error) throw error;

      toast({
        title: "Invitation sent successfully! 💌",
        description: `${inviteEmail} can now contribute memories and tributes`,
      });
      setInviteEmail("");
    } catch (error: any) {
      toast({
        title: "Unable to send invitation",
        description: error.message,
        variant: "destructive",
      });
    } finally {
      setSendingInvite(false);
    }
  };

  const handleSubmit = async () => {
    if (!name.trim() || !relationship.trim()) {
      toast({
        title: "Missing information",
        description: "Please provide at least a name and relationship",
        variant: "destructive",
      });
      return;
    }

    setLoading(true);
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) throw new Error("Not authenticated");

      // Get parent connection to link properly
      const { data: parentConnection } = await supabase
        .from("connections")
        .select("*")
        .eq("id", parentConnectionId)
        .single();

      if (!parentConnection) throw new Error("Parent connection not found");

      const finalImageUrl = imageUrl;

      const { error } = await supabase.from("connections").insert({
        owner_id: user.id,
        parent_connection_id: parentConnectionId,
        related_person_name: name,
        relationship_type: relationship,
        connection_type: connectionType,
        image_url: finalImageUrl,
        x_pos: (parentConnection.x_pos || 0) + 150,
        y_pos: (parentConnection.y_pos || 0) + 100,
      });

      if (error) throw error;

      toast({
        title: "Connection added 🌿",
        description: `${name} has been added to the tree`,
      });

      onUpdate();
      onOpenChange(false);
      resetForm();
    } catch (error: any) {
      toast({
        title: "Error adding connection",
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
    setNotes("");
    setDetails("");
    setImageUrl("");
    setAvatarIndex(0);
    setInviteEmail("");
    setConnectionType("family");
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-[550px] max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>Add Connection to This Person</DialogTitle>
          <DialogDescription>
            Add someone connected to this person - family member, friend, or loved one.
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
                <span className="text-muted-foreground text-sm">No image</span>
              </div>
            )}
            
            <div className="flex gap-2">
              <Label htmlFor="image-upload" className="cursor-pointer">
                <Button type="button" variant="outline" size="sm" disabled={uploading} asChild>
                  <span>
                    <Upload className="h-4 w-4 mr-2" />
                    {uploading ? "Uploading..." : "Upload Photo"}
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
            <Label>Or choose an avatar</Label>
            <AvatarSelector
              selectedAvatar={avatarIndex}
              onSelectAvatar={setAvatarIndex}
              size="sm"
            />
          </div>

          {/* Form Fields */}
          <div className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="name">Name *</Label>
              <Input
                id="name"
                value={name}
                onChange={(e) => setName(e.target.value)}
                placeholder="Enter full name"
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="relationship">Relationship *</Label>
              <Input
                id="relationship"
                value={relationship}
                onChange={(e) => setRelationship(e.target.value)}
                placeholder="e.g., Daughter, Friend, Brother"
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="connection-type">Connection Type</Label>
              <Select value={connectionType} onValueChange={(value: "family" | "friendship") => setConnectionType(value)}>
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="family">Family</SelectItem>
                  <SelectItem value="friendship">Friendship</SelectItem>
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-2">
              <Label htmlFor="notes">Notes</Label>
              <Textarea
                id="notes"
                value={notes}
                onChange={(e) => setNotes(e.target.value)}
                placeholder="Add any special notes or memories..."
                rows={3}
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="details">Additional Details</Label>
              <Textarea
                id="details"
                value={details}
                onChange={(e) => setDetails(e.target.value)}
                placeholder="Birth date, location, or other details..."
                rows={2}
              />
            </div>
          </div>

          {/* Invitation Section */}
          <div className="border-t pt-4 space-y-3">
            <Label className="text-sm font-medium">Invite Friends to Contribute</Label>
            <p className="text-xs text-muted-foreground">
              Send an invitation email to friends or family to add tributes and memories for this person.
            </p>
            <div className="flex gap-2">
              <Input
                type="email"
                value={inviteEmail}
                onChange={(e) => setInviteEmail(e.target.value)}
                placeholder="friend@example.com"
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
                    Send
                  </>
                )}
              </Button>
            </div>
          </div>
        </div>

        <div className="flex justify-end gap-2">
          <Button variant="outline" onClick={() => onOpenChange(false)}>
            Cancel
          </Button>
          <Button onClick={handleSubmit} disabled={loading}>
            {loading ? (
              <>
                <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                Adding...
              </>
            ) : (
              "Add Connection"
            )}
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
};
