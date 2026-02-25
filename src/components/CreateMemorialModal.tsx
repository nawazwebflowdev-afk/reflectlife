import { useState } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { useToast } from "@/hooks/use-toast";
import { supabase } from "@/integrations/supabase/client";
import { Upload, X, Loader2, Lock, Users, Globe } from "lucide-react";
import { format } from "date-fns";

interface CreateMemorialModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onMemorialCreated: () => void;
}

const CreateMemorialModal = ({ open, onOpenChange, onMemorialCreated }: CreateMemorialModalProps) => {
  const { toast } = useToast();
  const [isLoading, setIsLoading] = useState(false);
  const [formData, setFormData] = useState({
    name: "",
    bio: "",
    tributes: "",
    dateOfBirth: "",
    dateOfDeath: "",
    location: "",
    privacyLevel: "public" as "public" | "friends" | "private",
  });
  const [images, setImages] = useState<File[]>([]);
  const [imagePreviews, setImagePreviews] = useState<string[]>([]);

  const handleImageChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = Array.from(e.target.files || []);
    
    if (images.length + files.length > 5) {
      toast({
        title: "Too many images",
        description: "You can upload a maximum of 5 images.",
        variant: "destructive",
      });
      return;
    }

    const newImages = [...images, ...files].slice(0, 5);
    setImages(newImages);

    // Create previews
    const newPreviews = newImages.map(file => URL.createObjectURL(file));
    setImagePreviews(newPreviews);
  };

  const removeImage = (index: number) => {
    const newImages = images.filter((_, i) => i !== index);
    const newPreviews = imagePreviews.filter((_, i) => i !== index);
    setImages(newImages);
    setImagePreviews(newPreviews);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!formData.name.trim()) {
      toast({
        title: "Name required",
        description: "Please enter the name of the deceased.",
        variant: "destructive",
      });
      return;
    }

    if (images.length === 0) {
      toast({
        title: "Image required",
        description: "Please upload at least one image.",
        variant: "destructive",
      });
      return;
    }

    setIsLoading(true);

    try {
      const { data: { user } } = await supabase.auth.getUser();
      
      if (!user) {
        toast({
          title: "Authentication required",
          description: "Please log in to create a memorial.",
          variant: "destructive",
        });
        setIsLoading(false);
        return;
      }

      // Upload images to Supabase storage
      const uploadedImageUrls: string[] = [];
      
      for (const image of images) {
        const fileExt = image.name.split('.').pop();
        const fileName = `${user.id}/${Date.now()}-${Math.random()}.${fileExt}`;
        
        const { data: uploadData, error: uploadError } = await supabase.storage
          .from('memorial_uploads')
          .upload(fileName, image);

        if (uploadError) throw uploadError;

        const { data: { publicUrl } } = supabase.storage
          .from('memorial_uploads')
          .getPublicUrl(uploadData.path);

        uploadedImageUrls.push(publicUrl);
      }

      // Combine bio and tributes
      const fullBio = formData.tributes 
        ? `${formData.bio}\n\n--- Tributes ---\n${formData.tributes}`
        : formData.bio;

      // Create memorial record
      const { data: memorial, error: memorialError } = await supabase
        .from('memorials')
        .insert({
          user_id: user.id,
          name: formData.name,
          bio: fullBio,
          date_of_birth: formData.dateOfBirth || null,
          date_of_death: formData.dateOfDeath || null,
          location: formData.location || null,
          preview_image_url: uploadedImageUrls[0],
          is_public: formData.privacyLevel === 'public',
          privacy_level: formData.privacyLevel,
        })
        .select()
        .single();

      if (memorialError) throw memorialError;
      if (!memorial) throw new Error('Failed to create memorial');

      // Add all images to memorial_media table
      const mediaInserts = uploadedImageUrls.map(url => ({
        memorial_id: memorial.id,
        media_type: 'photo',
        media_url: url,
      }));

      const { error: mediaError } = await supabase
        .from('memorial_media')
        .insert(mediaInserts);

      if (mediaError) throw mediaError;

      toast({
        title: "Your memorial has been added beautifully 🕊️",
        description: "The memorial is now visible on the Memorial Wall.",
      });

      // Reset form
      setFormData({
        name: "",
        bio: "",
        tributes: "",
        dateOfBirth: "",
        dateOfDeath: "",
        location: "",
        privacyLevel: "public",
      });
      setImages([]);
      setImagePreviews([]);
      
      onMemorialCreated();
      onOpenChange(false);
    } catch (error: any) {
      console.error('Error creating memorial:', error);
      toast({
        title: "Error creating memorial",
        description: error.message || "Please try again later.",
        variant: "destructive",
      });
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="font-serif text-2xl">Create a Memorial</DialogTitle>
        </DialogHeader>

        <form onSubmit={handleSubmit} className="space-y-6">
          {/* Image Upload Section */}
          <div className="space-y-3">
            <Label htmlFor="images">Images (1-5 photos)</Label>
            <div className="border-2 border-dashed rounded-lg p-4 text-center hover:border-primary transition-colors">
              <input
                id="images"
                type="file"
                accept="image/*"
                multiple
                onChange={handleImageChange}
                className="hidden"
                disabled={images.length >= 5}
              />
              <label htmlFor="images" className="cursor-pointer">
                <Upload className="h-8 w-8 mx-auto mb-2 text-muted-foreground" />
                <p className="text-sm text-muted-foreground">
                  Click to upload images ({images.length}/5)
                </p>
              </label>
            </div>

            {/* Image Previews */}
            {imagePreviews.length > 0 && (
              <div className="grid grid-cols-3 gap-3">
                {imagePreviews.map((preview, index) => (
                  <div key={index} className="relative group">
                    <img
                      src={preview}
                      alt={`Preview ${index + 1}`}
                      className="w-full h-24 object-cover rounded-lg"
                    />
                    <button
                      type="button"
                      onClick={() => removeImage(index)}
                      className="absolute top-1 right-1 bg-destructive text-destructive-foreground rounded-full p-1 opacity-0 group-hover:opacity-100 transition-opacity"
                    >
                      <X className="h-4 w-4" />
                    </button>
                  </div>
                ))}
              </div>
            )}
          </div>

          {/* Full Name */}
          <div className="space-y-2">
            <Label htmlFor="name">Full Name of the Deceased *</Label>
            <Input
              id="name"
              value={formData.name}
              onChange={(e) => setFormData({ ...formData, name: e.target.value })}
              placeholder="Enter full name"
              required
            />
          </div>

          {/* Description / Life Story */}
          <div className="space-y-2">
            <Label htmlFor="bio">Description / Life Story</Label>
            <Textarea
              id="bio"
              value={formData.bio}
              onChange={(e) => setFormData({ ...formData, bio: e.target.value })}
              placeholder="Share their story, achievements, and memories..."
              rows={4}
            />
          </div>

          {/* Tributes */}
          <div className="space-y-2">
            <Label htmlFor="tributes">Tributes</Label>
            <Textarea
              id="tributes"
              value={formData.tributes}
              onChange={(e) => setFormData({ ...formData, tributes: e.target.value })}
              placeholder="Share heartfelt messages and tributes..."
              rows={3}
            />
          </div>

          {/* Dates */}
          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label htmlFor="dateOfBirth">Date of Birth</Label>
              <Input
                id="dateOfBirth"
                type="date"
                value={formData.dateOfBirth}
                onChange={(e) => setFormData({ ...formData, dateOfBirth: e.target.value })}
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="dateOfDeath">Date of Passing</Label>
              <Input
                id="dateOfDeath"
                type="date"
                value={formData.dateOfDeath}
                onChange={(e) => setFormData({ ...formData, dateOfDeath: e.target.value })}
              />
            </div>
          </div>

          {/* Location */}
          <div className="space-y-2">
            <Label htmlFor="location">Location (Optional)</Label>
            <Input
              id="location"
              value={formData.location}
              onChange={(e) => setFormData({ ...formData, location: e.target.value })}
              placeholder="City, Country"
            />
          </div>

          {/* Privacy Settings */}
          <div className="space-y-2">
            <Label htmlFor="privacy">Privacy Settings</Label>
            <Select
              value={formData.privacyLevel}
              onValueChange={(value: "public" | "friends" | "private") => 
                setFormData({ ...formData, privacyLevel: value })
              }
            >
              <SelectTrigger id="privacy">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="public">
                  <div className="flex items-center gap-2">
                    <Globe className="h-4 w-4" />
                    <div>
                      <div className="font-medium">Public</div>
                      <div className="text-xs text-muted-foreground">Anyone can view and share</div>
                    </div>
                  </div>
                </SelectItem>
                <SelectItem value="friends">
                  <div className="flex items-center gap-2">
                    <Users className="h-4 w-4" />
                    <div>
                      <div className="font-medium">Friends Only</div>
                      <div className="text-xs text-muted-foreground">Only invited friends can view</div>
                    </div>
                  </div>
                </SelectItem>
                <SelectItem value="private">
                  <div className="flex items-center gap-2">
                    <Lock className="h-4 w-4" />
                    <div>
                      <div className="font-medium">Private</div>
                      <div className="text-xs text-muted-foreground">Only you can view</div>
                    </div>
                  </div>
                </SelectItem>
              </SelectContent>
            </Select>
          </div>

          {/* Actions */}
          <div className="flex gap-3 justify-end">
            <Button
              type="button"
              variant="outline"
              onClick={() => onOpenChange(false)}
              disabled={isLoading}
            >
              Cancel
            </Button>
            <Button type="submit" disabled={isLoading}>
              {isLoading ? (
                <>
                  <Loader2 className="h-4 w-4 animate-spin mr-2" />
                  Creating...
                </>
              ) : (
                "Create Memorial"
              )}
            </Button>
          </div>
        </form>
      </DialogContent>
    </Dialog>
  );
};

export default CreateMemorialModal;
