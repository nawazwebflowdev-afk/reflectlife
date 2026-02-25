import { useState, useEffect } from "react";
import { X, Upload, Loader2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";

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
      let previewImageUrl = memorial.preview_image_url;

      // Upload new image if selected
      if (imageFile) {
        const fileExt = imageFile.name.split('.').pop();
        const fileName = `${memorial.id}-${Date.now()}.${fileExt}`;
        const filePath = `memorial-images/${fileName}`;

        const { error: uploadError } = await supabase.storage
          .from('memorial_uploads')
          .upload(filePath, imageFile);

        if (uploadError) throw uploadError;

        const { data: { publicUrl } } = supabase.storage
          .from('memorial_uploads')
          .getPublicUrl(filePath);

        previewImageUrl = publicUrl;
      }

      // Update memorial
      const { error: updateError } = await supabase
        .from('memorials')
        .update({
          name: formData.name,
          bio: formData.bio,
          location: formData.location,
          date_of_birth: formData.date_of_birth || null,
          date_of_death: formData.date_of_death || null,
          preview_image_url: previewImageUrl,
          updated_at: new Date().toISOString(),
        })
        .eq('id', memorial.id);

      if (updateError) throw updateError;

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

        <form onSubmit={handleSubmit} className="space-y-6">
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
      </DialogContent>
    </Dialog>
  );
};

export default EditMemorialModal;
