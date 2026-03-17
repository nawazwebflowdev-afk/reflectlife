import { useState, useEffect } from "react";
import { X, Upload, Loader2, Eye, EyeOff } from "lucide-react";
import { Switch } from "@/components/ui/switch";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";
import { InviteAccessPanel } from "@/components/InviteAccessPanel";

interface EditMemorialModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  memorial: any;
  onMemorialUpdated: () => void;
}

const EditMemorialModal = ({ open, onOpenChange, memorial, onMemorialUpdated }: EditMemorialModalProps) => {
  const { toast } = useToast();
  const [loading, setLoading] = useState(false);
  const [formData, setFormData] = useState({
    name: "",
    bio: "",
    location: "",
    date_of_birth: "",
    date_of_death: "",
  });
  const [imageFile, setImageFile] = useState<File | null>(null);
  const [imagePreview, setImagePreview] = useState<string>("");
  const [isPublic, setIsPublic] = useState(true);

  useEffect(() => {
    if (memorial && open) {
      setFormData({
        name: memorial.name || "",
        bio: memorial.bio || "",
        location: memorial.location || "",
        date_of_birth: memorial.date_of_birth || "",
        date_of_death: memorial.date_of_death || "",
      });
      setImagePreview(memorial.preview_image_url || "");
      setIsPublic(memorial.is_public ?? true);
    }
  }, [memorial, open]);

  const handleImageChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      setImageFile(file);
      const reader = new FileReader();
      reader.onloadend = () => {
        setImagePreview(reader.result as string);
      };
      reader.readAsDataURL(file);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!formData.name.trim()) {
      toast({
        title: "Error",
        description: "Please enter a name",
        variant: "destructive",
      });
      return;
    }

    setLoading(true);

    try {
      const { data: { session }, error: sessionError } = await supabase.auth.getSession();
      if (sessionError || !session?.user) {
        throw new Error("Your session expired. Please log in again and retry.");
      }

      const user = session.user;

      const { data: ownedMemorial, error: ownershipError } = await supabase
        .from("memorials")
        .select("id, user_id, preview_image_url")
        .eq("id", memorial.id)
        .eq("user_id", user.id)
        .maybeSingle();

      if (ownershipError) throw ownershipError;
      if (!ownedMemorial) {
        throw new Error("You don't have permission to edit this memorial.");
      }

      let previewImageUrl = ownedMemorial.preview_image_url || memorial.preview_image_url;

      if (imageFile) {
        const fileExt = imageFile.name.split(".").pop() || "jpg";
        const filePath = `${user.id}/memorials/${memorial.id}/${Date.now()}-${crypto.randomUUID()}.${fileExt}`;

        const { error: uploadError } = await supabase.storage
          .from("memorial_uploads")
          .upload(filePath, imageFile, { upsert: false });

        if (uploadError) throw uploadError;

        const { data: { publicUrl } } = supabase.storage
          .from("memorial_uploads")
          .getPublicUrl(filePath);

        previewImageUrl = publicUrl;
      }

      const { data: updatedMemorial, error: updateError } = await supabase
        .from("memorials")
        .update({
          name: formData.name,
          bio: formData.bio,
          location: formData.location,
          date_of_birth: formData.date_of_birth || null,
          date_of_death: formData.date_of_death || null,
          preview_image_url: previewImageUrl,
          is_public: isPublic,
          privacy_level: isPublic ? "public" : "private",
          updated_at: new Date().toISOString(),
        })
        .eq("id", memorial.id)
        .eq("user_id", user.id)
        .select("id")
        .maybeSingle();

      if (updateError) throw updateError;
      if (!updatedMemorial) {
        throw new Error("You don't have permission to edit this memorial.");
      }

      toast({
        title: "Success",
        description: "Memorial updated successfully",
      });

      onMemorialUpdated();
      onOpenChange(false);
    } catch (error: any) {
      console.error("Error updating memorial:", error);
      toast({
        title: "Error",
        description: error.message || "Failed to update memorial",
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  };

  const handleClose = () => {
    if (!loading) {
      onOpenChange(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={handleClose}>
      <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="font-serif text-2xl">Edit Memorial</DialogTitle>
        </DialogHeader>

        <Tabs defaultValue="details" className="w-full">
          <TabsList className="grid w-full grid-cols-2">
            <TabsTrigger value="details">Details</TabsTrigger>
            <TabsTrigger value="sharing">Privacy & Sharing</TabsTrigger>
          </TabsList>

          <TabsContent value="details">
            <form onSubmit={handleSubmit} className="space-y-6 pt-4">
              {/* Name */}
              <div className="space-y-2">
                <Label htmlFor="name">Name *</Label>
                <Input
                  id="name"
                  placeholder="Full name"
                  value={formData.name}
                  onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                  required
                />
              </div>

              {/* Bio */}
              <div className="space-y-2">
                <Label htmlFor="bio">Biography</Label>
                <Textarea
                  id="bio"
                  placeholder="Share their story, passions, and what made them special..."
                  value={formData.bio}
                  onChange={(e) => setFormData({ ...formData, bio: e.target.value })}
                  rows={4}
                />
              </div>

              {/* Dates */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label htmlFor="dob">Date of Birth</Label>
                  <Input
                    id="dob"
                    type="date"
                    value={formData.date_of_birth}
                    onChange={(e) => setFormData({ ...formData, date_of_birth: e.target.value })}
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="dod">Date of Passing</Label>
                  <Input
                    id="dod"
                    type="date"
                    value={formData.date_of_death}
                    onChange={(e) => setFormData({ ...formData, date_of_death: e.target.value })}
                  />
                </div>
              </div>

              {/* Location */}
              <div className="space-y-2">
                <Label htmlFor="location">Location</Label>
                <Input
                  id="location"
                  placeholder="City, Country"
                  value={formData.location}
                  onChange={(e) => setFormData({ ...formData, location: e.target.value })}
                />
              </div>

              {/* Image Upload */}
              <div className="space-y-2">
                <Label>Profile Image</Label>
                <div className="border-2 border-dashed rounded-lg p-6 text-center hover:border-primary transition-smooth">
                  <input
                    type="file"
                    id="image-upload"
                    className="hidden"
                    accept="image/*"
                    onChange={handleImageChange}
                  />
                  <label htmlFor="image-upload" className="cursor-pointer">
                    {imagePreview ? (
                      <div className="relative inline-block">
                        <img
                          src={imagePreview}
                          alt="Preview"
                          className="max-h-48 rounded-lg mx-auto"
                        />
                        <Button
                          type="button"
                          variant="secondary"
                          size="sm"
                          className="mt-2"
                          onClick={(e) => {
                            e.preventDefault();
                            document.getElementById('image-upload')?.click();
                          }}
                        >
                          Change Image
                        </Button>
                      </div>
                    ) : (
                      <div className="space-y-2">
                        <Upload className="h-8 w-8 mx-auto text-muted-foreground" />
                        <p className="text-sm text-muted-foreground">
                          Click to upload an image
                        </p>
                      </div>
                    )}
                  </label>
                </div>
              </div>

              {/* Visibility Toggle */}
              <div className="flex items-center justify-between rounded-lg border p-4">
                <div className="flex items-center gap-3">
                  {isPublic ? <Eye className="h-5 w-5 text-primary" /> : <EyeOff className="h-5 w-5 text-muted-foreground" />}
                  <div>
                    <Label htmlFor="edit-visibility" className="text-sm font-medium cursor-pointer">
                      {isPublic ? "Public Memorial" : "Private Memorial"}
                    </Label>
                    <p className="text-xs text-muted-foreground">
                      {isPublic ? "Visible on the Memorial Wall and homepage" : "Only visible to you"}
                    </p>
                  </div>
                </div>
                <Switch id="edit-visibility" checked={isPublic} onCheckedChange={setIsPublic} />
              </div>

              {/* Actions */}
              <div className="flex gap-3 justify-end pt-4">
                <Button
                  type="button"
                  variant="outline"
                  onClick={handleClose}
                  disabled={loading}
                >
                  Cancel
                </Button>
                <Button type="submit" disabled={loading}>
                  {loading ? (
                    <>
                      <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                      Saving...
                    </>
                  ) : (
                    "Save Changes"
                  )}
                </Button>
              </div>
            </form>
          </TabsContent>

          <TabsContent value="sharing" className="pt-4">
            <InviteAccessPanel
              type="memorial"
              resourceId={memorial?.id || ""}
              isPublic={memorial?.is_public ?? true}
              privacyLevel={memorial?.privacy_level || "public"}
              onPrivacyChange={async (newIsPublic, newPrivacyLevel) => {
                const { data: { user } } = await supabase.auth.getUser();
                if (!user) {
                  toast({ title: "Error", description: "Please log in again.", variant: "destructive" });
                  return;
                }

                const { error } = await supabase
                  .from("memorials")
                  .update({
                    is_public: newIsPublic,
                    privacy_level: newPrivacyLevel as any,
                  })
                  .eq("id", memorial.id)
                  .eq("user_id", user.id);

                if (error) {
                  toast({ title: "Error", description: "Failed to update privacy", variant: "destructive" });
                } else {
                  toast({ title: "Privacy updated" });
                  onMemorialUpdated();
                }
              }}
            />
          </TabsContent>
        </Tabs>
      </DialogContent>
    </Dialog>
  );
};

export default EditMemorialModal;
