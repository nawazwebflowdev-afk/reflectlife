import { useState, useEffect } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Switch } from "@/components/ui/switch";
import { Loader2, Upload, Music, Trash2, Save } from "lucide-react";
import { format } from "date-fns";

interface DiaryEntry {
  id: string;
  user_id: string;
  title: string;
  content: string | null;
  entry_date: string;
  media_url: string | null;
  favorite_song_url: string | null;
  tags: string[] | null;
  is_private: boolean;
}

interface DiaryEntryModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  entry: DiaryEntry | null;
  onSaved: () => void;
}

const DiaryEntryModal = ({ open, onOpenChange, entry, onSaved }: DiaryEntryModalProps) => {
  const [title, setTitle] = useState("");
  const [content, setContent] = useState("");
  const [entryDate, setEntryDate] = useState(format(new Date(), "yyyy-MM-dd"));
  const [tags, setTags] = useState("");
  const [songUrl, setSongUrl] = useState("");
  const [isPrivate, setIsPrivate] = useState(true);
  const [mediaFile, setMediaFile] = useState<File | null>(null);
  const [mediaPreview, setMediaPreview] = useState<string | null>(null);
  const [uploading, setUploading] = useState(false);
  const [saving, setSaving] = useState(false);
  const { toast } = useToast();

  useEffect(() => {
    if (entry) {
      setTitle(entry.title);
      setContent(entry.content || "");
      setEntryDate(entry.entry_date);
      setTags(entry.tags?.join(", ") || "");
      setSongUrl(entry.favorite_song_url || "");
      setIsPrivate(entry.is_private);
      setMediaPreview(entry.media_url);
    } else {
      resetForm();
    }
  }, [entry, open]);

  const resetForm = () => {
    setTitle("");
    setContent("");
    setEntryDate(format(new Date(), "yyyy-MM-dd"));
    setTags("");
    setSongUrl("");
    setIsPrivate(true);
    setMediaFile(null);
    setMediaPreview(null);
  };

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

  const uploadMedia = async (): Promise<string | null> => {
    if (!mediaFile) return mediaPreview;

    try {
      setUploading(true);
      const fileExt = mediaFile.name.split(".").pop();
      const fileName = `${Date.now()}-${Math.random()}.${fileExt}`;
      const { data: { session } } = await supabase.auth.getSession();
      const userId = session?.user?.id;
      const filePath = `${userId}/diary/${fileName}`;

      const { error: uploadError } = await supabase.storage
        .from("memorial_uploads")
        .upload(filePath, mediaFile);

      if (uploadError) throw uploadError;

      const { data } = supabase.storage
        .from("memorial_uploads")
        .getPublicUrl(filePath);

      return data.publicUrl;
    } catch (error: any) {
      toast({
        title: "Upload failed",
        description: error.message,
        variant: "destructive",
      });
      return null;
    } finally {
      setUploading(false);
    }
  };

  const handleSave = async () => {
    if (!title.trim()) {
      toast({
        title: "Title required",
        description: "Please enter a title for your entry",
        variant: "destructive",
      });
      return;
    }

    if (title.length > 200) {
      toast({
        title: "Title too long",
        description: "Please keep titles under 200 characters",
        variant: "destructive",
      });
      return;
    }

    if (content && content.length > 50000) {
      toast({
        title: "Content too long",
        description: "Please keep content under 50,000 characters",
        variant: "destructive",
      });
      return;
    }

    try {
      setSaving(true);
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) throw new Error("Not authenticated");

      const mediaUrl = await uploadMedia();
      const tagsArray = tags
        .split(",")
        .map((t) => t.trim())
        .filter((t) => t.length > 0);

      const entryData = {
        title,
        content: content || null,
        entry_date: entryDate,
        tags: tagsArray.length > 0 ? tagsArray : null,
        favorite_song_url: songUrl || null,
        is_private: isPrivate,
        media_url: mediaUrl,
      };

      if (entry) {
        const { error } = await (supabase as any)
          .from("diary_entries")
          .update(entryData)
          .eq("id", entry.id);

        if (error) throw error;

        toast({
          title: "Entry updated",
          description: "Your diary entry has been updated successfully",
        });
      } else {
        const { error } = await (supabase as any)
          .from("diary_entries")
          .insert([{ ...entryData, user_id: user.id }]);

        if (error) throw error;

        toast({
          title: "Entry created",
          description: "Your diary entry has been created successfully",
        });
      }

      onSaved();
      onOpenChange(false);
      resetForm();
    } catch (error: any) {
      toast({
        title: "Error saving entry",
        description: error.message,
        variant: "destructive",
      });
    } finally {
      setSaving(false);
    }
  };

  const handleDelete = async () => {
    if (!entry) return;

    if (!confirm("Are you sure you want to delete this entry?")) return;

    try {
      const { error } = await (supabase as any)
        .from("diary_entries")
        .delete()
        .eq("id", entry.id);

      if (error) throw error;

      toast({
        title: "Entry deleted",
        description: "Your diary entry has been deleted",
      });

      onSaved();
      onOpenChange(false);
    } catch (error: any) {
      toast({
        title: "Error deleting entry",
        description: error.message,
        variant: "destructive",
      });
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-3xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="text-2xl font-serif">
            {entry ? "Edit Entry" : "New Diary Entry"}
          </DialogTitle>
          <DialogDescription>
            Write your thoughts, memories, and reflections
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-6 py-4">
          <div className="space-y-2">
            <Label htmlFor="title">Title *</Label>
            <Input
              id="title"
              placeholder="Give your entry a title..."
              value={title}
              onChange={(e) => setTitle(e.target.value)}
            />
          </div>

          <div className="space-y-2">
            <Label htmlFor="date">Date</Label>
            <Input
              id="date"
              type="date"
              value={entryDate}
              onChange={(e) => setEntryDate(e.target.value)}
            />
          </div>

          <div className="space-y-2">
            <Label htmlFor="content">Content</Label>
            <Textarea
              id="content"
              placeholder="Write your thoughts here..."
              value={content}
              onChange={(e) => setContent(e.target.value)}
              rows={8}
              className="resize-none"
            />
          </div>

          <div className="space-y-2">
            <Label htmlFor="tags">Tags (comma-separated)</Label>
            <Input
              id="tags"
              placeholder="e.g., family, travel, reflection"
              value={tags}
              onChange={(e) => setTags(e.target.value)}
            />
          </div>

          <div className="space-y-2">
            <Label htmlFor="media">Media Upload</Label>
            <div className="flex gap-2">
              <Input
                id="media"
                type="file"
                accept="image/*,video/*"
                onChange={handleMediaChange}
                className="flex-1"
              />
            </div>
            {mediaPreview && (
              <div className="relative mt-2">
                <img
                  src={mediaPreview}
                  alt="Preview"
                  className="w-full h-48 object-cover rounded-md"
                />
                <Button
                  variant="destructive"
                  size="sm"
                  className="absolute top-2 right-2"
                  onClick={() => {
                    setMediaFile(null);
                    setMediaPreview(null);
                  }}
                >
                  <Trash2 className="h-4 w-4" />
                </Button>
              </div>
            )}
          </div>

          <div className="space-y-2">
            <Label htmlFor="song">
              <Music className="inline h-4 w-4 mr-2" />
              Favorite Song (YouTube or Spotify URL)
            </Label>
            <Input
              id="song"
              type="url"
              placeholder="https://..."
              value={songUrl}
              onChange={(e) => setSongUrl(e.target.value)}
            />
          </div>

          <div className="flex items-center justify-between p-4 bg-muted rounded-lg">
            <div>
              <Label htmlFor="privacy" className="font-semibold">
                Privacy Setting
              </Label>
              <p className="text-sm text-muted-foreground">
                {isPrivate
                  ? "🔒 Only you can see this entry"
                  : "🌍 Public - Visible to visitors"}
              </p>
            </div>
            <Switch
              id="privacy"
              checked={!isPrivate}
              onCheckedChange={(checked) => setIsPrivate(!checked)}
            />
          </div>
        </div>

        <div className="flex justify-between pt-4 border-t">
          {entry && (
            <Button variant="destructive" onClick={handleDelete}>
              <Trash2 className="h-4 w-4 mr-2" />
              Delete
            </Button>
          )}
          <div className="flex gap-2 ml-auto">
            <Button variant="outline" onClick={() => onOpenChange(false)}>
              Cancel
            </Button>
            <Button onClick={handleSave} disabled={saving || uploading}>
              {(saving || uploading) && <Loader2 className="h-4 w-4 mr-2 animate-spin" />}
              <Save className="h-4 w-4 mr-2" />
              {entry ? "Update" : "Save"}
            </Button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
};

export default DiaryEntryModal;
