import { useState } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Loader2, Upload, X } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";

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

    try {
      setUploading(true);
      let mediaUrl = null;

      // Upload media if present
      if (mediaFile) {
        const fileExt = mediaFile.name.split('.').pop();
        const fileName = `${user.id}-${Date.now()}.${fileExt}`;
        const { data: uploadData, error: uploadError } = await supabase.storage
          .from('memorial_uploads')
          .upload(fileName, mediaFile);

        if (uploadError) throw uploadError;
        
        const { data: { publicUrl } } = supabase.storage
          .from('memorial_uploads')
          .getPublicUrl(uploadData.path);
        
        mediaUrl = publicUrl;
      }

      // Insert tribute
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
      <DialogContent className="sm:max-w-[500px]">
        <DialogHeader>
          <DialogTitle className="font-serif text-2xl text-primary">Share a Memory 💐</DialogTitle>
        </DialogHeader>
        
        <div className="space-y-4">
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
