import { useState, useEffect } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Checkbox } from "@/components/ui/checkbox";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { useToast } from "@/hooks/use-toast";
import { Loader2, Plus, Trash2, Clock, Wallet } from "lucide-react";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import CreatorPayouts from "./CreatorPayouts";
import { Badge } from "@/components/ui/badge";
import { countries } from "@/data/countries";
import { getCountryFlag } from "@/lib/countryFlags";

import { tr } from "@/i18n/tr";
import { optimizedImageUrl } from "@/lib/imageUrl";
interface CreatorTemplate {
  id: string;
  name: string;
  country: string;
  preview_url: string | null;
  price: number;
  is_free: boolean;
  description: string | null;
}

const CreatorDashboard = () => {
  const [templates, setTemplates] = useState<CreatorTemplate[]>([]);
  const [loading, setLoading] = useState(true);
  const [showForm, setShowForm] = useState(false);
  const [uploading, setUploading] = useState(false);
  const [isApproved, setIsApproved] = useState(false);
  
  // Form state
  const [name, setName] = useState("");
  const [country, setCountry] = useState("");
  const [description, setDescription] = useState("");
  const [price, setPrice] = useState("");
  const [isFree, setIsFree] = useState(true);
  const [previewFile, setPreviewFile] = useState<File | null>(null);
  const [fontHeading, setFontHeading] = useState("");
  const [fontFamily, setFontFamily] = useState("");
  const [layoutStyle, setLayoutStyle] = useState("classic");
  const [palettePrimary, setPalettePrimary] = useState("315 18% 32%");
  const [paletteSecondary, setPaletteSecondary] = useState("43 45% 58%");
  const [paletteAccent, setPaletteAccent] = useState("105 10% 45%");
  
  const { toast } = useToast();

  useEffect(() => {
    checkApprovalStatus();
  }, []);

  const checkApprovalStatus = async () => {
    const { data: { session } } = await supabase.auth.getSession();
    if (!session?.user) return;

    const { data: creatorData } = await supabase
      .from("template_creators")
      .select("approved")
      .eq("user_id", session.user.id)
      .single();

    if (creatorData?.approved) {
      setIsApproved(true);
      fetchCreatorTemplates();
    } else {
      setLoading(false);
    }
  };

  const fetchCreatorTemplates = async () => {
    const { data: { session } } = await supabase.auth.getSession();
    if (!session?.user) return;

    const { data, error } = await supabase
      .from("site_templates")
      .select("*")
      .eq("creator_id", session.user.id)
      .order("created_at", { ascending: false });

    if (data && !error) {
      setTemplates(data);
    }
    setLoading(false);
  };

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files[0]) {
      setPreviewFile(e.target.files[0]);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    const { data: { user } } = await supabase.auth.getUser();
    
    if (!user) {
      toast({
        title: tr("a.7f2f6a15cf"),
        description: tr("a.a833b59cab"),
        variant: "destructive",
      });
      return;
    }

    setUploading(true);

    let previewUrl = null;

    // Upload preview image if provided
    if (previewFile) {
      const fileExt = previewFile.name.split(".").pop();
      const fileName = `${Math.random()}.${fileExt}`;
      const filePath = `template-previews/${fileName}`;

      const { error: uploadError } = await supabase.storage
        .from("memorial_uploads")
        .upload(filePath, previewFile);

      if (uploadError) {
        toast({
          title: tr("a.7f2f6a15cf"),
          description: uploadError.message,
          variant: "destructive",
        });
        setUploading(false);
        return;
      }

      const { data: urlData } = supabase.storage
        .from("memorial_uploads")
        .getPublicUrl(filePath);

      previewUrl = urlData.publicUrl;
    }

    // Insert template
    const { error } = await supabase
      .from("site_templates")
      .insert({
        name,
        country,
        description,
        price: isFree ? 0 : parseFloat(price),
        is_free: isFree,
        preview_url: previewUrl,
        creator_id: user.id,
        is_creator_template: true,
        font_heading: fontHeading || null,
        font_family: fontFamily || null,
        layout_style: layoutStyle,
        color_palette: {
          primary: palettePrimary,
          secondary: paletteSecondary,
          accent: paletteAccent,
          background: "42 35% 96%",
          foreground: "280 20% 25%",
        },
      } as any);

    setUploading(false);

    if (error) {
      toast({
        title: tr("a.7f2f6a15cf"),
        description: error.message,
        variant: "destructive",
      });
    } else {
      toast({
        title: tr("a.42a8f651d7"),
        description: tr("a.775423b43f"),
      });
      resetForm();
      setShowForm(false);
      fetchCreatorTemplates();
    }
  };

  const resetForm = () => {
    setName("");
    setCountry("");
    setDescription("");
    setPrice("");
    setIsFree(true);
    setPreviewFile(null);
    setFontHeading("");
    setFontFamily("");
    setLayoutStyle("classic");
    setPalettePrimary("315 18% 32%");
    setPaletteSecondary("43 45% 58%");
    setPaletteAccent("105 10% 45%");
  };

  const handleDelete = async (templateId: string) => {
    const { error } = await supabase
      .from("site_templates")
      .delete()
      .eq("id", templateId);

    if (error) {
      toast({
        title: tr("a.7f2f6a15cf"),
        description: tr("a.cd7811a50b"),
        variant: "destructive",
      });
    } else {
      toast({
        title: tr("a.523eeebd03"),
        description: tr("a.821a445a14"),
      });
      fetchCreatorTemplates();
    }
  };

  if (loading) {
    return (
      <div className="flex justify-center py-12">
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
      </div>
    );
  }

  if (!isApproved) {
    return (
      <Card className="border-primary/50 bg-primary/5">
        <CardContent className="p-8 text-center">
          <Clock className="h-12 w-12 mx-auto mb-4 text-primary" />
          <h3 className="font-serif text-xl font-semibold mb-2">
            {tr("a.8a07e65bef")}
          </h3>
          <p className="text-muted-foreground">
            {tr("a.cb4ffac6bb")}
          </p>
        </CardContent>
      </Card>
    );
  }

  return (
    <Tabs defaultValue="templates" className="space-y-6">
      <TabsList>
        <TabsTrigger value="templates">{tr("a.17a8348930")}</TabsTrigger>
        <TabsTrigger value="payouts">
          <Wallet className="h-4 w-4 mr-2" />
          {tr("a.709d23d3c2")}
        </TabsTrigger>
      </TabsList>

      <TabsContent value="templates" className="space-y-6">
        <div className="flex items-center justify-between">
          <h2 className="font-serif text-2xl font-bold">{tr("a.17a8348930")}</h2>
          <Button onClick={() => setShowForm(!showForm)}>
            <Plus className="h-4 w-4 mr-2" />
            {tr("a.e48e668546")}
          </Button>
        </div>

      {showForm && (
        <Card>
          <CardHeader>
            <CardTitle>{tr("a.ebd571fcc4")}</CardTitle>
          </CardHeader>
          <CardContent>
            <form onSubmit={handleSubmit} className="space-y-4">
              <div>
                <Label htmlFor="name">{tr("a.fb32ea3ed8")}</Label>
                <Input
                  id="name"
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  required
                />
              </div>

              <div>
                <Label htmlFor="country">{tr("a.0f96626285")}</Label>
                <Select value={country} onValueChange={setCountry} required>
                  <SelectTrigger>
                    <SelectValue placeholder={tr("a.59ee76bad1")} />
                  </SelectTrigger>
                  <SelectContent>
                    {countries.map((c) => (
                      <SelectItem key={c} value={c}>
                        {c}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              <div>
                <Label htmlFor="description">{tr("a.55f8ebc805")}</Label>
                <Textarea
                  id="description"
                  value={description}
                  onChange={(e) => setDescription(e.target.value)}
                  rows={3}
                />
              </div>

              <div>
                <Label htmlFor="preview">{tr("a.49e26d9c7b")}</Label>
                <Input
                  id="preview"
                  type="file"
                  accept="image/*"
                  onChange={handleFileChange}
                />
              </div>

              <div className="border rounded-lg p-4 space-y-4">
                <h4 className="font-semibold text-sm">{tr("a.9e1eaaaa07")}</h4>
                <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                  <div>
                    <Label>{tr("a.346bd532b4")}</Label>
                    <div className="flex gap-2 items-center">
                      <Input value={palettePrimary} onChange={(e) => setPalettePrimary(e.target.value)} placeholder="315 18% 32%" />
                      <div className="w-8 h-8 rounded-full border flex-shrink-0" style={{ backgroundColor: `hsl(${palettePrimary})` }} />
                    </div>
                  </div>
                  <div>
                    <Label>{tr("a.4878caf92a")}</Label>
                    <div className="flex gap-2 items-center">
                      <Input value={paletteSecondary} onChange={(e) => setPaletteSecondary(e.target.value)} placeholder="43 45% 58%" />
                      <div className="w-8 h-8 rounded-full border flex-shrink-0" style={{ backgroundColor: `hsl(${paletteSecondary})` }} />
                    </div>
                  </div>
                  <div>
                    <Label>{tr("a.adda5aa719")}</Label>
                    <div className="flex gap-2 items-center">
                      <Input value={paletteAccent} onChange={(e) => setPaletteAccent(e.target.value)} placeholder="105 10% 45%" />
                      <div className="w-8 h-8 rounded-full border flex-shrink-0" style={{ backgroundColor: `hsl(${paletteAccent})` }} />
                    </div>
                  </div>
                </div>
                <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                  <div>
                    <Label>{tr("a.1f3fbc0f71")}</Label>
                    <Input value={fontHeading} onChange={(e) => setFontHeading(e.target.value)} placeholder={tr("a.43f08a7a31")} />
                  </div>
                  <div>
                    <Label>{tr("a.5e13d06492")}</Label>
                    <Input value={fontFamily} onChange={(e) => setFontFamily(e.target.value)} placeholder={tr("a.dbdc021eda")} />
                  </div>
                  <div>
                    <Label>{tr("a.82a800f62a")}</Label>
                    <Select value={layoutStyle} onValueChange={setLayoutStyle}>
                      <SelectTrigger>
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="classic">{tr("a.130cd7fe33")}</SelectItem>
                        <SelectItem value="elegant">{tr("a.4d459dfb9a")}</SelectItem>
                        <SelectItem value="ornate">{tr("a.135640de98")}</SelectItem>
                        <SelectItem value="minimal">{tr("a.a711cca9a4")}</SelectItem>
                        <SelectItem value="modern">{tr("a.3a4e447e89")}</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                </div>
              </div>

              <div className="flex items-center gap-2">
                <Checkbox
                  id="isFree"
                  checked={isFree}
                  onCheckedChange={(checked) => setIsFree(checked as boolean)}
                />
                <Label htmlFor="isFree">{tr("a.26f7c651cd")}</Label>
              </div>

              {!isFree && (
                <div>
                  <Label htmlFor="price">{tr("a.41fe56949f")}</Label>
                  <Input
                    id="price"
                    type="number"
                    step="0.01"
                    min="4.99"
                    max="19.99"
                    value={price}
                    onChange={(e) => setPrice(e.target.value)}
                    required={!isFree}
                    placeholder="4.99"
                  />
                </div>
              )}

              <div className="flex gap-2">
                <Button type="submit" disabled={uploading}>
                  {uploading ? tr("a.28ea7667d0") : tr("a.e48e668546")}
                </Button>
                <Button
                  type="button"
                  variant="outline"
                  onClick={() => {
                    setShowForm(false);
                    resetForm();
                  }}
                >
                  {tr("a.77dfd2135f")}
                </Button>
              </div>
            </form>
          </CardContent>
        </Card>
      )}

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
        {templates.map((template) => (
          <Card key={template.id}>
            <div className="aspect-[3/4] overflow-hidden">
              <img
                src={optimizedImageUrl(template.preview_url) || "https://images.unsplash.com/photo-1485963631004-f2f00b1d6606?w=400"}
                alt={template.name}
                width={400}
                height={533}
                loading="lazy"
                decoding="async"
                className="w-full h-full object-cover"
              />
            </div>
            <CardContent className="p-4">
              <div className="flex items-center gap-2 mb-2">
                <span className="text-2xl">{getCountryFlag(template.country)}</span>
                <h3 className="font-serif text-lg font-semibold">{template.name}</h3>
              </div>
              <p className="text-sm text-muted-foreground mb-3">
                {template.country}
              </p>
              <div className="flex items-center justify-between">
                {template.is_free ? (
                  <Badge variant="secondary">{tr("a.75f527181b")}</Badge>
                ) : (
                  <Badge variant="outline">€{template.price}</Badge>
                )}
                <Button
                  size="sm"
                  variant="destructive"
                  onClick={() => handleDelete(template.id)}
                >
                  <Trash2 className="h-4 w-4" />
                </Button>
              </div>
            </CardContent>
          </Card>
        ))}
      </div>

        {templates.length === 0 && !showForm && (
          <Card>
            <CardContent className="p-12 text-center">
              <p className="text-muted-foreground">
                {tr("a.4dc52bf75e")}
              </p>
            </CardContent>
          </Card>
        )}
      </TabsContent>

      <TabsContent value="payouts">
        <CreatorPayouts />
      </TabsContent>
    </Tabs>
  );
};

export default CreatorDashboard;
