import { useTranslation } from "react-i18next";
import { PrivacyPicker, visibilityToDb, visibilityFromDb, type Visibility } from "@/components/PrivacyPicker";
import { InviteFamily } from "@/components/InviteFamily";
import { useState, useEffect } from "react";
import { X, Upload, Loader2, Eye, EyeOff } from "lucide-react";
import { Switch } from "@/components/ui/switch";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";
import { InviteAccessPanel } from "@/components/InviteAccessPanel";

import { tr } from "@/i18n/tr";
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
    memorial_type: "standard",
    defender_label: "defender_male",
    service_unit: "",
    service_place: "",
  });
  const [imageFile, setImageFile] = useState<File | null>(null);
  const [imagePreview, setImagePreview] = useState<string>("");
  const [visibility, setVisibility] = useState<Visibility>("public");
  const [theme, setTheme] = useState("standard");
  const { t } = useTranslation();
  const [guestCandlesEnabled, setGuestCandlesEnabled] = useState(true);

  useEffect(() => {
    if (memorial && open) {
      setFormData({
        name: memorial.name || "",
        bio: memorial.bio || "",
        location: memorial.location || "",
        date_of_birth: memorial.date_of_birth || "",
        date_of_death: memorial.date_of_death || "",
        memorial_type: memorial.memorial_type || "standard",
        defender_label: memorial.defender_label || "defender_male",
        service_unit: memorial.service_unit || "",
        service_place: memorial.service_place || "",
      });
      setImagePreview(memorial.preview_image_url || "");
      setVisibility(visibilityFromDb(memorial.is_public, memorial.privacy_level));
      setTheme(memorial.theme || "standard");
      setGuestCandlesEnabled(memorial.guest_candles_enabled ?? true);
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
        title: tr("a.7f2f6a15cf"),
        description: tr("a.e948e93a08"),
        variant: "destructive",
      });
      return;
    }

    setLoading(true);

    try {
      const { data: refreshed, error: refreshError } = await supabase.auth.refreshSession();
      const user = refreshed.session?.user ?? null;

      if (refreshError || !user) {
        throw new Error(tr("a.ce6d6f1c66"));
      }

      const { data: ownedMemorial, error: ownershipError } = await supabase
        .from("memorials")
        .select("id, user_id, preview_image_url")
        .eq("id", memorial.id)
        .eq("user_id", user.id)
        .maybeSingle();

      if (ownershipError) throw ownershipError;
      if (!ownedMemorial) {
        throw new Error(tr("a.bedfefa266"));
      }

      let previewImageUrl = ownedMemorial.preview_image_url || memorial.preview_image_url;

      if (imageFile) {
        const fileExt = imageFile.name.split(".").pop() || "jpg";
        const filePath = `${user.id}/memorials/${memorial.id}/${Date.now()}-${crypto.randomUUID()}.${fileExt}`;

        const { error: uploadError } = await supabase.storage
          .from("memorial_uploads")
          .upload(filePath, imageFile, { upsert: false });

        if (uploadError) throw uploadError;

        const { data: { publicUrl } } = supabase.storage
          .from("memorial_uploads")
          .getPublicUrl(filePath);

        previewImageUrl = publicUrl;
      }

      const { data: updatedMemorial, error: updateError } = await supabase
        .from("memorials")
        .update({
          user_id: user.id,
          name: formData.name,
          bio: formData.bio,
          location: formData.location,
          date_of_birth: formData.date_of_birth || null,
          date_of_death: formData.date_of_death || null,
          preview_image_url: previewImageUrl,
          ...visibilityToDb(visibility),
          theme: theme === "ofrenda" ? "ofrenda" : "standard",
          memorial_type: formData.memorial_type,
          defender_label: formData.memorial_type === "defender_of_ukraine" ? formData.defender_label : null,
          service_unit: formData.memorial_type === "defender_of_ukraine" ? formData.service_unit.trim() || null : null,
          service_place: formData.memorial_type === "defender_of_ukraine" ? formData.service_place.trim() || null : null,
          guest_candles_enabled: guestCandlesEnabled,
          updated_at: new Date().toISOString(),
        })
        .eq("id", memorial.id)
        .eq("user_id", user.id)
        .select("id")
        .maybeSingle();

      if (updateError) throw updateError;
      if (!updatedMemorial) {
        throw new Error(tr("a.bedfefa266"));
      }

      toast({
        title: tr("a.42a8f651d7"),
        description: tr("a.0bce6963e0"),
      });

      onMemorialUpdated();
      onOpenChange(false);
    } catch (error: any) {
      console.error("Error updating memorial:", error);
      const rawMessage = error?.message || "Failed to update memorial";
      const friendlyMessage = rawMessage.toLowerCase().includes("row-level security")
        ? tr("a.2b4293120d")
        : rawMessage;

      toast({
        title: tr("a.7f2f6a15cf"),
        description: friendlyMessage,
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
          <DialogTitle className="font-serif text-2xl">{tr("a.2e53982b56")}</DialogTitle>
        </DialogHeader>

        <Tabs defaultValue="details" className="w-full">
          <TabsList className="grid w-full grid-cols-2">
            <TabsTrigger value="details">{tr("a.dc3decbb93")}</TabsTrigger>
            <TabsTrigger value="sharing">{tr("a.3967c45a44")}</TabsTrigger>
          </TabsList>

          <TabsContent value="details">
            <form onSubmit={handleSubmit} className="space-y-6 pt-4">
              {/* Name */}
              <div className="space-y-2">
                <Label htmlFor="name">{tr("a.d145bb8309")}</Label>
                <Input
                  id="name"
                  placeholder={tr("a.eeb692087d")}
                  value={formData.name}
                  onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                  required
                />
              </div>

              {/* Bio */}
              <div className="space-y-2"><Label htmlFor="editMemorialType">{tr("a.ef1ebe0339")}</Label><select id="editMemorialType" value={formData.memorial_type} onChange={(e) => setFormData({ ...formData, memorial_type: e.target.value })} className="h-10 w-full rounded-md border border-input bg-background px-3 text-sm"><option value="standard">{tr("a.ecbb766b6d")}</option><option value="defender_of_ukraine">{tr("a.083eada927")}</option></select></div>
              {formData.memorial_type === "defender_of_ukraine" && <div className="grid gap-3 rounded-md border p-4"><div><Label htmlFor="editDefenderLabel">{tr("a.6d12c8adbe")}</Label><select id="editDefenderLabel" value={formData.defender_label} onChange={(e) => setFormData({ ...formData, defender_label: e.target.value })} className="mt-1 h-10 w-full rounded-md border border-input bg-background px-3 text-sm"><option value="defender_male">Захисник України</option><option value="defender_female">Захисниця України</option></select></div><div><Label htmlFor="editServiceUnit">{tr("a.f6b935ab33")}</Label><Input id="editServiceUnit" maxLength={160} value={formData.service_unit} onChange={(e) => setFormData({ ...formData, service_unit: e.target.value })}/></div><div><Label htmlFor="editServicePlace">{tr("a.2f8f356309")}</Label><Input id="editServicePlace" maxLength={160} value={formData.service_place} onChange={(e) => setFormData({ ...formData, service_place: e.target.value })}/></div></div>}

              {/* Bio */}
              <div className="space-y-2">
                <Label htmlFor="bio">{tr("a.53c2de2d09")}</Label>
                <Textarea
                  id="bio"
                  placeholder={tr("a.172691a941")}
                  value={formData.bio}
                  onChange={(e) => setFormData({ ...formData, bio: e.target.value })}
                  rows={4}
                />
              </div>

              {/* Dates */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label htmlFor="dob">{tr("a.133160594d")}</Label>
                  <Input
                    id="dob"
                    type="date"
                    value={formData.date_of_birth}
                    onChange={(e) => setFormData({ ...formData, date_of_birth: e.target.value })}
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="dod">{tr("a.704a73d75a")}</Label>
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
                <Label htmlFor="location">{tr("a.d219c68101")}</Label>
                <Input
                  id="location"
                  placeholder={tr("a.4b98b8e871")}
                  value={formData.location}
                  onChange={(e) => setFormData({ ...formData, location: e.target.value })}
                />
              </div>

              {/* Image Upload */}
              <div className="space-y-2">
                <Label>{tr("a.14dcc4d842")}</Label>
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
                          alt={tr("a.f1fbb2b43d")}
                          width={512}
                          height={192}
                          decoding="async"
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
                          {tr("a.e4fa833f31")}
                        </Button>
                      </div>
                    ) : (
                      <div className="space-y-2">
                        <Upload className="h-8 w-8 mx-auto text-muted-foreground" />
                        <p className="text-sm text-muted-foreground">
                          {tr("a.28e4f1ff17")}
                        </p>
                      </div>
                    )}
                  </label>
                </div>
              </div>

              {/* Visibility Toggle */}
              <div className="flex items-center justify-between rounded-lg border p-4"><div><Label htmlFor="guest-candles">{tr("a.77732eb5ee")}</Label><p className="text-xs text-muted-foreground">{tr("a.5579a6b6c5")}</p></div><Switch id="guest-candles" checked={guestCandlesEnabled} onCheckedChange={setGuestCandlesEnabled}/></div>

              <PrivacyPicker value={visibility} onChange={setVisibility} />

              <div className="space-y-2">
                <Label htmlFor="editTheme">{t("nov.design")}</Label>
                <select id="editTheme" value={theme} onChange={(e) => setTheme(e.target.value)} className="h-10 w-full rounded-md border border-input bg-background px-3 text-sm">
                  <option value="standard">{t("nov.designStandard")}</option>
                  <option value="ofrenda">{t("nov.designOfrenda")}</option>
                </select>
              </div>

              <div className="rounded-lg border p-4">
                <InviteFamily memorialId={memorial?.id} memorialSlug={memorial?.slug} memorialName={memorial?.name || ""} />
              </div>

              {/* Actions */}
              <div className="flex gap-3 justify-end pt-4">
                <Button
                  type="button"
                  variant="outline"
                  onClick={handleClose}
                  disabled={loading}
                >
                  {tr("a.77dfd2135f")}
                </Button>
                <Button type="submit" disabled={loading}>
                  {loading ? (
                    <>
                      <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                      {tr("a.ae7e887517")}
                    </>
                  ) : (
                    tr("a.fa2984b367")
                  )}
                </Button>
              </div>
            </form>
          </TabsContent>

          <TabsContent value="sharing" className="pt-4">
            <InviteAccessPanel
              type="memorial"
              resourceId={memorial?.id || ""}
              isPublic={memorial?.is_public ?? true}
              privacyLevel={memorial?.privacy_level || "public"}
              onPrivacyChange={async (newIsPublic, newPrivacyLevel) => {
                const { data: { user } } = await supabase.auth.getUser();
                if (!user) {
                  toast({ title: tr("a.7f2f6a15cf"), description: tr("a.e35193e0f2"), variant: "destructive" });
                  return;
                }

                const { error } = await supabase
                  .from("memorials")
                  .update({
                    is_public: newIsPublic,
                    privacy_level: newPrivacyLevel as any,
                  })
                  .eq("id", memorial.id)
                  .eq("user_id", user.id);

                if (error) {
                  toast({ title: tr("a.7f2f6a15cf"), description: tr("a.8649d65a48"), variant: "destructive" });
                } else {
                  toast({ title: tr("a.66f5270655") });
                  onMemorialUpdated();
                }
              }}
            />
          </TabsContent>
        </Tabs>
      </DialogContent>
    </Dialog>
  );
};

export default EditMemorialModal;
