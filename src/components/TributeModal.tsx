import { useState } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Loader2, Upload, X } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";
import { AvatarSelector } from "@/components/EmojiAvatarSelector";
import { AVATARS } from "@/config/avatars";

interface TributeModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  memorialId: string;
  onTributeAdded: () => void;
}

export const TributeModal = ({ open, onOpenChange, memorialId, onTributeAdded }: TributeModalProps) => {
  const { toast } = useToast();
  const [tributeText, setTributeText] = useState("");
  const [mediaFile, setMediaFile] = useState<File | null>(null);
  const [mediaPreview, setMediaPreview] = useState<string | null>(null);
  const [uploading, setUploading] = useState(false);
  const [selectedAvatar, setSelectedAvatar] = useState<number>(0);
  const [customAvatarFile, setCustomAvatarFile] = useState<File | null>(null);
  const [customAvatarPreview, setCustomAvatarPreview] = useState<string | null>(null);

  const handleMediaChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      setMediaFile(file);
      const reader = new FileReader();
      reader.onloadend = () => {
        setMediaPreview(reader.result as string);
      };
      reader.readAsDataURL(file);
    }
  };

  const handleCustomAvatarChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file && file.type.startsWith('image/')) {
      setCustomAvatarFile(file);
      const reader = new FileReader();
      reader.onloadend = () => {
        setCustomAvatarPreview(reader.result as string);
      };
      reader.readAsDataURL(file);
    }
  };

  const removeMedia = () => {
    setMediaFile(null);
    setMediaPreview(null);
  };

  const handleSubmit = async () => {
    const { data: { user } } = await supabase.auth.getUser();
    
    if (!user) {
      toast({
        title: "Authentication required",
        description: "Please sign in to share a memory",
        variant: "destructive",
      });
      return;
    }

    if (!tributeText.trim()) {
      toast({
        title: "Tribute text required",
        description: "Please write a memory to share",
        variant: "destructive",
      });
      return;
    }

    if (tributeText.length > 5000) {
      toast({
        title: "Tribute too long",
        description: "Please keep tributes under 5000 characters",
        variant: "destructive",
      });
      return;
    }

    try {
      setUploading(true);
      let mediaUrl = null;
      let avatarUrl = null;

      // Import compression
      const { compressImage } = await import('@/utils/imageCompression');

      // Upload custom avatar if provided
      if (customAvatarFile) {
        const compressedBlob = await compressImage(customAvatarFile, 200, 200, 0.8);
        const compressedFile = new File([compressedBlob], `avatar-${user.id}-${Date.now()}.webp`, { type: 'image/webp' });
        
        const { data: uploadData, error: uploadError } = await supabase.storage
          .from('memorial_uploads')
          .upload(`tribute-avatars/${compressedFile.name}`, compressedFile);

        if (uploadError) throw uploadError;
        
        const { data: { publicUrl } } = supabase.storage
          .from('memorial_uploads')
          .getPublicUrl(uploadData.path);
        
        avatarUrl = publicUrl;
      } else {
        // Use selected emoji avatar
        avatarUrl = AVATARS[selectedAvatar];
      }

      // Upload media if present
      if (mediaFile) {
        const compressedBlob = await compressImage(mediaFile, 1200, 1200, 0.85);
        const fileName = `tribute-${user.id}-${Date.now()}.webp`;
        const compressedFile = new File([compressedBlob], fileName, { type: 'image/webp' });
        
        const { data: uploadData, error: uploadError } = await supabase.storage
          .from('memorial_uploads')
          .upload(fileName, compressedFile);

        if (uploadError) throw uploadError;
        
        const { data: { publicUrl } } = supabase.storage
          .from('memorial_uploads')
          .getPublicUrl(uploadData.path);
        
        mediaUrl = publicUrl;
      }

      // Get user profile for name
      const { data: profile } = await supabase
        .from('profiles')
        .select('full_name, avatar_url')
        .eq('id', user.id)
        .single();

      // Insert tribute with avatar
      const { error: insertError } = await supabase
        .from('memorial_tributes')
        .insert({
          memorial_id: memorialId,
          user_id: user.id,
          tribute_text: tributeText,
          media_url: mediaUrl,
        });

      if (insertError) throw insertError;

      toast({
        title: "Memory shared",
        description: "Your tribute has been added successfully 💌",
      });

      // Reset form
      setTributeText("");
      setMediaFile(null);
      setMediaPreview(null);
      setCustomAvatarFile(null);
      setCustomAvatarPreview(null);
      setSelectedAvatar(0);
      onOpenChange(false);
      onTributeAdded();
    } catch (error: any) {
      console.error("Error submitting tribute:", error);
      toast({
        title: "Error",
        description: error.message || "Failed to share memory",
        variant: "destructive",
      });
    } finally {
      setUploading(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-[600px] max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="font-serif text-2xl text-primary">Share a Memory 💐</DialogTitle>
        </DialogHeader>
        
        <div className="space-y-4">
          {/* Avatar Selection */}
          <div className="space-y-2">
            <Label>Choose Your Avatar</Label>
            <div className="flex gap-4 items-start">
              <div className="flex-1">
                <p className="text-xs text-muted-foreground mb-2">Select from avatars:</p>
                <AvatarSelector 
                  selectedAvatar={selectedAvatar}
                  onSelectAvatar={setSelectedAvatar}
                  size="sm"
                />
              </div>
              <div className="space-y-2">
                <p className="text-xs text-muted-foreground">Or upload custom:</p>
                {customAvatarPreview ? (
                  <div className="relative">
                    <img 
                      src={customAvatarPreview} 
                      alt="Custom avatar"
                      className="w-16 h-16 rounded-full object-cover"
                    />
                    <Button
                      type="button"
                      variant="destructive"
                      size="icon"
                      className="absolute -top-2 -right-2 h-6 w-6"
                      onClick={() => {
                        setCustomAvatarFile(null);
                        setCustomAvatarPreview(null);
                      }}
                    >
                      <X className="h-3 w-3" />
                    </Button>
                  </div>
                ) : (
                  <Label htmlFor="custom-avatar" className="cursor-pointer">
                    <div className="w-16 h-16 rounded-full border-2 border-dashed border-muted-foreground/25 flex items-center justify-center hover:border-primary transition-colors">
                      <Upload className="h-6 w-6 text-muted-foreground" />
                    </div>
                    <Input
                      id="custom-avatar"
                      type="file"
                      accept="image/*"
                      onChange={handleCustomAvatarChange}
                      className="hidden"
                    />
                  </Label>
                )}
              </div>
            </div>
          </div>

          <div className="space-y-2">
            <Label htmlFor="tribute">Your Memory</Label>
            <Textarea
              id="tribute"
              placeholder="Share your favorite memory, story, or words of comfort..."
              value={tributeText}
              onChange={(e) => setTributeText(e.target.value)}
              className="min-h-[120px] resize-none"
            />
          </div>

          <div className="space-y-2">
            <Label>Photo or Video (Optional)</Label>
            {mediaPreview ? (
              <div className="relative">
                <img
                  src={mediaPreview}
                  alt="Media preview"
                  className="w-full h-48 object-cover rounded-lg"
                />
                <Button
                  type="button"
                  variant="destructive"
                  size="icon"
                  className="absolute top-2 right-2"
                  onClick={removeMedia}
                >
                  <X className="h-4 w-4" />
                </Button>
              </div>
            ) : (
              <div className="border-2 border-dashed border-muted-foreground/25 rounded-lg p-8 text-center">
                <Input
                  id="media"
                  type="file"
                  accept="image/*,video/*"
                  onChange={handleMediaChange}
                  className="hidden"
                />
                <Label
                  htmlFor="media"
                  className="cursor-pointer flex flex-col items-center gap-2"
                >
                  <Upload className="h-8 w-8 text-muted-foreground" />
                  <span className="text-sm text-muted-foreground">
                    Click to upload photo or video
                  </span>
                </Label>
              </div>
            )}
          </div>

          <div className="flex gap-2 justify-end pt-4">
            <Button
              variant="outline"
              onClick={() => onOpenChange(false)}
              disabled={uploading}
            >
              Cancel
            </Button>
            <Button
              onClick={handleSubmit}
              disabled={uploading || !tributeText.trim()}
            >
              {uploading ? (
                <>
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                  Sharing...
                </>
              ) : (
                "Share Memory"
              )}
            </Button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
};
