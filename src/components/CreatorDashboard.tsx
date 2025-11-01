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
import { Loader2, Plus, Trash2, Clock } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { countries } from "@/data/countries";
import { getCountryFlag } from "@/lib/countryFlags";

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
        title: "Error",
        description: "You must be logged in to upload templates",
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
          title: "Error",
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
      });

    setUploading(false);

    if (error) {
      toast({
        title: "Error",
        description: error.message,
        variant: "destructive",
      });
    } else {
      toast({
        title: "Success",
        description: "Template published successfully!",
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
  };

  const handleDelete = async (templateId: string) => {
    const { error } = await supabase
      .from("site_templates")
      .delete()
      .eq("id", templateId);

    if (error) {
      toast({
        title: "Error",
        description: "Failed to delete template",
        variant: "destructive",
      });
    } else {
      toast({
        title: "Template Deleted",
        description: "Template has been removed",
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
            Application Under Review
          </h3>
          <p className="text-muted-foreground">
            Your creator application is being reviewed. You'll gain access to template uploads once approved.
          </p>
        </CardContent>
      </Card>
    );
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <h2 className="font-serif text-2xl font-bold">My Templates</h2>
        <Button onClick={() => setShowForm(!showForm)}>
          <Plus className="h-4 w-4 mr-2" />
          Create Template
        </Button>
      </div>

      {showForm && (
        <Card>
          <CardHeader>
            <CardTitle>Create New Template</CardTitle>
          </CardHeader>
          <CardContent>
            <form onSubmit={handleSubmit} className="space-y-4">
              <div>
                <Label htmlFor="name">Template Name *</Label>
                <Input
                  id="name"
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  required
                />
              </div>

              <div>
                <Label htmlFor="country">Country *</Label>
                <Select value={country} onValueChange={setCountry} required>
                  <SelectTrigger>
                    <SelectValue placeholder="Select country" />
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
                <Label htmlFor="description">Description</Label>
                <Textarea
                  id="description"
                  value={description}
                  onChange={(e) => setDescription(e.target.value)}
                  rows={3}
                />
              </div>

              <div>
                <Label htmlFor="preview">Preview Image</Label>
                <Input
                  id="preview"
                  type="file"
                  accept="image/*"
                  onChange={handleFileChange}
                />
              </div>

              <div className="flex items-center gap-2">
                <Checkbox
                  id="isFree"
                  checked={isFree}
                  onCheckedChange={(checked) => setIsFree(checked as boolean)}
                />
                <Label htmlFor="isFree">Free Template</Label>
              </div>

              {!isFree && (
                <div>
                  <Label htmlFor="price">Price (€) *</Label>
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
                  {uploading ? "Creating..." : "Create Template"}
                </Button>
                <Button
                  type="button"
                  variant="outline"
                  onClick={() => {
                    setShowForm(false);
                    resetForm();
                  }}
                >
                  Cancel
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
                src={template.preview_url || "https://images.unsplash.com/photo-1485963631004-f2f00b1d6606?w=400"}
                alt={template.name}
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
                  <Badge variant="secondary">Free</Badge>
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
              No templates yet. Create your first template to get started!
            </p>
          </CardContent>
        </Card>
      )}
    </div>
  );
};

export default CreatorDashboard;
