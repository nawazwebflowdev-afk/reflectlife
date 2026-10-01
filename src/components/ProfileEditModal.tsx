import { useState, useEffect } from "react";
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { AvatarSelector, AvatarDisplay } from "@/components/EmojiAvatarSelector";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";
import { Upload } from "lucide-react";
import { countries } from "@/data/countries";

import { tr } from "@/i18n/tr";
interface ProfileEditModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  userId: string;
  onProfileUpdate: () => void;
}

interface ProfileData {
  first_name: string;
  last_name: string;
  country: string;
  avatar_url: string;
  color_theme: string;
}

export const ProfileEditModal = ({ open, onOpenChange, userId, onProfileUpdate }: ProfileEditModalProps) => {
  const { toast } = useToast();
  const [loading, setLoading] = useState(false);
  const [uploading, setUploading] = useState(false);
  const [profile, setProfile] = useState<ProfileData>({
    first_name: "",
    last_name: "",
    country: "",
    avatar_url: "",
    color_theme: "#3b82f6",
  });

  useEffect(() => {
    if (open && userId) {
      fetchProfile();
    }
  }, [open, userId]);

  const fetchProfile = async () => {
    try {
      const { data, error } = await supabase
        .from("profiles")
        .select("first_name, last_name, country, avatar_url, color_theme")
        .eq("id", userId)
        .single();

      if (error) throw error;
      if (data) {
        setProfile({
          first_name: data.first_name || "",
          last_name: data.last_name || "",
          country: data.country || "",
          avatar_url: data.avatar_url || "",
          color_theme: data.color_theme || "#3b82f6",
        });
      }
    } catch (error) {
      console.error("Error fetching profile:", error);
    }
  };

  const handleImageUpload = async (event: React.ChangeEvent<HTMLInputElement>) => {
    try {
      setUploading(true);
      const file = event.target.files?.[0];
      if (!file) return;

      // Validate file type
      if (!file.type.startsWith('image/')) {
        toast({
          title: tr("a.56f848f49e"),
          description: tr("a.374003b3d8"),
          variant: "destructive",
        });
        setUploading(false);
        return;
      }

      const fileExt = file.name.split(".").pop();
      const filePath = `user-avatars/${userId}.${fileExt}`;

      const { error: uploadError } = await supabase.storage
        .from("avatars")
        .upload(filePath, file, { upsert: true });

      if (uploadError) throw uploadError;

      const { data: { publicUrl } } = supabase.storage
        .from("avatars")
        .getPublicUrl(filePath);

      setProfile({ ...profile, avatar_url: publicUrl });
      
      toast({
        title: tr("a.82dd62753e"),
        description: tr("a.d14c8cb6aa"),
      });
    } catch (error) {
      console.error("Error uploading image:", error);
      toast({
        title: tr("a.ad0d0603e2"),
        description: tr("a.22d25a7239"),
        variant: "destructive",
      });
    } finally {
      setUploading(false);
    }
  };

  const handleSave = async () => {
    try {
      setLoading(true);
      
      const { error } = await supabase
        .from("profiles")
        .update({
          first_name: profile.first_name,
          last_name: profile.last_name,
          full_name: `${profile.first_name} ${profile.last_name}`.trim(),
          country: profile.country,
          avatar_url: profile.avatar_url,
          color_theme: profile.color_theme,
        })
        .eq("id", userId);

      if (error) throw error;

      toast({
        title: tr("a.183f8bad27"),
        description: tr("a.7a0b15c263"),
      });
      
      onProfileUpdate();
      onOpenChange(false);
    } catch (error) {
      console.error("Error updating profile:", error);
      toast({
        title: tr("a.4de04cd91a"),
        description: tr("a.e7c3a79781"),
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  };

  const getInitials = () => {
    const first = profile.first_name?.[0] || "";
    const last = profile.last_name?.[0] || "";
    return `${first}${last}`.toUpperCase() || "U";
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-[500px]">
        <DialogHeader>
          <DialogTitle>{tr("a.cd280a41f7")}</DialogTitle>
          <DialogDescription>
            {tr("a.c5fe97f70a")}
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-6 py-4">
          {/* Avatar Section */}
          <div className="flex flex-col items-center gap-4">
            <Avatar className="h-24 w-24">
              <AvatarImage src={profile.avatar_url} />
              <AvatarFallback className="text-2xl">{getInitials()}</AvatarFallback>
            </Avatar>
            <div className="flex gap-2">
              <Label htmlFor="avatar-upload" className="cursor-pointer">
                <Button type="button" variant="outline" size="sm" disabled={uploading} asChild>
                  <span>
                    <Upload className="h-4 w-4 mr-2" />
                    {uploading ? tr("a.070e328ec8") : tr("a.84f26e4f34")}
                  </span>
                </Button>
              </Label>
              <Input
                id="avatar-upload"
                type="file"
                accept="image/*"
                className="hidden"
                onChange={handleImageUpload}
                disabled={uploading}
              />
            </div>
          </div>

          {/* Form Fields */}
          <div className="space-y-4">
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label htmlFor="first_name">{tr("a.b6ea992aab")}</Label>
                <Input
                  id="first_name"
                  value={profile.first_name}
                  onChange={(e) => setProfile({ ...profile, first_name: e.target.value })}
                  placeholder={tr("a.5bf521d8d9")}
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="last_name">{tr("a.863cb39fbe")}</Label>
                <Input
                  id="last_name"
                  value={profile.last_name}
                  onChange={(e) => setProfile({ ...profile, last_name: e.target.value })}
                  placeholder={tr("a.d05ae9c499")}
                />
              </div>
            </div>

            <div className="space-y-2">
              <Label htmlFor="country">{tr("a.d523ebbd10")}</Label>
              <Select value={profile.country} onValueChange={(value) => setProfile({ ...profile, country: value })}>
                <SelectTrigger>
                  <SelectValue placeholder={tr("a.59ee76bad1")} />
                </SelectTrigger>
                <SelectContent>
                  {countries.map((country) => (
                    <SelectItem key={country} value={country}>
                      {country}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-2">
              <Label htmlFor="color_theme">{tr("a.29ddb7dcd0")}</Label>
              <div className="flex gap-2 items-center">
                <Input
                  id="color_theme"
                  type="color"
                  value={profile.color_theme}
                  onChange={(e) => setProfile({ ...profile, color_theme: e.target.value })}
                  className="w-20 h-10"
                />
                <span className="text-sm text-muted-foreground">{profile.color_theme}</span>
              </div>
            </div>
          </div>
        </div>

        <div className="flex justify-end gap-2">
          <Button variant="outline" onClick={() => onOpenChange(false)} disabled={loading}>
            {tr("a.77dfd2135f")}
          </Button>
          <Button onClick={handleSave} disabled={loading}>
            {loading ? tr("a.ae7e887517") : tr("a.fa2984b367")}
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
};
