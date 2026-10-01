import { useState } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { useToast } from "@/hooks/use-toast";
import { supabase } from "@/integrations/supabase/client";
import { useNavigate } from "react-router-dom";
import { Upload } from "lucide-react";

import { tr } from "@/i18n/tr";
interface CreateTimelineModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  userId: string;
}

export const CreateTimelineModal = ({ open, onOpenChange, userId }: CreateTimelineModalProps) => {
  const [title, setTitle] = useState("");
  const [description, setDescription] = useState("");
  const [backgroundFile, setBackgroundFile] = useState<File | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const { toast } = useToast();
  const navigate = useNavigate();

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files[0]) {
      setBackgroundFile(e.target.files[0]);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!title.trim()) {
      toast({
        title: tr("a.7f2f6a15cf"),
        description: tr("a.41a7048657"),
        variant: "destructive",
      });
      return;
    }

    setIsLoading(true);

    try {
      let backgroundUrl = "";

      // Upload background image if provided
      if (backgroundFile) {
        const fileExt = backgroundFile.name.split(".").pop();
        const fileName = `${userId}/backgrounds/${Date.now()}.${fileExt}`;
        
        const { error: uploadError } = await supabase.storage
          .from("memorial_uploads")
          .upload(fileName, backgroundFile);

        if (uploadError) throw uploadError;

        const { data: { publicUrl } } = supabase.storage
          .from("memorial_uploads")
          .getPublicUrl(fileName);

        backgroundUrl = publicUrl;
      }

      // Create timeline
      const { data, error } = await supabase
        .from("memorial_timelines")
        .insert({
          user_id: userId,
          title: title.trim(),
          description: description.trim(),
          background_url: backgroundUrl,
        })
        .select()
        .single();

      if (error) throw error;

      toast({
        title: tr("a.ba06f5a63b"),
        description: tr("a.25788ddb6b"),
      });

      onOpenChange(false);
      navigate(`/timeline/${data.id}`);
    } catch (error: any) {
      toast({
        title: tr("a.7f2f6a15cf"),
        description: error.message || tr("a.3884a0fce5"),
        variant: "destructive",
      });
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-[500px]">
        <DialogHeader>
          <DialogTitle className="font-serif text-2xl">{tr("a.999db21f14")}</DialogTitle>
        </DialogHeader>
        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="space-y-2">
            <Label htmlFor="title">{tr("a.a78a6218a4")}</Label>
            <Input
              id="title"
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              placeholder={tr("a.494d28ffd2")}
              required
            />
          </div>

          <div className="space-y-2">
            <Label htmlFor="description">{tr("a.55f8ebc805")}</Label>
            <Textarea
              id="description"
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              placeholder={tr("a.4fe5d94571")}
              rows={4}
            />
          </div>

          <div className="space-y-2">
            <Label htmlFor="background">{tr("a.7955201bb4")}</Label>
            <div className="flex items-center gap-2">
              <Input
                id="background"
                type="file"
                accept="image/*"
                onChange={handleFileChange}
                className="cursor-pointer"
              />
              <Upload className="h-5 w-5 text-muted-foreground" />
            </div>
            {backgroundFile && (
              <p className="text-sm text-muted-foreground">{backgroundFile.name}</p>
            )}
          </div>

          <div className="flex justify-end gap-3 pt-4">
            <Button
              type="button"
              variant="outline"
              onClick={() => onOpenChange(false)}
              disabled={isLoading}
            >
              {tr("a.77dfd2135f")}
            </Button>
            <Button type="submit" disabled={isLoading}>
              {isLoading ? tr("a.28ea7667d0") : tr("a.192f97bc1e")}
            </Button>
          </div>
        </form>
      </DialogContent>
    </Dialog>
  );
};
