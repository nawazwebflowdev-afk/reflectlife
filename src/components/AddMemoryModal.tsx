import { useState } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { useToast } from "@/hooks/use-toast";
import { supabase } from "@/integrations/supabase/client";
import { Calendar } from "@/components/ui/calendar";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { format } from "@/lib/dateFormat";
import { CalendarIcon, Upload } from "lucide-react";
import { cn } from "@/utils";

import { tr } from "@/i18n/tr";
interface AddMemoryModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  timelineId: string;
  userId: string;
  onMemoryAdded: () => void;
}

export const AddMemoryModal = ({ open, onOpenChange, timelineId, userId, onMemoryAdded }: AddMemoryModalProps) => {
  const [contentType, setContentType] = useState<"photo" | "video" | "note">("photo");
  const [caption, setCaption] = useState("");
  const [file, setFile] = useState<File | null>(null);
  const [eventDate, setEventDate] = useState<Date>();
  const [isLoading, setIsLoading] = useState(false);
  const { toast } = useToast();

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files[0]) {
      setFile(e.target.files[0]);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!caption.trim()) {
      toast({
        title: tr("a.7f2f6a15cf"),
        description: tr("a.0640bb29c4"),
        variant: "destructive",
      });
      return;
    }

    if (contentType !== "note" && !file) {
      toast({
        title: tr("a.7f2f6a15cf"),
        description: tr("a.c2af4aca4b"),
        variant: "destructive",
      });
      return;
    }

    setIsLoading(true);

    try {
      let contentUrl = "";

      // Upload file if provided
      if (file) {
        const fileExt = file.name.split(".").pop();
        const fileName = `${userId}/${timelineId}/${Date.now()}.${fileExt}`;
        
        const { error: uploadError } = await supabase.storage
          .from("memorial_uploads")
          .upload(fileName, file);

        if (uploadError) throw uploadError;

        const { data: { publicUrl } } = supabase.storage
          .from("memorial_uploads")
          .getPublicUrl(fileName);

        contentUrl = publicUrl;
      }

      // Create entry
      const { error } = await supabase
        .from("memorial_entries")
        .insert({
          timeline_id: timelineId,
          content_type: contentType,
          content_url: contentUrl,
          caption: caption.trim(),
          event_date: eventDate ? format(eventDate, "yyyy-MM-dd") : null,
        });

      if (error) throw error;

      toast({
        title: tr("a.33f56f452b"),
        description: tr("a.1f77c49d37"),
      });

      setCaption("");
      setFile(null);
      setEventDate(undefined);
      onOpenChange(false);
      onMemoryAdded();
    } catch (error: any) {
      toast({
        title: tr("a.7f2f6a15cf"),
        description: error.message || tr("a.61588a90e2"),
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
          <DialogTitle className="font-serif text-2xl">{tr("a.37c98f8a06")}</DialogTitle>
        </DialogHeader>
        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="space-y-2">
            <Label htmlFor="type">{tr("a.2ae8ed8ee5")}</Label>
            <Select value={contentType} onValueChange={(value: any) => setContentType(value)}>
              <SelectTrigger>
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="photo">{tr("a.d01d900383")}</SelectItem>
                <SelectItem value="video">{tr("a.bc17c1f017")}</SelectItem>
                <SelectItem value="note">{tr("a.0d09f8f226")}</SelectItem>
              </SelectContent>
            </Select>
          </div>

          {contentType !== "note" && (
            <div className="space-y-2">
              <Label htmlFor="file">{tr("a.8bdf057f91")} {contentType === "photo" ? tr("a.d01d900383") : tr("a.bc17c1f017")} *</Label>
              <div className="flex items-center gap-2">
                <Input
                  id="file"
                  type="file"
                  accept={contentType === "photo" ? "image/*" : "video/*"}
                  onChange={handleFileChange}
                  className="cursor-pointer"
                />
                <Upload className="h-5 w-5 text-muted-foreground" />
              </div>
              {file && (
                <p className="text-sm text-muted-foreground">{file.name}</p>
              )}
            </div>
          )}

          <div className="space-y-2">
            <Label htmlFor="caption">{tr("a.103f57c11d")}</Label>
            <Textarea
              id="caption"
              value={caption}
              onChange={(e) => setCaption(e.target.value)}
              placeholder={tr("a.8720a3f74c")}
              rows={4}
              required
            />
          </div>

          <div className="space-y-2">
            <Label>{tr("a.0cd41f14b1")}</Label>
            <Popover>
              <PopoverTrigger asChild>
                <Button
                  variant="outline"
                  className={cn(
                    "w-full justify-start text-left font-normal",
                    !eventDate && "text-muted-foreground"
                  )}
                >
                  <CalendarIcon className="mr-2 h-4 w-4" />
                  {eventDate ? format(eventDate, "PPP") : <span>{tr("a.629b7ca5d3")}</span>}
                </Button>
              </PopoverTrigger>
              <PopoverContent className="w-auto p-0" align="start">
                <Calendar
                  mode="single"
                  selected={eventDate}
                  onSelect={setEventDate}
                  initialFocus
                  className="pointer-events-auto"
                />
              </PopoverContent>
            </Popover>
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
              {isLoading ? tr("a.268c06a28a") : tr("a.22012e09a4")}
            </Button>
          </div>
        </form>
      </DialogContent>
    </Dialog>
  );
};
