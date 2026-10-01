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

import { tr } from "@/i18n/tr";
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
      const fileName = `${Math.random()}.${fileExt}`;
      const filePath = `diary/${fileName}`;

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
        title: tr("a.ad0d0603e2"),
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
        title: tr("a.4e01d5a2e8"),
        description: tr("a.ed17c52d03"),
        variant: "destructive",
      });
      return;
    }

    try {
      setSaving(true);
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) throw new Error(tr("a.0c91acbae2"));

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
          title: tr("a.53550cff74"),
          description: tr("a.a647c80e6e"),
        });
      } else {
        const { error } = await (supabase as any)
          .from("diary_entries")
          .insert([{ ...entryData, user_id: user.id }]);

        if (error) throw error;

        toast({
          title: tr("a.140b632f8a"),
          description: tr("a.d224843a3a"),
        });
      }

      onSaved();
      onOpenChange(false);
      resetForm();
    } catch (error: any) {
      toast({
        title: tr("a.c52c54b941"),
        description: error.message,
        variant: "destructive",
      });
    } finally {
      setSaving(false);
    }
  };

  const handleDelete = async () => {
    if (!entry) return;

    if (!confirm(tr("a.26f2ceb643"))) return;

    try {
      const { error } = await (supabase as any)
        .from("diary_entries")
        .delete()
        .eq("id", entry.id);

      if (error) throw error;

      toast({
        title: tr("a.c7211d42e1"),
        description: tr("a.6abbc8a083"),
      });

      onSaved();
      onOpenChange(false);
    } catch (error: any) {
      toast({
        title: tr("a.54dcff654c"),
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
            {entry ? tr("a.5f69d39f1c") : tr("a.e05ee1dc29")}
          </DialogTitle>
          <DialogDescription>
            {tr("a.7807725bdb")}
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-6 py-4">
          <div className="space-y-2">
            <Label htmlFor="title">{tr("a.9616975c7a")}</Label>
            <Input
              id="title"
              placeholder={tr("a.2d7117e56d")}
              value={title}
              onChange={(e) => setTitle(e.target.value)}
            />
          </div>

          <div className="space-y-2">
            <Label htmlFor="date">{tr("a.eb9a4bc1c0")}</Label>
            <Input
              id="date"
              type="date"
              value={entryDate}
              onChange={(e) => setEntryDate(e.target.value)}
            />
          </div>

          <div className="space-y-2">
            <Label htmlFor="content">{tr("a.4f9be057f0")}</Label>
            <Textarea
              id="content"
              placeholder={tr("a.d04062c739")}
              value={content}
              onChange={(e) => setContent(e.target.value)}
              rows={8}
              className="resize-none"
            />
          </div>

          <div className="space-y-2">
            <Label htmlFor="tags">{tr("a.32bf672278")}</Label>
            <Input
              id="tags"
              placeholder={tr("a.50d4375fa7")}
              value={tags}
              onChange={(e) => setTags(e.target.value)}
            />
          </div>

          <div className="space-y-2">
            <Label htmlFor="media">{tr("a.6e6ef11190")}</Label>
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
                  alt={tr("a.f1fbb2b43d")}
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
              {tr("a.540662f2a8")}
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
                {tr("a.1ee06bcab5")}
              </Label>
              <p className="text-sm text-muted-foreground">
                {isPrivate
                  ? tr("a.e5ef20165d")
                  : tr("a.01e2814d26")}
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
              {tr("a.f6fdbe48dc")}
            </Button>
          )}
          <div className="flex gap-2 ml-auto">
            <Button variant="outline" onClick={() => onOpenChange(false)}>
              {tr("a.77dfd2135f")}
            </Button>
            <Button onClick={handleSave} disabled={saving || uploading}>
              {(saving || uploading) && <Loader2 className="h-4 w-4 mr-2 animate-spin" />}
              <Save className="h-4 w-4 mr-2" />
              {entry ? tr("a.fb91e24fa5") : tr("a.efc007a393")}
            </Button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
};

export default DiaryEntryModal;
