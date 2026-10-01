import { InviteFamily } from "@/components/InviteFamily";
import { visibilityToDb } from "@/components/PrivacyPicker";
import { track } from "@/lib/analytics";
import { useState, useEffect } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { useToast } from "@/hooks/use-toast";
import { supabase } from "@/integrations/supabase/client";
import { Upload, X, Loader2, Eye, EyeOff } from "lucide-react";
import { Switch } from "@/components/ui/switch";
import { format } from "@/lib/dateFormat";
import { memorialSlug } from "@/utils/memorialSlug";

import { tr } from "@/i18n/tr";
interface CreateMemorialModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onMemorialCreated: () => void;
}

const CreateMemorialModal = ({ open, onOpenChange, onMemorialCreated }: CreateMemorialModalProps) => {
  const [created, setCreated] = useState<{ id: string; slug: string | null; name: string } | null>(null);
  const closeAll = (o: boolean) => { if (!o) setCreated(null); onOpenChange(o); };
  const { toast } = useToast();
  const [isLoading, setIsLoading] = useState(false);
  const [isPublic, setIsPublic] = useState(true);
  const [formData, setFormData] = useState({
    name: "",
    bio: "",
    tributes: "",
    dateOfBirth: "",
    dateOfDeath: "",
    location: "",
    memorialType: "standard",
    defenderLabel: "defender_male",
    serviceUnit: "",
    servicePlace: "",
  });
  const [images, setImages] = useState<File[]>([]);
  const [imagePreviews, setImagePreviews] = useState<string[]>([]);

  // Auto-detect location when modal opens
  useEffect(() => {
    if (open && !formData.location && navigator.geolocation) {
      navigator.geolocation.getCurrentPosition(
        async (position) => {
          try {
            const { latitude, longitude } = position.coords;
            const res = await fetch(
              `https://nominatim.openstreetmap.org/reverse?lat=${latitude}&lon=${longitude}&format=json&accept-language=en`
            );
            const data = await res.json();
            const addr = data.address;
            const city = addr.city || addr.town || addr.village || addr.municipality || "";
            const country = addr.country || "";
            if (city || country) {
              setFormData(prev => ({ ...prev, location: [city, country].filter(Boolean).join(", ") }));
            }
          } catch (e) {
            // Silently fail
          }
        },
        () => {},
        { timeout: 5000 }
      );
    }
  }, [open]);

  const handleImageChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = Array.from(e.target.files || []);
    
    if (images.length + files.length > 5) {
      toast({
        title: tr("a.e8545eccb8"),
        description: tr("a.fb4a364547"),
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
        title: tr("a.3cb8eeb8a4"),
        description: tr("a.094af51e88"),
        variant: "destructive",
      });
      return;
    }

    if (images.length === 0) {
      toast({
        title: tr("a.6782c86ac7"),
        description: tr("a.b18184d2c1"),
        variant: "destructive",
      });
      return;
    }

    setIsLoading(true);

    try {
      const { data: { user } } = await supabase.auth.getUser();
      
      if (!user) {
        toast({
          title: tr("a.682810de81"),
          description: tr("a.58750450d0"),
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
          ...visibilityToDb(isPublic ? "public" : "private"),
          slug: `${memorialSlug(formData.name)}-${crypto.randomUUID().slice(0, 6)}`,
          memorial_type: formData.memorialType,
          defender_label: formData.memorialType === "defender_of_ukraine" ? formData.defenderLabel : null,
          service_unit: formData.memorialType === "defender_of_ukraine" ? formData.serviceUnit.trim() || null : null,
          service_place: formData.memorialType === "defender_of_ukraine" ? formData.servicePlace.trim() || null : null,
        })
        .select()
        .single();

      if (memorialError) throw memorialError;

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
        title: tr("a.0fdb19abea"),
        description: tr("a.0d53fc3226"),
      });

      // Reset form
      setFormData({ name: "", bio: "", tributes: "", dateOfBirth: "", dateOfDeath: "", location: "", memorialType: "standard", defenderLabel: "defender_male", serviceUnit: "", servicePlace: "" });
      setIsPublic(true);
      setImages([]);
      setImagePreviews([]);
      
      track("Memorial Created", { type: formData.memorialType });
      onMemorialCreated();
      setCreated({ id: memorial.id, slug: memorial.slug, name: memorial.name });
    } catch (error: any) {
      console.error('Error creating memorial:', error);
      toast({
        title: tr("a.1c4515a641"),
        description: error.message || tr("a.60af87728a"),
        variant: "destructive",
      });
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={closeAll}>
      <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
        {created ? (
          <InviteFamily memorialId={created.id} memorialSlug={created.slug} memorialName={created.name} showSkip onDone={() => closeAll(false)} />
        ) : (<>
        <DialogHeader>
          <DialogTitle className="font-serif text-2xl">{tr("a.0bfb9d7153")}</DialogTitle>
        </DialogHeader>

        <form onSubmit={handleSubmit} className="space-y-6">
          {/* Image Upload Section */}
          <div className="space-y-3">
            <Label htmlFor="images">{tr("a.ded8596c7c")}</Label>
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
                  {tr("a.b5fc9012fd")}{images.length}/5)
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
            <Label htmlFor="name">{tr("a.2189b63b51")}</Label>
            <Input
              id="name"
              value={formData.name}
              onChange={(e) => setFormData({ ...formData, name: e.target.value })}
              placeholder={tr("a.29362f24d4")}
              required
            />
          </div>

          {/* Description / Life Story */}
          <div className="space-y-2">
            <Label htmlFor="memorialType">{tr("a.ef1ebe0339")}</Label>
            <select id="memorialType" value={formData.memorialType} onChange={(e) => setFormData({ ...formData, memorialType: e.target.value })} className="h-10 w-full rounded-md border border-input bg-background px-3 text-sm">
              <option value="standard">{tr("a.ecbb766b6d")}</option>
              <option value="defender_of_ukraine">Defender of Ukraine / Захисник або Захисниця України</option>
            </select>
          </div>
          {formData.memorialType === "defender_of_ukraine" && <div className="grid gap-4 rounded-md border p-4">
            <div><Label htmlFor="defenderLabel">{tr("a.267ed3549e")}</Label><select id="defenderLabel" value={formData.defenderLabel} onChange={(e) => setFormData({ ...formData, defenderLabel: e.target.value })} className="mt-1 h-10 w-full rounded-md border border-input bg-background px-3 text-sm"><option value="defender_male">Захисник України</option><option value="defender_female">Захисниця України</option></select></div>
            <div><Label htmlFor="serviceUnit">{tr("a.84ed6b5445")}</Label><Input id="serviceUnit" maxLength={160} value={formData.serviceUnit} onChange={(e) => setFormData({ ...formData, serviceUnit: e.target.value })} /></div>
            <div><Label htmlFor="servicePlace">{tr("a.aaf484284e")}</Label><Input id="servicePlace" maxLength={160} value={formData.servicePlace} onChange={(e) => setFormData({ ...formData, servicePlace: e.target.value })} /></div>
            <p className="text-xs text-muted-foreground">{tr("a.9d751272a0")}</p>
          </div>}

          {/* Description / Life Story */}
          <div className="space-y-2">
            <Label htmlFor="bio">{tr("a.7202dd9015")}</Label>
            <Textarea
              id="bio"
              value={formData.bio}
              onChange={(e) => setFormData({ ...formData, bio: e.target.value })}
              placeholder={tr("a.b3fe3b3151")}
              rows={4}
            />
          </div>

          {/* Tributes */}
          <div className="space-y-2">
            <Label htmlFor="tributes">{tr("a.5cf4a2b355")}</Label>
            <Textarea
              id="tributes"
              value={formData.tributes}
              onChange={(e) => setFormData({ ...formData, tributes: e.target.value })}
              placeholder={tr("a.bfe7334b8d")}
              rows={3}
            />
          </div>

          {/* Dates */}
          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label htmlFor="dateOfBirth">{tr("a.133160594d")}</Label>
              <Input
                id="dateOfBirth"
                type="date"
                value={formData.dateOfBirth}
                onChange={(e) => setFormData({ ...formData, dateOfBirth: e.target.value })}
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="dateOfDeath">{tr("a.704a73d75a")}</Label>
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
            <Label htmlFor="location">{tr("a.1fb67e5610")}</Label>
            <Input
              id="location"
              value={formData.location}
              onChange={(e) => setFormData({ ...formData, location: e.target.value })}
              placeholder={tr("a.4b98b8e871")}
            />
          </div>

          {/* Visibility Toggle */}
          <div className="flex items-center justify-between rounded-lg border p-4">
            <div className="flex items-center gap-3">
              {isPublic ? <Eye className="h-5 w-5 text-primary" /> : <EyeOff className="h-5 w-5 text-muted-foreground" />}
              <div>
                <Label htmlFor="visibility" className="text-sm font-medium cursor-pointer">
                  {isPublic ? tr("a.f8a172c78f") : tr("a.44671cff62")}
                </Label>
                <p className="text-xs text-muted-foreground">
                  {isPublic ? tr("a.3c29eb42b5") : tr("a.384d197b4a")}
                </p>
              </div>
            </div>
            <Switch id="visibility" checked={isPublic} onCheckedChange={setIsPublic} />
          </div>

          {/* Actions */}
          <div className="flex gap-3 justify-end">
            <Button
              type="button"
              variant="outline"
              onClick={() => onOpenChange(false)}
              disabled={isLoading}
            >
              {tr("a.77dfd2135f")}
            </Button>
            <Button type="submit" disabled={isLoading}>
              {isLoading ? (
                <>
                  <Loader2 className="h-4 w-4 animate-spin mr-2" />
                  {tr("a.28ea7667d0")}
                </>
              ) : (
                tr("a.3bfcbf3133")
              )}
            </Button>
          </div>
        </form>
        </>)}
      </DialogContent>
    </Dialog>
  );
};

export default CreateMemorialModal;
