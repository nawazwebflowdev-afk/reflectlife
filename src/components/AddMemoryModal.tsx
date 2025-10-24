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
import { format } from "date-fns";
import { CalendarIcon, Upload } from "lucide-react";
import { cn } from "@/lib/utils";

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
        title: "Error",
        description: "Please add a caption",
        variant: "destructive",
      });
      return;
    }

    if (contentType !== "note" && !file) {
      toast({
        title: "Error",
        description: "Please upload a file",
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
        title: "Memory added",
        description: "Your memory has been added to the timeline",
      });

      setCaption("");
      setFile(null);
      setEventDate(undefined);
      onOpenChange(false);
      onMemoryAdded();
    } catch (error: any) {
      toast({
        title: "Error",
        description: error.message || "Failed to add memory",
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
          <DialogTitle className="font-serif text-2xl">Add a Memory</DialogTitle>
        </DialogHeader>
        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="space-y-2">
            <Label htmlFor="type">Memory Type</Label>
            <Select value={contentType} onValueChange={(value: any) => setContentType(value)}>
              <SelectTrigger>
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="photo">Photo</SelectItem>
                <SelectItem value="video">Video</SelectItem>
                <SelectItem value="note">Written Note</SelectItem>
              </SelectContent>
            </Select>
          </div>

          {contentType !== "note" && (
            <div className="space-y-2">
              <Label htmlFor="file">Upload {contentType === "photo" ? "Photo" : "Video"} *</Label>
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
            <Label htmlFor="caption">Caption *</Label>
            <Textarea
              id="caption"
              value={caption}
              onChange={(e) => setCaption(e.target.value)}
              placeholder="Share your memory..."
              rows={4}
              required
            />
          </div>

          <div className="space-y-2">
            <Label>Event Date</Label>
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
                  {eventDate ? format(eventDate, "PPP") : <span>Pick a date</span>}
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
              Cancel
            </Button>
            <Button type="submit" disabled={isLoading}>
              {isLoading ? "Adding..." : "Add Memory"}
            </Button>
          </div>
        </form>
      </DialogContent>
    </Dialog>
  );
};
